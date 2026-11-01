package com.fueld.entry.dto;

import java.math.BigDecimal;

/**
 * Ein erkannter, noch nicht gespeicherter Eintrag. Geht vom Server zum Client und nach
 * einer eventuellen Rückfrage unverändert (plus {@code mealType}) wieder zurück.
 */
public record EntryDraft(
        String kind,              // "meal" | "workout"
        String text,
        String date,              // ISO "YYYY-MM-DD"
        String summary,
        String feedback,
        String mealType,          // null = Rückfrage nötig
        Integer calories,
        Integer protein,
        Integer carbs,
        Integer fat,
        String goalAlignment,
        String goalRating,
        String workoutType,
        Integer durationMinutes,
        BigDecimal distanceKm,
        String pacePerKm,
        Integer caloriesBurned,
        String muscleGroups       // nur Training, Format "quads:primary,glutes:secondary"
) {}
