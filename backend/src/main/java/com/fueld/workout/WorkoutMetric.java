package com.fueld.workout;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "workout_metric")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkoutMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_log_id", nullable = false)
    private WorkoutLog workoutLog;

    @Column(name = "distance_km", precision = 6, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "pace_per_km")
    private String pacePerKm;

    @Column(name = "avg_heart_rate")
    private Integer avgHeartRate;

    @Column(name = "max_heart_rate")
    private Integer maxHeartRate;

    @Column(name = "calories_burned")
    private Integer caloriesBurned;
}
