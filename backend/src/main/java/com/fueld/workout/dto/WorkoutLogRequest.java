package com.fueld.workout.dto;

import com.fueld.workout.WorkoutType;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record WorkoutLogRequest(
        @NotNull WorkoutType type,
        Integer durationMinutes,
        String notes,
        List<PhotoDto> photos,
        String performedAt  // ISO date string "YYYY-MM-DD" — optional, default today
) {
    public record PhotoDto(String data, String mediaType) {}
}
