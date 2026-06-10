package com.fueld.weight.dto;

import java.math.BigDecimal;

public record WeightLogRequest(
        BigDecimal weight,
        BigDecimal bmi,
        BigDecimal bodyFatPct,
        BigDecimal muscleMassPct,
        BigDecimal boneMassKg,
        BigDecimal waterPct
) {}
