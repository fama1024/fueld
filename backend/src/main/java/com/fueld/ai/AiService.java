package com.fueld.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import tools.jackson.databind.ObjectMapper;
import com.fueld.meal.dto.MealAnalysis;
import com.fueld.meal.dto.MealLogRequest;
import com.fueld.weight.dto.BodyCompositionAnalysis;
import com.fueld.workout.WorkoutType;
import com.fueld.workout.dto.WorkoutAnalysis;
import com.fueld.workout.dto.WorkoutLogRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${app.claude.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        client = apiKey.isBlank()
                ? AnthropicOkHttpClient.fromEnv()
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    public MealAnalysis analyzeMeal(String profileContext, String mealText,
                                     List<MealLogRequest.PhotoDto> photos,
                                     String mealType, int todayCalories, int todayProtein,
                                     int todayCarbs, int todayFat,
                                     int goalCalories, int goalProtein, int goalCarbs, int goalFat) {
        String systemPrompt = buildSystemPrompt(profileContext, mealType,
                todayCalories, todayProtein, todayCarbs, todayFat,
                goalCalories, goalProtein, goalCarbs, goalFat);

        List<ContentBlockParam> userContent = new ArrayList<>();

        if (photos != null) {
            for (MealLogRequest.PhotoDto photo : photos) {
                Base64ImageSource.MediaType mediaType = resolveMediaType(photo.mediaType());
                userContent.add(ContentBlockParam.ofImage(
                        ImageBlockParam.builder()
                                .source(ImageBlockParam.Source.ofBase64(
                                        Base64ImageSource.builder()
                                                .mediaType(mediaType)
                                                .data(photo.data())
                                                .build()))
                                .build()));
            }
        }

        userContent.add(ContentBlockParam.ofText(
                TextBlockParam.builder().text(mealText).build()));

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-5")
                .maxTokens(2048L)
                // Reine JSON-Extraktion – kein Thinking nötig. Sonnet 5 denkt sonst
                // per Default und verbraucht einen Teil des Token-Budgets, wodurch die
                // JSON-Antwort mittendrin abgeschnitten wird ("AI-Antwort konnte nicht
                // verarbeitet werden"). Ohne Thinking reichen 2048 Tokens locker.
                .thinking(ThinkingConfigDisabled.builder().build())
                .system(systemPrompt)
                .addUserMessageOfBlockParams(userContent)
                .build();

        Message response = client.messages().create(params);

        if (response.stopReason().filter(StopReason.MAX_TOKENS::equals).isPresent()) {
            log.error("Claude-Mahlzeitanalyse bei max_tokens abgeschnitten – maxTokens erhöhen");
        }

        String content = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        return parseAnalysis(content);
    }

    public WorkoutAnalysis analyzeWorkout(String profileContext, WorkoutType type,
                                           Integer durationMinutes, String notes,
                                           List<WorkoutLogRequest.PhotoDto> photos) {
        String systemPrompt = """
                Du bist ein Fitness-Coach. Analysiere das beschriebene Training und antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung.

                Nutzerprofil (allgemeine Vorlieben, z.B. bevorzugte Sportarten – KEINE Aussage darüber, was heute tatsächlich gemacht wurde; das aktuelle Training steht unten):
                %s

                KALORIENBERECHNUNG (wichtig):
                Berechne calories_burned immer, wenn genug Daten vorhanden sind — auch bei reinen Texteingaben ohne Screenshot.
                Verwende dazu MET-Werte (Metabolic Equivalent of Task):
                - Radfahren locker (< 16 km/h): MET 4.0, moderat (16–22 km/h): MET 6.8, schnell (> 22 km/h): MET 10.0
                - Laufen: MET je nach Pace (8 min/km = 7.0, 6 min/km = 10.0, 5 min/km = 11.5)
                - Crossfit / HIIT: MET 8.0–12.0
                Formel: Kalorien = MET × Körpergewicht (kg) × Dauer (h)
                Falls kein Körpergewicht im Profil: schätze 75 kg und weise in missing_data darauf hin.
                Falls Distanz und Geschwindigkeit bekannt, aber keine Dauer: berechne Dauer = Distanz / Geschwindigkeit.
                Höhenmeter erhöhen den Verbrauch signifikant — falls vorhanden, berücksichtigen (+10 kcal pro 100 Höhenmeter pro 10 kg Körpergewicht als Faustregel).
                Gib im feedback kurz an, auf welcher Datenbasis die Schätzung beruht und wie genau sie ist.

                MISSING_DATA — Liste hier konkret auf, was die Schätzung verbessern würde:
                - "Körpergewicht im Profil eintragen → genauere Kalorien" (falls nicht vorhanden)
                - "Höhenmeter angeben → berücksichtigt Steigungsaufwand"
                - "Herzraten-Screen (Garmin) → präziserer Kalorienverbrauch"
                - Nur relevante Hinweise, keine generischen Floskeln.

                Antworte NUR mit diesem JSON-Objekt:
                {
                  "summary": "kurze Bewertung",
                  "distance_km": null,
                  "pace_per_km": null,
                  "avg_heart_rate": null,
                  "max_heart_rate": null,
                  "calories_burned": null,
                  "feedback": "Bewertung bezogen auf Ziele + kurze Angabe zur Kalorienschätzung",
                  "missing_data": []
                }
                Fehlende Werte als null angeben. Falls ein Garmin-Screenshot vorhanden ist, extrahiere alle sichtbaren Metriken.
                """.formatted(profileContext);

        List<ContentBlockParam> userContent = new ArrayList<>();

        if (photos != null) {
            for (WorkoutLogRequest.PhotoDto photo : photos) {
                Base64ImageSource.MediaType mediaType = resolveMediaType(photo.mediaType());
                userContent.add(ContentBlockParam.ofImage(
                        ImageBlockParam.builder()
                                .source(ImageBlockParam.Source.ofBase64(
                                        Base64ImageSource.builder()
                                                .mediaType(mediaType)
                                                .data(photo.data())
                                                .build()))
                                .build()));
            }
        }

        String userText = "Sportart: " + type
                + (durationMinutes != null ? "\nDauer: " + durationMinutes + " Minuten" : "")
                + (notes != null && !notes.isBlank() ? "\nNotizen: " + notes : "");
        userContent.add(ContentBlockParam.ofText(TextBlockParam.builder().text(userText).build()));

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-6")
                .maxTokens(1024L)
                .system(systemPrompt)
                .addUserMessageOfBlockParams(userContent)
                .build();

        Message response = client.messages().create(params);
        String content = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        String cleaned = content.trim()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .trim();
        try {
            return objectMapper.readValue(cleaned, WorkoutAnalysis.class);
        } catch (Exception e) {
            log.error("Workout-Analyse konnte nicht geparst werden: {}", content, e);
            throw new RuntimeException("AI-Antwort konnte nicht verarbeitet werden");
        }
    }

    public BodyCompositionAnalysis extractBodyComposition(String photoData, String mediaType) {
        String systemPrompt = """
                Du bist ein Datenextraktions-Assistent. Analysiere den Screenshot der Xiaomi / Mi Fitness App und extrahiere alle sichtbaren Körperzusammensetzungs-Werte.

                Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung:
                {
                  "weight": 78.5,
                  "bmi": 23.4,
                  "body_fat_pct": 18.2,
                  "muscle_mass_pct": 42.1,
                  "bone_mass_kg": 3.2,
                  "water_pct": 58.5
                }
                Fehlende oder nicht sichtbare Werte als null angeben. Zahlen als Dezimalzahlen ohne Einheit.
                """;

        Base64ImageSource.MediaType mt = resolveMediaType(mediaType);
        ContentBlockParam imageBlock = ContentBlockParam.ofImage(
                ImageBlockParam.builder()
                        .source(ImageBlockParam.Source.ofBase64(
                                Base64ImageSource.builder()
                                        .mediaType(mt)
                                        .data(photoData)
                                        .build()))
                        .build());

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-6")
                .maxTokens(256L)
                .system(systemPrompt)
                .addUserMessageOfBlockParams(List.of(imageBlock,
                        ContentBlockParam.ofText(TextBlockParam.builder().text("Extrahiere die Körperdaten aus diesem Screenshot.").build())))
                .build();

        Message response = client.messages().create(params);
        String content = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        String cleaned = content.trim()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .trim();
        try {
            return objectMapper.readValue(cleaned, BodyCompositionAnalysis.class);
        } catch (Exception e) {
            log.error("Körperkompositions-Analyse konnte nicht geparst werden: {}", content, e);
            throw new RuntimeException("AI-Antwort konnte nicht verarbeitet werden");
        }
    }

    private String buildSystemPrompt(String profileContext, String mealType,
                                      int todayCalories, int todayProtein, int todayCarbs, int todayFat,
                                      int goalCalories, int goalProtein, int goalCarbs, int goalFat) {
        String mealTypeContext = mealType != null ? switch (mealType) {
            case "breakfast" -> "Mahlzeittyp: Frühstück";
            case "lunch"     -> "Mahlzeittyp: Mittagessen";
            case "dinner"    -> "Mahlzeittyp: Abendessen";
            case "snack"     -> "Mahlzeittyp: Snack";
            default          -> "";
        } : "";

        int remainCalories = Math.max(0, goalCalories - todayCalories);
        int remainProtein  = Math.max(0, goalProtein  - todayProtein);
        int remainCarbs    = Math.max(0, goalCarbs    - todayCarbs);
        int remainFat      = Math.max(0, goalFat      - todayFat);

        return """
                Du bist ein Ernährungs- und Fitness-Coach. Analysiere die beschriebene Mahlzeit und antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung.

                Nutzerprofil (allgemeine Vorlieben, z.B. bevorzugte Sportarten – KEINE Aussage darüber, was heute tatsächlich gemacht wurde):
                %s
                %s

                Heutiger Tagesstand (vor dieser Mahlzeit):
                Kalorien: %d / %d kcal (noch %d kcal übrig)
                Protein:  %d / %d g  (noch %d g übrig)
                Kohlenhydrate: %d / %d g (noch %d g übrig)
                Fett: %d / %d g (noch %d g übrig)

                INGREDIENT_TIPS: Basierend auf den verbleibenden Tageslücken oben, schlage 2–4 konkrete Lebensmittel vor, die heute noch gegessen werden sollten. Format: "Lebensmittel (Menge) → Grund". Nur wenn noch deutliche Lücken vorhanden sind.

                GOAL_RATING: Komprimiere deine goal_alignment-Einschätzung auf eine von drei Stufen:
                - "good": passt gut zu den Zielen des Nutzers
                - "neutral": geht so, weder klar förderlich noch hinderlich
                - "poor": eher nicht zuträglich für die Ziele
                Sei nicht streng – die Werte sind ohnehin grobe Schätzungen, im Zweifel eher "neutral" statt "poor".

                Antworte NUR mit diesem JSON-Objekt (kein Text davor oder danach, keine Code-Blöcke):
                {
                  "summary": "kurze Beschreibung der Mahlzeit",
                  "calories": 450,
                  "protein": 28,
                  "carbs": 52,
                  "fat": 12,
                  "feedback": "allgemeine Bewertung der Mahlzeit",
                  "tip": "ein konkreter Tipp oder null",
                  "goal_alignment": "1-2 Sätze: Wie zahlt diese Mahlzeit konkret auf die Ziele des Nutzers ein?",
                  "goal_rating": "good",
                  "ingredient_tips": ["Tofu 150g → schließt Protein-Lücke von %dg", "Haferflocken → gute Carbs für Ausdauer"]
                }
                """.formatted(profileContext, mealTypeContext,
                todayCalories, goalCalories, remainCalories,
                todayProtein,  goalProtein,  remainProtein,
                todayCarbs,    goalCarbs,    remainCarbs,
                todayFat,      goalFat,      remainFat,
                remainProtein);
    }

    private MealAnalysis parseAnalysis(String raw) {
        // Strip potential markdown code fences
        String cleaned = raw.trim()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .trim();
        try {
            return objectMapper.readValue(cleaned, MealAnalysis.class);
        } catch (Exception e) {
            log.error("AI-Antwort konnte nicht geparst werden: {}", raw, e);
            throw new RuntimeException("AI-Antwort konnte nicht verarbeitet werden");
        }
    }

    private Base64ImageSource.MediaType resolveMediaType(String mime) {
        if (mime == null) return Base64ImageSource.MediaType.IMAGE_JPEG;
        return switch (mime.toLowerCase()) {
            case "image/png" -> Base64ImageSource.MediaType.IMAGE_PNG;
            case "image/gif" -> Base64ImageSource.MediaType.IMAGE_GIF;
            case "image/webp" -> Base64ImageSource.MediaType.IMAGE_WEBP;
            default -> Base64ImageSource.MediaType.IMAGE_JPEG;
        };
    }
}
