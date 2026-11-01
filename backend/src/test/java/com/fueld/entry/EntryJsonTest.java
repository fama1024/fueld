package com.fueld.entry;

import com.fueld.entry.dto.EntryAnalysis;
import com.fueld.entry.dto.EntryConfirmRequest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class EntryJsonTest {

    private final ObjectMapper mapper = JsonMapper.builder().build();

    @Test
    void kiAntwort_mitMehrerenMahlzeiten() {
        String json = """
                {"message": null, "items": [
                  {"kind": "meal", "text": "zwei Eier", "date": "2026-10-31", "summary": "Eier mit Brot",
                   "feedback": "Solide.", "meal_type": "breakfast", "calories": 520, "protein": 28, "carbs": 42, "fat": 24,
                   "goal_alignment": "Passt.", "goal_rating": "good", "workout_type": null, "duration_minutes": null,
                   "distance_km": null, "pace_per_km": null, "calories_burned": null},
                  {"kind": "workout", "text": "5 km", "date": "2026-10-31", "summary": "Lauf", "feedback": "Gut.",
                   "workout_type": "running", "duration_minutes": 30, "distance_km": 5.0, "pace_per_km": "6:00", "calories_burned": 400}
                ]}
                """;

        EntryAnalysis analysis = mapper.readValue(json, EntryAnalysis.class);

        assertThat(analysis.items()).hasSize(2);
        assertThat(analysis.items().getFirst().mealType()).isEqualTo("breakfast");
        assertThat(analysis.items().get(1).distanceKm()).isEqualByComparingTo("5.0");
    }

    @Test
    void bestaetigung_vomClient() {
        String json = """
                {"items": [{"kind": "meal", "text": "Eier", "date": "2026-10-31", "summary": "Eier", "feedback": null,
                 "mealType": "breakfast", "calories": 520, "protein": 28, "carbs": 42, "fat": 24, "goalAlignment": "Passt.",
                 "goalRating": "good", "workoutType": null, "durationMinutes": null, "distanceKm": null, "pacePerKm": null,
                 "caloriesBurned": null}]}
                """;

        EntryConfirmRequest request = mapper.readValue(json, EntryConfirmRequest.class);

        assertThat(request.items().getFirst().mealType()).isEqualTo("breakfast");
    }
}
