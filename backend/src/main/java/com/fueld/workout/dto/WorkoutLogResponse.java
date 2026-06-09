package com.fueld.workout.dto;

import com.fueld.workout.WorkoutType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkoutLogResponse(
        UUID id,
        WorkoutType type,
        Integer durationMinutes,
        String notes,
        String summary,
        String feedback,
        List<String> missingData,
        BigDecimal distanceKm,
        String pacePerKm,
        Integer avgHeartRate,
        Integer maxHeartRate,
        Integer caloriesBurned,
        Instant performedAt,
        Instant loggedAt
) {}
