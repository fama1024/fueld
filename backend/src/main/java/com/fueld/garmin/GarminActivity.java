package com.fueld.garmin;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Ausschnitt einer Aktivität aus der Garmin Personal API
 * (GET /activitylist-service/activities/search/activities).
 * Einheiten laut Garmin: duration in Sekunden, distance in Metern,
 * startTimeGMT als "yyyy-MM-dd HH:mm:ss" in UTC. Alles andere wird ignoriert.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GarminActivity(
        Long activityId,
        String activityName,
        String startTimeGMT,
        Double duration,
        Double distance,
        Double averageHR,
        Double maxHR,
        Double calories,
        ActivityType activityType,
        String description,
        List<ExerciseSet> summarizedExerciseSets,
        Double aerobicTrainingEffect,
        Double anaerobicTrainingEffect,
        String trainingEffectLabel
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ActivityType(String typeKey) {}

    /**
     * Eine Übung, über alle Sätze zusammengefasst. Einheiten laut Garmins Spezifikation:
     * maxWeight in Gramm, volume als Gramm x Wiederholungen, duration in Millisekunden.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExerciseSet(
            String category,
            String subCategory,
            Integer sets,
            Integer reps,
            Double maxWeight,
            Double volume,
            Double duration
    ) {}

    public String typeKey() {
        return activityType != null ? activityType.typeKey() : null;
    }
}
