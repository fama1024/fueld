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
import java.util.List;

/**
 * Importiert Garmin-Aktivitäten als Trainings – ohne KI-Aufruf, die Garmin-Werte sind exakt.
 * Die Personal API ist laut Garmin nur für den eigenen Account gedacht: der Import ist daher
 * an genau einen Fueld-Nutzer gebunden (app.garmin.user-email).
 */
@Slf4j
@Service
public class GarminSyncService {

    // Wie weit zurück importiert wird, und wie viele Aktivitäten pro Abruf maximal geholt werden
    private static final Duration LOOKBACK = Duration.ofDays(7);
    private static final int FETCH_LIMIT = 30;
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

    @Transactional
    public GarminSyncResponse sync(User user) {
        Instant cutoff = Instant.now().minus(LOOKBACK);
        int imported = 0;
        int skipped = 0;

        List<GarminActivity> activities = client.fetchRecentActivities(FETCH_LIMIT);
        for (GarminActivity activity : activities) {
            Instant start = GarminActivityMapper.startTime(activity);
            if (activity.activityId() == null || start == null || start.isBefore(cutoff)) continue;

            if (workoutLogRepository.existsByUserIdAndGarminActivityId(user.getId(), activity.activityId())) {
                skipped++;
                continue;
            }
            importActivity(user, activity, start);
            imported++;
        }
        log.info("Garmin-Sync: {} importiert, {} bereits vorhanden", imported, skipped);
        return new GarminSyncResponse(imported, skipped);
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
