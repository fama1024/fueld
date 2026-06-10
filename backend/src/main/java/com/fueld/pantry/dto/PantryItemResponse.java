package com.fueld.pantry.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PantryItemResponse(
        UUID id,
        String name,
        String quantity,
        Integer caloriesPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        Instant addedAt
) {}
