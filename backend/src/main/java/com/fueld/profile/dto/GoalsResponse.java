package com.fueld.profile.dto;

public record GoalsResponse(
        int calories,
        int protein,
        int carbs,
        int fat,
        boolean hasEnoughData
) {}
