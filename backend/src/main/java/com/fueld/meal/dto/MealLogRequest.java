package com.fueld.meal.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record MealLogRequest(
        @NotBlank String text,
        List<PhotoDto> photos
) {
    public record PhotoDto(String data, String mediaType) {}
}
