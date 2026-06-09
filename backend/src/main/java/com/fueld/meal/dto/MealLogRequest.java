package com.fueld.meal.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record MealLogRequest(
        @NotBlank String text,
        List<PhotoDto> photos,
        String mealType,   // "breakfast" | "lunch" | "dinner" | "snack" — optional
        String eatenAt     // ISO date string "YYYY-MM-DD" — optional, default today
) {
    public record PhotoDto(String data, String mediaType) {}
}
