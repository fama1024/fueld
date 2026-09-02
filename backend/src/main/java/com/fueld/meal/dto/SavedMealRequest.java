package com.fueld.meal.dto;

import jakarta.validation.constraints.NotBlank;

/** Aus einer analysierten Mahlzeit heraus merken – Makros werden fix übernommen. */
public record SavedMealRequest(
        @NotBlank String name,
        String textInput,
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat
) {}
