package com.fueld.meal.dto;

import java.time.Instant;
import java.util.UUID;

public record SavedMealResponse(
        UUID id,
        String name,
        String textInput,
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat,
        Instant lastUsedAt
) {}
