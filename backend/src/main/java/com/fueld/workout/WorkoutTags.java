package com.fueld.workout;

import java.util.List;
import java.util.Objects;

/** KI-Antworten und der Rückweg vom Client sind Eingaben: Listen werden vor dem Speichern bereinigt. */
public final class WorkoutTags {

    public static final int MAX_MUSCLES = 6;
    public static final int MAX_BENEFITS = 3;
    private static final int MAX_LENGTH = 80;

    private WorkoutTags() {}

    /** Ohne leere und doppelte Einträge, höchstens {@code max} Stück. Nie null. */
    public static List<String> clean(List<String> values, int max) {
        if (values == null) return List.of();
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::strip)
                .filter(value -> !value.isEmpty())
                .map(value -> value.length() <= MAX_LENGTH ? value : value.substring(0, MAX_LENGTH))
                .distinct()
                .limit(max)
                .toList();
    }
}
