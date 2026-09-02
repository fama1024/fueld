package com.fueld.meal.dto;

/** Loggen per Dropdown-Auswahl – nur noch meal_type + eaten_at bestätigen, kein KI-Call. */
public record FromSavedMealRequest(
        String mealType,   // "breakfast" | "lunch" | "dinner" | "snack" — optional
        String eatenAt     // ISO date string "YYYY-MM-DD" — optional, default heute
) {}
