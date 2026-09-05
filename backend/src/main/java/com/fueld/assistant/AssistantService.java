package com.fueld.assistant;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import com.fueld.ai.LogContextFormatter;
import com.fueld.assistant.dto.AssistantAnswerResponse;
import com.fueld.assistant.dto.AssistantAskRequest;
import com.fueld.assistant.dto.AssistantMessageResponse;
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
 * auf Basis von Profil, Tageszielen und den Log-Einträgen von heute (bzw. einem
 * gewählten Tag) oder dieser Woche. Frage + Antwort werden als Chatverlauf pro
 * scope+periodDate-Thread gespeichert (siehe {@code AssistantMessage}); Folgefragen
 * im selben Thread bekommen den bisherigen Verlauf als Konversationskontext.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantService {

    @Value("${app.claude.api-key:}")
    private String apiKey;

    private final AssistantMessageRepository assistantMessageRepository;
    private final MealLogRepository mealLogRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final LogContextFormatter logContextFormatter;

    private static final int MAX_QUESTION_LENGTH = 1000;
    /** So viele vorherige Nachrichten aus dem Thread gehen max. als Konversationskontext an Claude. */
    private static final int MAX_HISTORY_MESSAGES = 20;

    private static final String SYSTEM_PROMPT = """
            Du bist der persönliche Ernährungs- und Fitness-Coach des Nutzers in der App Fueld.
            Beantworte seine Fragen kurz, konkret und auf Deutsch – gestützt auf die Daten, die
            dir mit der Nutzernachricht mitgegeben werden.
            Wichtig:
            - Die Kalorien- und Makrowerte sind grobe Schätzungen aus knappen Beschreibungen. Rechne nicht mit falscher Präzision, argumentiere in Tendenzen.
            - Reichen die Daten für eine seriöse Antwort nicht aus, sag das offen statt zu raten.
            - Keine Überschriften, 1–3 kurze Absätze, direkte Ansprache.
            """;

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
        LocalDate askedDate = (!isWeek && request != null && request.date() != null && !request.date().isBlank())
                ? LocalDate.parse(request.date())
                : today;
        LocalDate periodStart = isWeek ? today.with(DayOfWeek.MONDAY) : askedDate;
        LocalDate periodEnd = isWeek ? today : askedDate;
        // Thread-Schlüssel: bei "today" der gefragte Tag, bei "week" immer der Montag der aktuellen Woche.
        LocalDate periodDate = periodStart;

        Instant from = periodStart.atStartOfDay(zone).toInstant();
        Instant to = periodEnd.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);
        List<WorkoutLog> workouts = workoutLogRepository
                .findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(user.getId(), from, to);

        String profileContext = profileRepository.findByUserId(user.getId())
                .map(logContextFormatter::formatProfile)
                .orElse("Kein Profil vorhanden.");
        GoalsResponse goals = profileService.getGoals(user);
        String logSummary = logContextFormatter.buildLogSummary(meals, workouts, zone);

        List<AssistantMessage> history = assistantMessageRepository
                .findByUserIdAndScopeAndPeriodDateOrderByCreatedAtAsc(user.getId(), scope, periodDate);
        List<AssistantMessage> recentHistory = history.size() > MAX_HISTORY_MESSAGES
                ? history.subList(history.size() - MAX_HISTORY_MESSAGES, history.size())
                : history;

        String turnPrompt = buildTurnPrompt(isWeek, periodStart, periodEnd, profileContext, goals, logSummary, question);

        MessageCreateParams.Builder paramsBuilder = MessageCreateParams.builder()
                .model("claude-sonnet-5")
                .maxTokens(1024L)
                // Kein Thinking: Sonnet 5 denkt sonst per Default und frisst einen Teil
                // des Token-Budgets. Für eine kurze Textantwort nicht nötig.
                .thinking(ThinkingConfigDisabled.builder().build())
                .system(SYSTEM_PROMPT);

        for (AssistantMessage m : recentHistory) {
            if ("assistant".equals(m.getRole())) {
                paramsBuilder.addAssistantMessage(m.getContent());
            } else {
                paramsBuilder.addUserMessage(m.getContent());
            }
        }
        paramsBuilder.addUserMessage(turnPrompt);

        Message response = client.messages().create(paramsBuilder.build());
        String answer = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .map(String::trim)
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        assistantMessageRepository.save(AssistantMessage.builder()
                .user(user).scope(scope).periodDate(periodDate).role("user").content(question).build());
        assistantMessageRepository.save(AssistantMessage.builder()
                .user(user).scope(scope).periodDate(periodDate).role("assistant").content(answer).build());

        return new AssistantAnswerResponse(answer, scope, periodDate);
    }

    public List<AssistantMessageResponse> getMessages(User user, String scope, String date) {
        boolean isWeek = "week".equals(scope);
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        LocalDate askedDate = (!isWeek && date != null && !date.isBlank()) ? LocalDate.parse(date) : today;
        LocalDate periodDate = isWeek ? today.with(DayOfWeek.MONDAY) : askedDate;

        return assistantMessageRepository
                .findByUserIdAndScopeAndPeriodDateOrderByCreatedAtAsc(user.getId(), isWeek ? "week" : "today", periodDate)
                .stream()
                .map(m -> new AssistantMessageResponse(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .toList();
    }

    private String buildTurnPrompt(boolean isWeek, LocalDate periodStart, LocalDate periodEnd,
                                    String profileContext, GoalsResponse goals,
                                    String logSummary, String question) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        String periodLabel = isWeek
                ? "Einträge diese Woche (" + periodStart.format(fmt) + " bis " + periodEnd.format(fmt) + ")"
                : "Einträge am " + periodStart.format(fmt);

        return """
                Aktueller Kontext:

                Nutzerprofil:
                %s

                Berechnete Tagesziele: %d kcal, %d g Protein, %d g Kohlenhydrate, %d g Fett.

                %s:
                %s

                Frage des Nutzers:
                %s
                """.formatted(profileContext,
                goals.calories(), goals.protein(), goals.carbs(), goals.fat(),
                periodLabel, logSummary, question);
    }
}
