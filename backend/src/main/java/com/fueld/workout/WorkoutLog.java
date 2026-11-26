package com.fueld.workout;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkoutLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WorkoutType type;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    private String notes;
    private String summary;
    private String feedback;

    @Column(name = "ai_analysis", columnDefinition = "TEXT")
    private String aiAnalysis;

    @OneToOne(mappedBy = "workoutLog", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private WorkoutMetric metric;

    // Gesetzt bei Import über die Garmin Personal API; dient der Dublettenerkennung
    @Column(name = "garmin_activity_id")
    private Long garminActivityId;

    @Column(name = "garmin_type_key", length = 100)
    private String garminTypeKey;

    @Column(name = "garmin_description", columnDefinition = "TEXT")
    private String garminDescription;

    @Convert(converter = WorkoutExerciseListConverter.class)
    @Column(name = "garmin_exercises", columnDefinition = "TEXT")
    @Builder.Default
    private List<WorkoutExercise> garminExercises = List.of();

    @Column(name = "garmin_aerobic_effect", precision = 2, scale = 1)
    private BigDecimal garminAerobicEffect;

    @Column(name = "garmin_anaerobic_effect", precision = 2, scale = 1)
    private BigDecimal garminAnaerobicEffect;

    @Column(name = "garmin_effect_label", length = 100)
    private String garminEffectLabel;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private List<String> muscles = List.of();

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private List<String> benefits = List.of();

    @Column(name = "performed_at", nullable = false)
    private Instant performedAt;

    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;

    /** Die drei Garmin-Spalten als ein Wert; null, wenn Garmin nichts geliefert hat. */
    public TrainingEffect trainingEffect() {
        if (garminAerobicEffect == null && garminAnaerobicEffect == null && garminEffectLabel == null) return null;
        return new TrainingEffect(garminAerobicEffect, garminAnaerobicEffect, garminEffectLabel);
    }

    @PrePersist
    void onCreate() {
        this.loggedAt = Instant.now();
        if (this.performedAt == null) this.performedAt = this.loggedAt;
    }
}
