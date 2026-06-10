package com.fueld.weight.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BodyCompositionAnalysis(
        BigDecimal weight,
        BigDecimal bmi,
        @JsonProperty("body_fat_pct")    BigDecimal bodyFatPct,
        @JsonProperty("muscle_mass_pct") BigDecimal muscleMassPct,
        @JsonProperty("bone_mass_kg")    BigDecimal boneMassKg,
        @JsonProperty("water_pct")       BigDecimal waterPct
) {}
