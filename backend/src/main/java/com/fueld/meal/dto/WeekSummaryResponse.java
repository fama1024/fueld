package com.fueld.meal.dto;

public record WeekSummaryResponse(
        int totalCalories,
        int totalProtein,
        int totalCarbs,
        int totalFat
) {}
