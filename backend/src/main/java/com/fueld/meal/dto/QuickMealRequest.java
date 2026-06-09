package com.fueld.meal.dto;

public record QuickMealRequest(
        String text,
        String summary,
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat,
        String mealType
) {}
