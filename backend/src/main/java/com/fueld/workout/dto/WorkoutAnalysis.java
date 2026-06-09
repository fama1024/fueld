package com.fueld.workout.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkoutAnalysis(
        String summary,
        @JsonProperty("distance_km") BigDecimal distanceKm,
        @JsonProperty("pace_per_km") String pacePerKm,
        @JsonProperty("avg_heart_rate") Integer avgHeartRate,
        @JsonProperty("max_heart_rate") Integer maxHeartRate,
        @JsonProperty("calories_burned") Integer caloriesBurned,
        String feedback,
        @JsonProperty("missing_data") List<String> missingData
) {}
