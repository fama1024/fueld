package com.fueld.pantry;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.fueld.meal.MealLogRepository;
import com.fueld.meal.dto.TodaySummaryResponse;
import com.fueld.meal.MealLog;
import com.fueld.pantry.dto.*;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PantryService {

    @Value("${app.claude.api-key:}")
    private String apiKey;

    private final PantryItemRepository pantryItemRepository;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final MealLogRepository mealLogRepository;
    private final ObjectMapper objectMapper;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        client = apiKey.isBlank()
                ? AnthropicOkHttpClient.fromEnv()
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    public List<PantryItemResponse> getItems(User user) {
        return pantryItemRepository.findByUserIdOrderByAddedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public List<PantryItemResponse> addItems(User user, PantryAddRequest request) {
        List<PantryItem> saved = new ArrayList<>();
        for (PantryAddRequest.PantryItemDto dto : request.items()) {
            if (dto.name() == null || dto.name().isBlank()) continue;
            PantryItem item = PantryItem.builder()
                    .user(user)
                    .name(dto.name().trim())
                    .quantity(dto.quantity() != null && !dto.quantity().isBlank() ? dto.quantity().trim() : null)
                    .caloriesPer100g(dto.caloriesPer100g())
                    .proteinPer100g(dto.proteinPer100g())
                    .carbsPer100g(dto.carbsPer100g())
                    .fatPer100g(dto.fatPer100g())
                    .build();
            saved.add(pantryItemRepository.save(item));
        }
        return saved.stream().map(this::toResponse).toList();
    }

    public void deleteItem(User user, UUID id) {
        PantryItem item = pantryItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!item.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        pantryItemRepository.delete(item);
    }

    public List<com.fueld.pantry.dto.PantryExtractedItem> extractFromPhoto(PantryExtractRequest request) {
        Base64ImageSource.MediaType mediaType = resolveMediaType(request.mediaType());

        List<ContentBlockParam> content = new ArrayList<>();
        content.add(ContentBlockParam.ofImage(
                ImageBlockParam.builder()
                        .source(ImageBlockParam.Source.ofBase64(
                                Base64ImageSource.builder()
                                        .mediaType(mediaType)
                                        .data(request.data())
                                        .build()))
                        .build()));
        content.add(ContentBlockParam.ofText(TextBlockParam.builder()
                .text("""
                      Analysiere dieses Foto und liste alle erkennbaren Lebensmittel auf.
                      Falls ein Produkt-Etikett mit Nährwerten sichtbar ist, verwende diese exakten Werte.
                      Für bekannte Lebensmittel ohne sichtbares Etikett: schätze typische Durchschnittswerte.
                      Antworte NUR mit diesem validen JSON-Objekt ohne Markdown:
                      {"items":[{"name":"Kichererbsen","quantity":"400g Dose","calories_per_100g":164,"protein_per_100g":8.9,"carbs_per_100g":27.4,"fat_per_100g":2.6}]}
                      Fehlende Nährwerte als null. Nährwerte immer pro 100g.
                      """)
                .build()));

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-6")
                .maxTokens(1024L)
                .addUserMessageOfBlockParams(content)
                .build();

        Message response = client.messages().create(params);
        String raw = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElse("{\"items\":[]}");

        String cleaned = raw.trim()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .trim();
        try {
            var wrapper = objectMapper.readValue(cleaned,
                    new TypeReference<java.util.Map<String, List<com.fueld.pantry.dto.PantryExtractedItem>>>() {});
            return wrapper.getOrDefault("items", Collections.emptyList());
        } catch (Exception e) {
            log.error("Pantry-Extraktion konnte nicht geparst werden: {}", raw, e);
            return Collections.emptyList();
        }
    }

    public PantryAnalysisResponse analyze(User user, String note) {
        List<PantryItem> items = pantryItemRepository.findByUserIdOrderByAddedAtDesc(user.getId());
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vorrat ist leer");
        }

        String profileContext = profileRepository.findByUserId(user.getId())
                .map(this::formatProfile)
                .orElse("Kein Profil vorhanden.");

        GoalsResponse goals = profileService.getGoals(user);
        TodaySummaryResponse today = getTodaySummary(user);

        StringBuilder pantryList = new StringBuilder();
        for (PantryItem item : items) {
            pantryList.append("- ").append(item.getName());
            if (item.getQuantity() != null) pantryList.append(" (").append(item.getQuantity()).append(")");
            pantryList.append("\n");
        }

        String noteSection = (note != null && !note.isBlank())
                ? "\nBesonderer Hinweis vom Nutzer: " + note.trim() + "\n"
                : "";

        String prompt = """
                Nutzerprofil:
                %s

                Heutiger Makrostand (vor dieser Analyse):
                Kalorien: %d / %d kcal | Protein: %d / %d g | Kohlenhydrate: %d / %d g | Fett: %d / %d g
                %s
                Aktueller Vorrat:
                %s
                Analysiere den Vorrat und antworte NUR mit diesem validen JSON-Objekt (kein Markdown):
                {
                  "ingredient_ratings": [
                    { "name": "Kichererbsen", "stars": 3, "reason": "..." }
                  ],
                  "recipes": [
                    {
                      "name": "...",
                      "ingredients": ["..."],
                      "steps": "...",
                      "calories": 420,
                      "protein": 28,
                      "carbs": 45,
                      "fat": 12,
                      "goal_fit": "..."
                    }
                  ]
                }
                Bewerte jede Zutat mit 1–3 Sternen bezogen auf aktuelle Ziele, Makrolücken und den Hinweis des Nutzers.
                Schlage 2–3 Rezepte vor, die nur Zutaten aus dem Vorrat verwenden und auf den Hinweis eingehen.
                """.formatted(
                profileContext,
                today.totalCalories(), goals.calories(),
                today.totalProtein(), goals.protein(),
                today.totalCarbs(), goals.carbs(),
                today.totalFat(), goals.fat(),
                noteSection,
                pantryList);

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-6")
                .maxTokens(2048L)
                .addUserMessage(prompt)
                .build();

        Message response = client.messages().create(params);
        String raw = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        String cleaned = raw.trim()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .trim();
        try {
            AiPantryResult ai = objectMapper.readValue(cleaned, AiPantryResult.class);
            return toAnalysisResponse(ai);
        } catch (Exception e) {
            log.error("Pantry-Analyse konnte nicht geparst werden: {}", raw, e);
            throw new RuntimeException("AI-Antwort konnte nicht verarbeitet werden");
        }
    }

    private PantryAnalysisResponse toAnalysisResponse(AiPantryResult ai) {
        List<PantryAnalysisResponse.IngredientRating> ratings = ai.ingredientRatings() == null
                ? Collections.emptyList()
                : ai.ingredientRatings().stream()
                        .map(r -> new PantryAnalysisResponse.IngredientRating(r.name(), r.stars(), r.reason()))
                        .toList();
        List<PantryAnalysisResponse.Recipe> recipes = ai.recipes() == null
                ? Collections.emptyList()
                : ai.recipes().stream()
                        .map(r -> new PantryAnalysisResponse.Recipe(
                                r.name(), r.ingredients(), r.steps(),
                                r.calories(), r.protein(), r.carbs(), r.fat(), r.goalFit()))
                        .toList();
        return new PantryAnalysisResponse(ratings, recipes);
    }

    // Internal record for parsing AI response (snake_case from Claude)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    private record AiPantryResult(
            @com.fasterxml.jackson.annotation.JsonProperty("ingredient_ratings")
            List<AiIngredientRating> ingredientRatings,
            List<AiRecipe> recipes
    ) {
        @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
        record AiIngredientRating(String name, int stars, String reason) {}

        @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
        record AiRecipe(
                String name,
                List<String> ingredients,
                String steps,
                Integer calories,
                Integer protein,
                Integer carbs,
                Integer fat,
                @com.fasterxml.jackson.annotation.JsonProperty("goal_fit") String goalFit
        ) {}
    }

    private TodaySummaryResponse getTodaySummary(User user) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        Instant from = today.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);

        int calories = meals.stream().mapToInt(m -> m.getCalories() != null ? m.getCalories() : 0).sum();
        int protein  = meals.stream().mapToInt(m -> m.getProtein()  != null ? m.getProtein()  : 0).sum();
        int carbs    = meals.stream().mapToInt(m -> m.getCarbs()    != null ? m.getCarbs()    : 0).sum();
        int fat      = meals.stream().mapToInt(m -> m.getFat()      != null ? m.getFat()      : 0).sum();

        return new TodaySummaryResponse(calories, protein, carbs, fat, Collections.emptyList());
    }

    private String formatProfile(Profile p) {
        StringBuilder sb = new StringBuilder();
        List<String> tags = profileService.deserializeGoalTags(p.getGoalTags());
        if (!tags.isEmpty()) sb.append("Ziele: ").append(String.join(", ", tags)).append("\n");
        if (p.getGoals()    != null) sb.append("Ziele (Freitext): ").append(p.getGoals()).append("\n");
        if (p.getDiet()     != null) sb.append("Ernährung: ").append(p.getDiet()).append("\n");
        if (p.getSports()   != null) sb.append("Sport: ").append(p.getSports()).append("\n");
        if (p.getBodyWeight() != null) sb.append("Gewicht: ").append(p.getBodyWeight()).append(" kg\n");
        return sb.isEmpty() ? "Kein Profil vorhanden." : sb.toString();
    }

    private PantryItemResponse toResponse(PantryItem item) {
        return new PantryItemResponse(item.getId(), item.getName(), item.getQuantity(),
                item.getCaloriesPer100g(), item.getProteinPer100g(), item.getCarbsPer100g(), item.getFatPer100g(),
                item.getAddedAt());
    }

    private Base64ImageSource.MediaType resolveMediaType(String mime) {
        if (mime == null) return Base64ImageSource.MediaType.IMAGE_JPEG;
        return switch (mime.toLowerCase()) {
            case "image/png"  -> Base64ImageSource.MediaType.IMAGE_PNG;
            case "image/gif"  -> Base64ImageSource.MediaType.IMAGE_GIF;
            case "image/webp" -> Base64ImageSource.MediaType.IMAGE_WEBP;
            default           -> Base64ImageSource.MediaType.IMAGE_JPEG;
        };
    }
}
