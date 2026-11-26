package com.fueld.garmin;

import com.fueld.workout.TrainingEffect;
import com.fueld.workout.WorkoutExercise;
import com.fueld.workout.WorkoutType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** Rechnet Garmin-Werte (Sekunden, Meter, typeKey) in Fueld-Werte um. */
final class GarminActivityMapper {

    private static final DateTimeFormatter GMT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Set<String> CROSSFIT_LIKE = Set.of("hiit", "strength_training", "indoor_cardio", "cardio");

    private static final int MAX_DESCRIPTION_LENGTH = 2000;

    private GarminActivityMapper() {}

    /** startTimeGMT ("2026-10-25 09:47:39", UTC) → Instant, bei ungültigem Wert null. */
    static Instant startTime(GarminActivity a) {
        if (a.startTimeGMT() == null) return null;
        try {
            return LocalDateTime.parse(a.startTimeGMT(), GMT_FORMAT).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Läufe → running, Rad → cycling, HIIT/Kraft/Cardio → crossfit, alles andere → other. */
    static WorkoutType type(String typeKey) {
        if (typeKey == null) return WorkoutType.other;
        String key = typeKey.toLowerCase();
        if (key.contains("run")) return WorkoutType.running;
        if (key.contains("cycl") || key.contains("bik") || key.contains("ride")) return WorkoutType.cycling;
        if (CROSSFIT_LIKE.contains(key)) return WorkoutType.crossfit;
        return WorkoutType.other;
    }

    static Integer durationMinutes(GarminActivity a) {
        return a.duration() != null ? (int) Math.round(a.duration() / 60.0) : null;
    }

    /** Meter → km mit 2 Nachkommastellen; ohne Distanz (z.B. HIIT) null. */
    static BigDecimal distanceKm(GarminActivity a) {
        if (a.distance() == null || a.distance() <= 0) return null;
        return BigDecimal.valueOf(a.distance() / 1000.0).setScale(2, RoundingMode.HALF_UP);
    }

    /** Pace "m:ss" pro km aus Dauer und Distanz; nur bei Läufen sinnvoll, sonst null. */
    static String pacePerKm(GarminActivity a, WorkoutType type) {
        if (type != WorkoutType.running || a.duration() == null || a.distance() == null || a.distance() <= 0) {
            return null;
        }
        long secondsPerKm = Math.round(a.duration() / (a.distance() / 1000.0));
        return "%d:%02d".formatted(secondsPerKm / 60, secondsPerKm % 60);
    }

    /** Beschreibung ohne Leerraum am Rand und auf MAX_DESCRIPTION_LENGTH gekürzt, leer → null. */
    static String description(GarminActivity a) {
        if (a.description() == null || a.description().isBlank()) return null;
        String text = a.description().strip();
        return text.length() <= MAX_DESCRIPTION_LENGTH ? text : text.substring(0, MAX_DESCRIPTION_LENGTH);
    }

    /** Garmins Übungen in Fueld-Einheiten (kg, Sekunden). Einträge ohne jede Angabe fallen weg. */
    static List<WorkoutExercise> exercises(GarminActivity a) {
        if (a.summarizedExerciseSets() == null) return List.of();
        return a.summarizedExerciseSets().stream()
                .filter(Objects::nonNull)
                .map(GarminActivityMapper::exercise)
                .filter(e -> e.name() != null || e.sets() != null || e.reps() != null || e.durationSeconds() != null)
                .toList();
    }

    private static WorkoutExercise exercise(GarminActivity.ExerciseSet set) {
        // subCategory ist genauer (z.B. BARBELL_BACK_SQUAT), category der Rückfall (SQUAT)
        String name = readableName(set.subCategory());
        if (name == null) name = readableName(set.category());
        Double seconds = set.duration() != null ? set.duration() / 1000.0 : null;
        return new WorkoutExercise(name, positive(set.sets()), positive(set.reps()),
                kilograms(set.maxWeight()), kilograms(set.volume()),
                positive(rounded(seconds)));
    }

    /** "BARBELL_BACK_SQUAT" → "Barbell Back Squat"; fehlend, leer oder UNKNOWN → null. */
    private static String readableName(String key) {
        if (key == null || key.isBlank() || key.equalsIgnoreCase("UNKNOWN")) return null;
        return Arrays.stream(key.split("_"))
                .filter(word -> !word.isEmpty())
                .map(word -> word.substring(0, 1).toUpperCase(Locale.ROOT) + word.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private static Integer positive(Integer value) {
        return value != null && value > 0 ? value : null;
    }

    /** Gramm → kg mit 1 Nachkommastelle; ohne Zusatzgewicht (0 oder negativ) null. */
    private static BigDecimal kilograms(Double grams) {
        if (grams == null || grams <= 0) return null;
        return BigDecimal.valueOf(grams / 1000.0).setScale(1, RoundingMode.HALF_UP);
    }

    /** Training Effect auf eine Nachkommastelle; null, wenn Garmin keinen gemessen hat. */
    static TrainingEffect trainingEffect(GarminActivity a) {
        String label = effectLabel(a.trainingEffectLabel());
        BigDecimal aerobic = effect(a.aerobicTrainingEffect());
        BigDecimal anaerobic = effect(a.anaerobicTrainingEffect());
        boolean measured = (aerobic != null && aerobic.signum() > 0) || (anaerobic != null && anaerobic.signum() > 0);
        return measured || label != null ? new TrainingEffect(aerobic, anaerobic, label) : null;
    }

    private static BigDecimal effect(Double value) {
        if (value == null || value < 0 || value > 5) return null;
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    }

    /** Garmins Spezifikation nennt keine festen Werte: bekannte werden übersetzt, andere lesbar gemacht. */
    private static String effectLabel(String key) {
        if (key == null) return null;
        return switch (key.toUpperCase(Locale.ROOT)) {
            case "RECOVERY" -> "Erholung";
            case "AEROBIC_BASE" -> "Grundlagenausdauer";
            case "TEMPO" -> "Tempo";
            case "LACTATE_THRESHOLD" -> "Laktatschwelle";
            case "VO2MAX" -> "VO2max";
            case "ANAEROBIC_CAPACITY" -> "Anaerobe Kapazität";
            case "SPEED", "SPRINT" -> "Schnelligkeit";
            default -> readableName(key);
        };
    }

    static Integer rounded(Double value) {
        return value != null ? (int) Math.round(value) : null;
    }
}
