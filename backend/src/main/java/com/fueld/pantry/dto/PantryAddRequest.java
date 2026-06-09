package com.fueld.pantry.dto;

import java.util.List;

public record PantryAddRequest(List<PantryItemDto> items) {
    public record PantryItemDto(String name, String quantity) {}
}
