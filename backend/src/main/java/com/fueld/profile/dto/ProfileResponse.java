package com.fueld.profile.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProfileResponse(
        UUID id,
        String goals,
        String diet,
        String sports,
        BigDecimal bodyWeight,
        Integer height,
        Integer age,
        String gender,
        String activityLevel,
        Instant updatedAt
) {}
