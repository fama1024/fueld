package com.fueld.meal.dto;

/**
 * Zählwerte der Ziel-Ampel ({@code goal_rating}) über einen Zeitraum – wie oft
 * war eine Mahlzeit "passt gut" / "geht so" / "eher nicht" auf die Ziele
 * ausgerichtet. Grundlage für die Wochen-Tendenz auf dem Dashboard.
 * Mahlzeiten ohne {@code goal_rating} (z.B. Quick-Log ohne KI-Analyse) zählen
 * nirgends mit.
 */
public record GoalRatingSummary(
        int good,
        int neutral,
        int poor
) {}
