package com.fueld.pantry.dto;

import java.math.BigDecimal;
import java.util.List;

public record PantryAddRequest(List<PantryItemDto> items) {
    public record PantryItemDto(
            String name,
            String quantity,
            Integer caloriesPer100g,
            BigDecimal proteinPer100g,
            BigDecimal carbsPer100g,
            BigDecimal fatPer100g
    ) {}
}
