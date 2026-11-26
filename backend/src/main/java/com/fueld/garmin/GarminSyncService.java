package com.fueld.garmin;

import com.fueld.garmin.dto.GarminSyncResponse;
import com.fueld.user.User;
import com.fueld.workout.TrainingEffect;
import com.fueld.workout.WorkoutExercise;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutLogRepository;
import com.fueld.workout.WorkoutMetric;
import com.fueld.workout.WorkoutMetricRepository;
import com.fueld.workout.WorkoutType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Importiert Garmin-Aktivitäten als Trainings – ohne KI-Aufruf, die Garmin-Werte sind exakt.
 * Die Personal API ist laut Garmin für den eigenen Account gedacht: jeder Nutzer ruft deshalb nur
 * mit seinem eigenen Key seine eigenen Aktivitäten ab.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GarminSyncService {

    // Normalfall (Button + Scheduler): nur die letzten Tage. Die ganze Historie wird nur auf Wunsch geladen.
    public static final int DEFAULT_DAYS = 7;
    public static final int MAX_DAYS = 3650;
    private static final int PAGE_SIZE = 50;
    // Sicherheitsnetz gegen Endlosschleifen: höchstens 10.000 Aktivitäten pro Lauf
    private static final int MAX_PAGES = 200;
    // Garmin nennt keine Rate Limits, deshalb zwischen den Seiten kurz warten
    private static final long PAGE_PAUSE_MS = 300;
    private static final int MAX_NOTES_LENGTH = 255;

    private final GarminClient client;
    private final WorkoutLogRepository workoutLogRepository;
    private final WorkoutMetricRepository workoutMetricRepository;
    private final GarminConnectionService connections;

    /**
     * Importiert alle Aktivitäten der letzten {@code days} Tage (begrenzt auf 1..MAX_DAYS).
     * Garmin liefert seitenweise, neueste zuerst: sobald eine Aktivität vor dem Stichtag liegt,
     * ist der Rest älter und der Lauf endet. Schon importierte Aktivitäten werden übersprungen,
     * ein wiederholter Lauf ist daher gefahrlos. Bei schon importierten Trainings werden nur Startzeit
     * und Garmin-Details (Typ, Beschreibung, Übungen, Training Effect) abgeglichen: so kommen auch Angaben an, die erst
     * später in Garmin Connect ergänzt wurden. Alles andere bleibt, wie es in Fueld steht.
     */
    @Transactional
    public GarminSyncResponse sync(User user, int days) {
        int window = Math.max(1, Math.min(days, MAX_DAYS));
        Instant cutoff = Instant.now().minus(Duration.ofDays(window));
        String apiKey = connections.apiKeyOf(user);
        Map<Long, WorkoutLog> known = workoutLogRepository.findGarminImportsByUserId(user.getId()).stream()
                .collect(Collectors.toMap(WorkoutLog::getGarminActivityId, Function.identity()));
        int imported = 0;
        int updated = 0;
        int skipped = 0;

        for (int page = 0; page < MAX_PAGES; page++) {
            List<GarminActivity> activities = client.fetchActivities(apiKey, page * PAGE_SIZE, PAGE_SIZE);
            boolean reachedCutoff = false;

            for (GarminActivity activity : activities) {
                Instant start = GarminActivityMapper.startTime(activity);
                if (activity.activityId() == null || start == null) continue;
                if (start.isBefore(cutoff)) {
                    reachedCutoff = true;
                    continue;
                }
                WorkoutLog existing = known.get(activity.activityId());
                if (existing != null) {
                    if (updateFromGarmin(existing, activity, start)) updated++;
                    else skipped++;
                    continue;
                }
                known.put(activity.activityId(), importActivity(user, activity, start));
                imported++;
            }

            if (reachedCutoff || activities.size() < PAGE_SIZE) break;
            if (!pauseBetweenPages()) break;
        }
        log.info("Garmin-Sync für Nutzer {} ({} Tage): {} importiert, {} ergänzt, {} unverändert",
                user.getId(), window, imported, updated, skipped);
        return new GarminSyncResponse(imported, updated, skipped);
    }

    /** @return false, wenn der Thread unterbrochen wurde und der Lauf enden soll */
    private boolean pauseBetweenPages() {
        try {
            Thread.sleep(PAGE_PAUSE_MS);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /**
     * Gleicht Startzeit und Garmin-Details eines vorhandenen Trainings ab. Die Startzeit repariert
     * auch Trainings, die früher beim Einordnen auf 12:00 gesetzt wurden. Gespeichert wird beim Ende
     * der Transaktion automatisch, weil JPA Änderungen an geladenen Objekten selbst erkennt.
     */
    private boolean updateFromGarmin(WorkoutLog workout, GarminActivity a, Instant start) {
        String description = GarminActivityMapper.description(a);
        List<WorkoutExercise> exercises = GarminActivityMapper.exercises(a);
        TrainingEffect effect = GarminActivityMapper.trainingEffect(a);
        if (Objects.equals(workout.getPerformedAt(), start)
                && Objects.equals(workout.getGarminTypeKey(), a.typeKey())
                && Objects.equals(workout.getGarminDescription(), description)
                && Objects.equals(workout.getGarminExercises(), exercises)
                && Objects.equals(workout.trainingEffect(), effect)) {
            return false;
        }
        workout.setPerformedAt(start);
        workout.setGarminTypeKey(a.typeKey());
        workout.setGarminDescription(description);
        workout.setGarminExercises(exercises);
        setTrainingEffect(workout, effect);
        return true;
    }

    private void setTrainingEffect(WorkoutLog workout, TrainingEffect effect) {
        workout.setGarminAerobicEffect(effect != null ? effect.aerobic() : null);
        workout.setGarminAnaerobicEffect(effect != null ? effect.anaerobic() : null);
        workout.setGarminEffectLabel(effect != null ? effect.label() : null);
    }

    private WorkoutLog importActivity(User user, GarminActivity a, Instant start) {
        WorkoutType type = GarminActivityMapper.type(a.typeKey());

        WorkoutLog workout = WorkoutLog.builder()
                .user(user)
                .type(type)
                .durationMinutes(GarminActivityMapper.durationMinutes(a))
                .notes(truncate(a.activityName()))
                .garminActivityId(a.activityId())
                .garminTypeKey(a.typeKey())
                .garminDescription(GarminActivityMapper.description(a))
                .garminExercises(GarminActivityMapper.exercises(a))
                .performedAt(start)
                .build();
        setTrainingEffect(workout, GarminActivityMapper.trainingEffect(a));
        WorkoutLog saved = workoutLogRepository.save(workout);

        WorkoutMetric metric = WorkoutMetric.builder()
                .workoutLog(saved)
                .distanceKm(GarminActivityMapper.distanceKm(a))
                .pacePerKm(GarminActivityMapper.pacePerKm(a, type))
                .avgHeartRate(GarminActivityMapper.rounded(a.averageHR()))
                .maxHeartRate(GarminActivityMapper.rounded(a.maxHR()))
                .caloriesBurned(GarminActivityMapper.rounded(a.calories()))
                .build();

        if (hasAnyValue(metric)) {
            saved.setMetric(workoutMetricRepository.save(metric));
        }
        return saved;
    }

    private boolean hasAnyValue(WorkoutMetric m) {
        return m.getDistanceKm() != null || m.getPacePerKm() != null || m.getAvgHeartRate() != null
                || m.getMaxHeartRate() != null || m.getCaloriesBurned() != null;
    }

    private String truncate(String text) {
        if (text == null || text.isBlank()) return null;
        return text.length() <= MAX_NOTES_LENGTH ? text : text.substring(0, MAX_NOTES_LENGTH);
    }
}
