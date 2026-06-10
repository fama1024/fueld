package com.fueld.pantry.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PantryExtractedItem(
        String name,
        String quantity,
        @JsonProperty("calories_per_100g") Integer caloriesPer100g,
        @JsonProperty("protein_per_100g")  BigDecimal proteinPer100g,
        @JsonProperty("carbs_per_100g")    BigDecimal carbsPer100g,
        @JsonProperty("fat_per_100g")      BigDecimal fatPer100g
) {}
