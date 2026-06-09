package com.fueld.meal.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MealAnalysis(
        String summary,
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat,
        String feedback,
        String tip
) {}
