package com.fueld.workout;

import com.fueld.ai.AiService;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.user.User;
import com.fueld.workout.dto.QuickWorkoutRequest;
import com.fueld.workout.dto.WorkoutAnalysis;
import com.fueld.workout.dto.WorkoutLogRequest;
import com.fueld.workout.dto.WorkoutLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private final WorkoutLogRepository workoutLogRepository;
    private final WorkoutMetricRepository workoutMetricRepository;
    private final ProfileRepository profileRepository;
    private final AiService aiService;

    @Transactional
    public WorkoutLogResponse logWorkout(User user, WorkoutLogRequest request) {
        String profileContext = profileRepository.findByUserId(user.getId())
                .map(this::formatProfile)
                .orElse("Kein Profil vorhanden.");

        WorkoutAnalysis analysis = aiService.analyzeWorkout(
                profileContext, request.type(), request.durationMinutes(),
                request.notes(), request.photos());

        WorkoutLog log = WorkoutLog.builder()
                .user(user)
                .type(request.type())
                .durationMinutes(request.durationMinutes())
                .notes(request.notes())
                .summary(analysis.summary())
                .feedback(analysis.feedback())
                .performedAt(parseDate(request.performedAt()))
                .build();

        WorkoutLog saved = workoutLogRepository.save(log);

        if (hasMetrics(analysis)) {
            WorkoutMetric metric = workoutMetricRepository.save(
                    WorkoutMetric.builder()
                            .workoutLog(saved)
                            .distanceKm(analysis.distanceKm())
                            .pacePerKm(analysis.pacePerKm())
                            .avgHeartRate(analysis.avgHeartRate())
                            .maxHeartRate(analysis.maxHeartRate())
                            .caloriesBurned(analysis.caloriesBurned())
                            .build());
            saved.setMetric(metric);
        }

        return toResponse(saved, analysis.missingData());
    }

    @Transactional
    public WorkoutLogResponse quickLog(User user, QuickWorkoutRequest request) {
        WorkoutLog log = WorkoutLog.builder()
                .user(user)
                .type(request.type())
                .durationMinutes(request.durationMinutes())
                .notes(request.notes())
                .performedAt(parseDate(request.performedAt()))
                .build();

        WorkoutLog saved = workoutLogRepository.save(log);

        if (hasManualMetrics(request)) {
            WorkoutMetric metric = workoutMetricRepository.save(
                    WorkoutMetric.builder()
                            .workoutLog(saved)
                            .distanceKm(request.distanceKm())
                            .pacePerKm(request.pacePerKm())
                            .avgHeartRate(request.avgHeartRate())
                            .maxHeartRate(request.maxHeartRate())
                            .caloriesBurned(request.caloriesBurned())
                            .build());
            saved.setMetric(metric);
        }

        return toResponse(saved, null);
    }

    public List<WorkoutLogResponse> getHistory(User user) {
        return workoutLogRepository.findByUserIdOrderByPerformedAtDesc(user.getId())
                .stream()
                .map(w -> toResponse(w, null))
                .toList();
    }

    public WorkoutLogResponse getById(User user, UUID id) {
        WorkoutLog workout = workoutLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!workout.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return toResponse(workout, null);
    }

    @Transactional
    public WorkoutLogResponse updateWorkout(User user, UUID id, WorkoutLogRequest request) {
        WorkoutLog workout = workoutLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!workout.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        String profileContext = profileRepository.findByUserId(user.getId())
                .map(this::formatProfile)
                .orElse("Kein Profil vorhanden.");

        WorkoutAnalysis analysis = aiService.analyzeWorkout(
                profileContext, request.type(), request.durationMinutes(),
                request.notes(), request.photos());

        workout.setType(request.type());
        workout.setDurationMinutes(request.durationMinutes());
        workout.setNotes(request.notes());
        workout.setSummary(analysis.summary());
        workout.setFeedback(analysis.feedback());
        if (request.performedAt() != null) workout.setPerformedAt(parseDate(request.performedAt()));

        // Alte Metrik ersetzen
        if (workout.getMetric() != null) {
            workoutMetricRepository.delete(workout.getMetric());
            workout.setMetric(null);
        }
        if (hasMetrics(analysis)) {
            WorkoutMetric metric = workoutMetricRepository.save(
                    WorkoutMetric.builder()
                            .workoutLog(workout)
                            .distanceKm(analysis.distanceKm())
                            .pacePerKm(analysis.pacePerKm())
                            .avgHeartRate(analysis.avgHeartRate())
                            .maxHeartRate(analysis.maxHeartRate())
                            .caloriesBurned(analysis.caloriesBurned())
                            .build());
            workout.setMetric(metric);
        }

        return toResponse(workoutLogRepository.save(workout), analysis.missingData());
    }

    public List<WorkoutLogResponse> getTodayWorkouts(User user) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        Instant from = today.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();
        return workoutLogRepository
                .findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(user.getId(), from, to)
                .stream()
                .map(w -> toResponse(w, null))
                .toList();
    }

    private Instant parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return Instant.now();
        try {
            return LocalDate.parse(dateStr)
                    .atStartOfDay(ZoneId.of("Europe/Berlin"))
                    .plusHours(12)
                    .toInstant();
        } catch (Exception e) {
            return Instant.now();
        }
    }

    private boolean hasMetrics(WorkoutAnalysis a) {
        return a.distanceKm() != null || a.avgHeartRate() != null || a.caloriesBurned() != null;
    }

    private boolean hasManualMetrics(QuickWorkoutRequest r) {
        return r.distanceKm() != null || r.pacePerKm() != null
                || r.avgHeartRate() != null || r.maxHeartRate() != null || r.caloriesBurned() != null;
    }

    private String formatProfile(Profile p) {
        StringBuilder sb = new StringBuilder();
        if (p.getGoals() != null) sb.append("Ziele: ").append(p.getGoals()).append("\n");
        if (p.getDiet() != null) sb.append("Ernährung: ").append(p.getDiet()).append("\n");
        if (p.getSports() != null) sb.append("Sport: ").append(p.getSports()).append("\n");
        if (p.getBodyWeight() != null) sb.append("Gewicht: ").append(p.getBodyWeight()).append(" kg\n");
        return sb.isEmpty() ? "Kein Profil vorhanden." : sb.toString();
    }

    private WorkoutLogResponse toResponse(WorkoutLog w, List<String> missingData) {
        WorkoutMetric m = w.getMetric();
        return new WorkoutLogResponse(
                w.getId(), w.getType(), w.getDurationMinutes(), w.getNotes(),
                w.getSummary(), w.getFeedback(), missingData,
                m != null ? m.getDistanceKm() : null,
                m != null ? m.getPacePerKm() : null,
                m != null ? m.getAvgHeartRate() : null,
                m != null ? m.getMaxHeartRate() : null,
                m != null ? m.getCaloriesBurned() : null,
                w.getPerformedAt(), w.getLoggedAt()
        );
    }
}
