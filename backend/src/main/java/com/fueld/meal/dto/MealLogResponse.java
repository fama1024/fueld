package com.fueld.meal.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MealLogResponse(
        UUID id,
        String textInput,
        String summary,
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat,
        String feedback,
        String tip,
        String goalAlignment,
        String goalRating,
        List<String> ingredientTips,
        String mealType,
        Instant eatenAt,
        Instant loggedAt
) {}
