package com.fueld.pantry.dto;

import java.util.List;

public record PantryAnalysisResponse(
        List<IngredientRating> ingredientRatings,
        List<Recipe> recipes
) {
    public record IngredientRating(String name, int stars, String reason) {}

    public record Recipe(
            String name,
            List<String> ingredients,
            String steps,
            Integer calories,
            Integer protein,
            Integer carbs,
            Integer fat,
            String goalFit
    ) {}
}
