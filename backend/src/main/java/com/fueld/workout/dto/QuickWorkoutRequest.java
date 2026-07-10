package com.fueld.workout.dto;

import com.fueld.workout.WorkoutType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record QuickWorkoutRequest(
        @NotNull WorkoutType type,
        Integer durationMinutes,
        String notes,
        String performedAt,       // ISO "YYYY-MM-DD", optional, default heute
        BigDecimal distanceKm,
        String pacePerKm,
        Integer avgHeartRate,
        Integer maxHeartRate,
        Integer caloriesBurned
) {}
