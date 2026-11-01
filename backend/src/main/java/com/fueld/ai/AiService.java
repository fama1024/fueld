package com.fueld.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import tools.jackson.databind.ObjectMapper;
import com.fueld.entry.dto.EntryAnalysis;
import com.fueld.focus.dto.FocusAnalysis;
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

    private static final int JSON_ATTEMPTS = 2;

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

    /**
     * Erkennt in einem freien Text alle Mahlzeiten und Trainings, auch mehrere auf einmal.
     * Ein Call für alles, damit ein ganzer Tag nicht pro Mahlzeit eine eigene Anfrage kostet.
     */
    public EntryAnalysis parseEntries(String profileContext, String now, String todayEntries,
                                      int goalCalories, int goalProtein,
                                      String text, List<MealLogRequest.PhotoDto> photos) {
        String systemPrompt = """
                Du erfasst Einträge für ein Ernährungs- und Trainingstagebuch. Zerlege die Eingabe des Nutzers in einzelne Mahlzeiten und Trainings und antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung.

                Jetzt ist: %s (Europe/Berlin)

                Nutzerprofil (allgemeine Vorlieben, z.B. bevorzugte Sportarten – KEINE Aussage darüber, was tatsächlich gemacht wurde):
                %s

                Tagesziele: %d kcal, %d g Protein

                Heute bereits eingetragen:
                %s

                REGELN:
                - Erfinde nichts. Erfasse nur, was in der Eingabe oder auf den Fotos steht.
                - Was oben schon eingetragen ist, erfasst du nicht noch einmal. Gilt das für alles, bleibt items leer und message lautet "Das ist schon eingetragen."
                - Jede Mahlzeit und jedes Training ist ein eigenes Item. Lebensmittel derselben Mahlzeit gehören zusammen.
                - date ist der Tag des Eintrags. Beziehe "gestern" oder Wochentage auf das heutige Datum. Ohne Angabe gilt heute. Nie in der Zukunft.
                - text ist der Originalwortlaut zu diesem Item.

                MEAL_TYPE: breakfast, lunch, dinner oder snack.
                - Zuordnen darfst du anhand von Worten wie "morgens", "mittags", "abends", anhand der Reihenfolge in einer Tagesbeschreibung oder wenn eine Mahlzeit eindeutig typisch ist.
                - Bei einer einzelnen Mahlzeit von heute ohne Hinweis zählt die Uhrzeit: 6–10 Uhr breakfast, 11:30–14 Uhr lunch, 18–21 Uhr dinner.
                - Passt nichts davon sicher, setze meal_type auf null. Der Nutzer wird dann gefragt. Rate nicht.

                MAHLZEITEN: Schätze Kalorien und Makros grob. goal_rating ist "good", "neutral" oder "poor"; sei nicht streng, im Zweifel "neutral".

                TRAININGS: workout_type ist running, crossfit, cycling oder other. Schätze calories_burned mit MET-Werten und dem Körpergewicht aus dem Profil (ohne Gewicht 75 kg). Laufen 7–11.5, Radfahren 4–10, Crossfit und HIIT 8–12. Ohne Dauer und ohne Distanz bleibt calories_burned null.

                Enthält die Eingabe weder Essen noch Sport, bleibt items leer und message erklärt in einem kurzen, freundlichen Satz, was fehlt.

                Antworte NUR mit diesem JSON-Objekt, nicht zutreffende Felder sind null:
                {
                  "message": null,
                  "items": [
                    {
                      "kind": "meal",
                      "text": "Originalwortlaut",
                      "date": "YYYY-MM-DD",
                      "summary": "kurze Beschreibung",
                      "feedback": "ein Satz grobe Einordnung",
                      "meal_type": "lunch",
                      "calories": 450,
                      "protein": 28,
                      "carbs": 52,
                      "fat": 12,
                      "goal_alignment": "ein Satz zum Ziel des Nutzers",
                      "goal_rating": "good"
                    },
                    {
                      "kind": "workout",
                      "text": "Originalwortlaut",
                      "date": "YYYY-MM-DD",
                      "summary": "kurze Beschreibung",
                      "feedback": "ein Satz grobe Einordnung",
                      "workout_type": "running",
                      "duration_minutes": 45,
                      "distance_km": 8.2,
                      "pace_per_km": "5:29",
                      "calories_burned": 520
                    }
                  ]
                }
                """.formatted(now, profileContext, goalCalories, goalProtein, todayEntries);

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

        userContent.add(ContentBlockParam.ofText(TextBlockParam.builder()
                .text(text != null && !text.isBlank() ? text : "Siehe Foto.")
                .build()));

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-5")
                // Ein ganzer Tag ergibt mehrere Items, deshalb mehr Budget als bei einer Mahlzeit
                .maxTokens(4096L)
                .thinking(ThinkingConfigDisabled.builder().build())
                .system(systemPrompt)
                .addUserMessageOfBlockParams(userContent)
                .build();

        return requestJson(params, EntryAnalysis.class, "Eintragserkennung");
    }

    /**
     * Formuliert den Fokus für die nächsten Tage. Die Prozentwerte kommen fertig gerechnet
     * aus {@code facts}, damit die KI keine eigenen Zahlen erfindet.
     */
    public FocusAnalysis generateFocus(String profileContext, String facts, String recentMeals) {
        String systemPrompt = """
                Du bist ein Ernährungs-Coach und formulierst den Fokus für die nächsten Tage in einem Ernährungs- und Trainingstagebuch. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung.

                Nutzerprofil (Ziele und Ernährungsweise sind verbindlich; Sportarten sind allgemein und keine Aussage über diese Woche):
                %s

                Gerechnete Werte der letzten Tage:
                %s

                Zuletzt gegessen:
                %s

                REGELN:
                - Entscheide frei, was dem Nutzer gerade am meisten hilft. Das können alle vier Makros sein, ihr Verhältnis zueinander, die Versorgung an Trainingstagen oder die Regelmäßigkeit.
                - Das Ziel bestimmt die Gewichtung. Bei Muskelaufbau zählen Protein und genug Energie, beim Abnehmen Kalorien und Sättigung, bei Ausdauer die Kohlenhydrate rund ums Training. Ohne Ziel zählt die größte Lücke.
                - Nutze nur die Werte oben. Rechne und erfinde keine eigenen Zahlen und keine Trainings.
                - summary ist die Kernaussage in ein bis zwei kurzen Sätzen in Du-Form: Was ist für das Ziel gerade das Wichtigste? Fasse zusammenhängende Lücken zusammen. Prozentwerte nur, wenn sie die Aussage klarer machen, höchstens einer.
                - steps sind bis zu drei konkrete, alltagstaugliche Schritte für die nächsten Tage. Beschreibe Gewohnheiten statt einzelner Tage, jeweils mit ein bis drei Beispielen, etwa "Zu jeder Hauptmahlzeit eine Proteinquelle, zum Beispiel ...". Keine Rezepte.
                - Passt alles, ist summary eine kurze Bestätigung, steps bleibt leer und avoid ist null.
                - avoid ist optional und meist null. Nenne genau eine Lebensmittelgruppe, die der Nutzer eher seltener essen sollte, mit Begründung nach dem Muster "Frittiertes, weil ...". Setze avoid nur, wenn die Werte und die zuletzt gegessenen Mahlzeiten das klar belegen. Keine pauschalen Tipps.
                - avoid nennt immer eine Gruppe, nie eine konkrete Mahlzeit, Marke oder ein Restaurant. Die Begründung bezieht sich auf das Ziel oder die Werte.
                - Liegt die Energie deutlich unter dem Ziel, nimm nichts weg. Setze avoid dann nur, wenn etwas durch etwas Besseres ersetzt werden soll, und sage das in der Begründung.
                - Liegen weniger als drei Tage vor, formuliere vorsichtig mit "bisher", weil das Bild noch unsicher ist.
                - Keine Datumsangaben und keine Wochentage. Einzelne Tage stehen schon im Raster der App.
                - Zeige eine Richtung, kein Urteil. Keine Vorwürfe und keine Wörter wie "trotz", "zu viel", "schlecht" oder "du warst drüber". Keine Ausrufezeichen.
                - Beispiele müssen zur Ernährungsweise im Profil passen. Orientiere dich an dem, was zuletzt gegessen wurde, nenne aber keine Fertiggerichte und kein Fast Food.
                - Ein Schritt darf kein anderes Makro verschlechtern. Liegt Fett schon nah am Ziel oder darüber, nenne keine besonders fettreichen Beispiele wie Nüsse oder Öle.
                - Keine Aussagen zu Vitaminen oder Mineralstoffen, keine medizinischen Ratschläge.

                Antworte NUR mit diesem JSON-Objekt. Der Inhalt zeigt nur das Format, übernimm ihn nicht:
                {
                  "summary": "Kernaussage",
                  "steps": ["Schritt", "Schritt"],
                  "avoid": null
                }
                """.formatted(profileContext, facts, recentMeals);

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-5")
                .maxTokens(1024L)
                .thinking(ThinkingConfigDisabled.builder().build())
                .system(systemPrompt)
                .addUserMessage("Erstelle den Fokus für die nächsten Tage.")
                .build();

        return requestJson(params, FocusAnalysis.class, "Fokus");
    }

    /** Die KI-Antwort ist nicht deterministisch, deshalb lohnt sich bei unlesbarem JSON ein zweiter Versuch. */
    private <T> T requestJson(MessageCreateParams params, Class<T> type, String label) {
        for (int attempt = 1; attempt <= JSON_ATTEMPTS; attempt++) {
            Message response = client.messages().create(params);

            if (response.stopReason().filter(StopReason.MAX_TOKENS::equals).isPresent()) {
                log.error("{}: Antwort bei max_tokens abgeschnitten – maxTokens erhöhen", label);
            }

            String content = response.content().stream()
                    .flatMap(b -> b.text().stream())
                    .map(TextBlock::text)
                    .findFirst()
                    .orElse("");
            try {
                return objectMapper.readValue(extractJsonObject(content), type);
            } catch (Exception e) {
                log.error("{}: Antwort konnte nicht geparst werden (Versuch {}): {}", label, attempt, content, e);
            }
        }
        throw new RuntimeException("AI-Antwort konnte nicht verarbeitet werden");
    }

    /** Schneidet das JSON-Objekt aus der Antwort, falls die KI Text oder Code-Fences drumherum schreibt. */
    static String extractJsonObject(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return start >= 0 && end > start ? raw.substring(start, end + 1) : raw;
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
                .model("claude-sonnet-5")
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
                .model("claude-sonnet-5")
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
