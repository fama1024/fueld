package com.fueld.meal.dto;

import java.util.List;

public record TodaySummaryResponse(
        int totalCalories,
        int totalProtein,
        int totalCarbs,
        int totalFat,
        List<MealLogResponse> meals
) {}
