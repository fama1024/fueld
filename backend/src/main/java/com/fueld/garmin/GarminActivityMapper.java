package com.fueld.garmin;

import com.fueld.workout.WorkoutType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Set;

/** Rechnet Garmin-Werte (Sekunden, Meter, typeKey) in Fueld-Werte um. */
final class GarminActivityMapper {

    private static final DateTimeFormatter GMT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Set<String> CROSSFIT_LIKE = Set.of("hiit", "strength_training", "indoor_cardio", "cardio");

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

    static Integer rounded(Double value) {
        return value != null ? (int) Math.round(value) : null;
    }
}
