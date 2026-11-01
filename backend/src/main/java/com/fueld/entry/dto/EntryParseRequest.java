package com.fueld.entry.dto;

import com.fueld.meal.dto.MealLogRequest;

import java.util.List;

public record EntryParseRequest(
        String text,
        List<MealLogRequest.PhotoDto> photos
) {}
