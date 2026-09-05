package com.fueld.meal.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MealAnalysis(
        String summary,
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat,
        String feedback,
        String tip,
        @JsonProperty("goal_alignment") String goalAlignment,
        @JsonProperty("goal_rating") String goalRating,
        @JsonProperty("ingredient_tips") List<String> ingredientTips
) {}
