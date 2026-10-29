package com.fueld.garmin;

import com.fueld.garmin.dto.GarminSyncResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutLogRepository;
import com.fueld.workout.WorkoutMetric;
import com.fueld.workout.WorkoutMetricRepository;
import com.fueld.workout.WorkoutType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Importiert Garmin-Aktivitäten als Trainings – ohne KI-Aufruf, die Garmin-Werte sind exakt.
 * Die Personal API ist laut Garmin nur für den eigenen Account gedacht: der Import ist daher
 * an genau einen Fueld-Nutzer gebunden (app.garmin.user-email).
 */
@Slf4j
@Service
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
    private final String userEmail;

    public GarminSyncService(
            GarminClient client,
            WorkoutLogRepository workoutLogRepository,
            WorkoutMetricRepository workoutMetricRepository,
            @Value("${app.garmin.user-email:}") String userEmail) {
        this.client = client;
        this.workoutLogRepository = workoutLogRepository;
        this.workoutMetricRepository = workoutMetricRepository;
        this.userEmail = userEmail;
    }

    /** Import ist aktiv, wenn Key und User-Mail gesetzt sind und die Mail zum Nutzer passt. */
    public boolean isEnabledFor(User user) {
        return client.isConfigured() && isSyncUser(user.getEmail());
    }

    public boolean isSyncUser(String email) {
        return userEmail != null && !userEmail.isBlank() && userEmail.trim().equalsIgnoreCase(email);
    }

    public String syncUserEmail() {
        return userEmail != null ? userEmail.trim() : "";
    }

    public GarminSyncResponse sync(User user) {
        return sync(user, DEFAULT_DAYS);
    }

    /**
     * Importiert alle Aktivitäten der letzten {@code days} Tage (begrenzt auf 1..MAX_DAYS).
     * Garmin liefert seitenweise, neueste zuerst: sobald eine Aktivität vor dem Stichtag liegt,
     * ist der Rest älter und der Lauf endet. Schon importierte Aktivitäten werden übersprungen,
     * ein wiederholter Lauf ist daher gefahrlos.
     */
    @Transactional
    public GarminSyncResponse sync(User user, int days) {
        int window = Math.max(1, Math.min(days, MAX_DAYS));
        Instant cutoff = Instant.now().minus(Duration.ofDays(window));
        Set<Long> known = new HashSet<>(workoutLogRepository.findGarminActivityIdsByUserId(user.getId()));
        int imported = 0;
        int skipped = 0;

        for (int page = 0; page < MAX_PAGES; page++) {
            List<GarminActivity> activities = client.fetchActivities(page * PAGE_SIZE, PAGE_SIZE);
            boolean reachedCutoff = false;

            for (GarminActivity activity : activities) {
                Instant start = GarminActivityMapper.startTime(activity);
                if (activity.activityId() == null || start == null) continue;
                if (start.isBefore(cutoff)) {
                    reachedCutoff = true;
                    continue;
                }
                if (!known.add(activity.activityId())) {
                    skipped++;
                    continue;
                }
                importActivity(user, activity, start);
                imported++;
            }

            if (reachedCutoff || activities.size() < PAGE_SIZE) break;
            if (!pauseBetweenPages()) break;
        }
        log.info("Garmin-Sync ({} Tage): {} importiert, {} bereits vorhanden", window, imported, skipped);
        return new GarminSyncResponse(imported, skipped);
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

    private void importActivity(User user, GarminActivity a, Instant start) {
        WorkoutType type = GarminActivityMapper.type(a.typeKey());

        WorkoutLog saved = workoutLogRepository.save(WorkoutLog.builder()
                .user(user)
                .type(type)
                .durationMinutes(GarminActivityMapper.durationMinutes(a))
                .notes(truncate(a.activityName()))
                .garminActivityId(a.activityId())
                .performedAt(start)
                .build());

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
