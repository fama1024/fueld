package com.fueld.workout;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/** Beschreibt die Garmin-Details eines Trainings als Text für die KI-Prompts. */
public final class GarminDetailsText {

    private GarminDetailsText() {}

    /** Eine Zeile mit Aktivitätstyp, Übungen und Beschreibung; leer, wenn es keine Details gibt. */
    public static String describe(String typeKey, String description, List<WorkoutExercise> exercises,
                                  TrainingEffect effect) {
        List<String> parts = new ArrayList<>();
        if (typeKey != null) parts.add("Garmin-Aktivitätstyp: " + typeKey);
        if (exercises != null && !exercises.isEmpty()) {
            parts.add("Übungen laut Garmin: " + exercises.stream()
                    .map(GarminDetailsText::describeExercise)
                    .collect(Collectors.joining("; ")));
        }
        if (effect != null) parts.add(describeEffect(effect));
        if (description != null) parts.add("Beschreibung aus Garmin: " + description.replaceAll("\\s*\\R\\s*", " / "));
        return String.join(" | ", parts);
    }

    private static String describeEffect(TrainingEffect effect) {
        List<String> values = new ArrayList<>();
        if (effect.label() != null) values.add(effect.label());
        if (effect.aerobic() != null) values.add("aerob " + plain(effect.aerobic()) + " von 5");
        if (effect.anaerobic() != null) values.add("anaerob " + plain(effect.anaerobic()) + " von 5");
        return "Training Effect laut Garmin: " + String.join(", ", values);
    }

    private static String describeExercise(WorkoutExercise e) {
        List<String> values = new ArrayList<>();
        if (e.sets() != null) values.add(e.sets() + (e.sets() == 1 ? " Satz" : " Sätze"));
        if (e.reps() != null) values.add(e.reps() + " Wdh. gesamt");
        if (e.maxWeightKg() != null) values.add("max. " + plain(e.maxWeightKg()) + " kg");
        if (e.volumeKg() != null) values.add("Volumen " + plain(e.volumeKg()) + " kg");
        if (e.durationSeconds() != null) values.add(e.durationSeconds() + " s");
        String name = e.name() != null ? e.name() : "nicht erkannte Übung";
        return values.isEmpty() ? name : name + " (" + String.join(", ", values) + ")";
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
