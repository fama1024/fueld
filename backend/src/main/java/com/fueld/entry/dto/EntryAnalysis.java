package com.fueld.entry.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

/** Antwort der KI auf einen freien Text: alle erkannten Mahlzeiten und Trainings. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EntryAnalysis(List<Item> items, String message) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(
            String kind,
            String text,
            String date,
            String summary,
            String feedback,
            @JsonProperty("meal_type") String mealType,
            Integer calories,
            Integer protein,
            Integer carbs,
            Integer fat,
            @JsonProperty("goal_alignment") String goalAlignment,
            @JsonProperty("goal_rating") String goalRating,
            @JsonProperty("workout_type") String workoutType,
            @JsonProperty("duration_minutes") Integer durationMinutes,
            @JsonProperty("distance_km") BigDecimal distanceKm,
            @JsonProperty("pace_per_km") String pacePerKm,
            @JsonProperty("calories_burned") Integer caloriesBurned
    ) {}
}
