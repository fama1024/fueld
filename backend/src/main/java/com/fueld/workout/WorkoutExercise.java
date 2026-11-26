package com.fueld.workout;

import java.math.BigDecimal;

/**
 * Eine Übung eines Trainings, über alle ihre Sätze zusammengefasst.
 * {@code name} ist null, wenn Garmin die Übung nicht erkannt hat; auch die übrigen Werte sind optional.
 */
public record WorkoutExercise(
        String name,
        Integer sets,
        Integer reps,
        BigDecimal maxWeightKg,
        BigDecimal volumeKg,
        Integer durationSeconds
) {}
