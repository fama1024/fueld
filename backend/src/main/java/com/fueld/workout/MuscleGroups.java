package com.fueld.workout;

import com.fueld.workout.dto.MuscleLoad;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Muskelgruppen eines Trainings. Die KI-Antwort und der Rückweg vom Client sind Eingaben:
 * Gespeichert wird nur, was zu den bekannten Gruppen passt, als Text wie "quads:primary,glutes:secondary".
 */
public final class MuscleGroups {

    public static final Set<String> GROUPS = Set.of(
            "chest", "shoulders", "biceps", "triceps", "core", "back", "glutes", "quads", "hamstrings", "calves");

    private static final String PRIMARY = "primary";
    private static final String SECONDARY = "secondary";

    private MuscleGroups() {}

    /** @return Speicherform oder null, wenn nichts Brauchbares dabei ist */
    public static String store(List<MuscleLoad> loads) {
        if (loads == null) return null;
        Map<String, String> byGroup = new LinkedHashMap<>();
        for (MuscleLoad load : loads) {
            // Set.of(...).contains(null) wirft eine Exception
            if (load == null || load.group() == null || !GROUPS.contains(load.group())) continue;
            String level = PRIMARY.equals(load.level()) ? PRIMARY : SECONDARY;
            // Nennt die KI eine Gruppe doppelt, gewinnt die stärkere Belastung
            byGroup.merge(load.group(), level, (a, b) -> PRIMARY.equals(a) || PRIMARY.equals(b) ? PRIMARY : SECONDARY);
        }
        if (byGroup.isEmpty()) return null;
        return byGroup.entrySet().stream().map(e -> e.getKey() + ":" + e.getValue()).collect(Collectors.joining(","));
    }

    /** Für Text, der vom Client zurückkommt. */
    public static String sanitizeStored(String stored) {
        return store(parse(stored));
    }

    public static List<MuscleLoad> parse(String stored) {
        if (stored == null || stored.isBlank()) return null;
        List<MuscleLoad> result = new ArrayList<>();
        for (String part : stored.split(",")) {
            String[] pair = part.trim().split(":");
            if (pair.length == 2) result.add(new MuscleLoad(pair[0], pair[1]));
        }
        return result.isEmpty() ? null : result;
    }
}
