package com.fueld.weight.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WeightLogResponse(
        UUID id,
        BigDecimal weight,
        BigDecimal bmi,
        BigDecimal bodyFatPct,
        BigDecimal muscleMassPct,
        BigDecimal boneMassKg,
        BigDecimal waterPct,
        Instant loggedAt
) {}
