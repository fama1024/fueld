package com.fueld.assistant;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import com.fueld.ai.LogContextFormatter;
import com.fueld.assistant.dto.AssistantAnswerResponse;
import com.fueld.assistant.dto.AssistantAskRequest;
import com.fueld.meal.MealLog;
import com.fueld.meal.MealLogRepository;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutLogRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Dashboard-Assistent: der Nutzer stellt eine Freitext-Frage, die KI beantwortet sie
 * auf Basis von Profil, Tageszielen und den Log-Einträgen von heute bzw. dieser Woche.
 * One-Shot – nichts wird gespeichert, es gibt keinen Gesprächsverlauf.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantService {

    @Value("${app.claude.api-key:}")
    private String apiKey;

    private final MealLogRepository mealLogRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final LogContextFormatter logContextFormatter;

    private static final int MAX_QUESTION_LENGTH = 1000;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        client = apiKey.isBlank()
                ? AnthropicOkHttpClient.fromEnv()
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    public AssistantAnswerResponse ask(User user, AssistantAskRequest request) {
        String question = request != null && request.question() != null ? request.question().trim() : "";
        if (question.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Frage darf nicht leer sein.");
        }
        if (question.length() > MAX_QUESTION_LENGTH) {
            question = question.substring(0, MAX_QUESTION_LENGTH);
        }

        boolean isWeek = request != null && "week".equals(request.scope());
        String scope = isWeek ? "week" : "today";

        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        LocalDate periodStart = isWeek ? today.with(DayOfWeek.MONDAY) : today;

        Instant from = periodStart.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);
        List<WorkoutLog> workouts = workoutLogRepository
                .findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(user.getId(), from, to);

        String profileContext = profileRepository.findByUserId(user.getId())
                .map(logContextFormatter::formatProfile)
                .orElse("Kein Profil vorhanden.");
        GoalsResponse goals = profileService.getGoals(user);
        String logSummary = logContextFormatter.buildLogSummary(meals, workouts, zone);

        String prompt = buildPrompt(isWeek, periodStart, today, profileContext, goals, logSummary, question);

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-5")
                .maxTokens(1024L)
                // Kein Thinking: Sonnet 5 denkt sonst per Default und frisst einen Teil
                // des Token-Budgets. Für eine kurze Textantwort nicht nötig.
                .thinking(ThinkingConfigDisabled.builder().build())
                .addUserMessage(prompt)
                .build();

        Message response = client.messages().create(params);
        String answer = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .map(String::trim)
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        return new AssistantAnswerResponse(answer, scope);
    }

    private String buildPrompt(boolean isWeek, LocalDate periodStart, LocalDate today,
                                String profileContext, GoalsResponse goals,
                                String logSummary, String question) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        String periodLabel = isWeek
                ? "Einträge diese Woche (" + periodStart.format(fmt) + " bis " + today.format(fmt) + ")"
                : "Einträge heute (" + today.format(fmt) + ")";

        return """
                Du bist der persönliche Ernährungs- und Fitness-Coach des Nutzers.
                Beantworte seine Frage kurz, konkret und auf Deutsch – gestützt auf die Daten unten.

                Nutzerprofil:
                %s

                Berechnete Tagesziele: %d kcal, %d g Protein, %d g Kohlenhydrate, %d g Fett.

                %s:
                %s

                Wichtig:
                - Die Kalorien- und Makrowerte sind grobe Schätzungen aus knappen Beschreibungen. Rechne nicht mit falscher Präzision, argumentiere in Tendenzen.
                - Reichen die Daten für eine seriöse Antwort nicht aus, sag das offen statt zu raten.
                - Keine Überschriften, 1–3 kurze Absätze, direkte Ansprache.

                Frage des Nutzers:
                %s
                """.formatted(profileContext,
                goals.calories(), goals.protein(), goals.carbs(), goals.fat(),
                periodLabel, logSummary, question);
    }
}
