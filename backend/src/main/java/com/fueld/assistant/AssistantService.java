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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Dashboard-Assistent: der Nutzer stellt eine Freitext-Frage, die KI beantwortet sie
 * auf Basis von Profil, Tageszielen und den Log-Einträgen entweder nur des gewählten
 * Tages ({@code scope=today}) oder der 7 Tage bis einschließlich des gewählten Tages
 * ({@code scope=range7}) – der gewählte Tag ist der Tag aus der Dashboard
 * Tage-Navigation, per Toggle in der Nachfragen-Karte unabhängig vom Heute/Woche-Tab
 * der Nährstoff-Ringe wählbar. Frage + Antwort werden als Chatverlauf pro
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
            - Das Nutzerprofil zeigt allgemeine Vorlieben (z.B. bevorzugte Sportarten) – das ist KEINE Aussage darüber, was im gefragten Zeitraum tatsächlich passiert ist. Nur die aufgelisteten Log-Einträge sind tatsächliche Aktivität. Erfinde keine Mahlzeiten oder Trainings, die dort nicht stehen.
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

        boolean isRange7 = request != null && "range7".equals(request.scope());
        String scope = isRange7 ? "range7" : "today";

        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        LocalDate askedDate = (request != null && request.date() != null && !request.date().isBlank())
                ? LocalDate.parse(request.date())
                : today;
        LocalDate periodEnd = askedDate;
        LocalDate periodStart = isRange7 ? askedDate.minusDays(6) : askedDate;
        // Thread-Schlüssel: der gewählte Tag – scope unterscheidet "nur dieser Tag" von "7 Tage bis hier".
        LocalDate periodDate = askedDate;

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

        String turnPrompt = buildTurnPrompt(isRange7, periodStart, periodEnd, profileContext, goals, logSummary, question);

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
        boolean isRange7 = "range7".equals(scope);
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        LocalDate periodDate = (date != null && !date.isBlank()) ? LocalDate.parse(date) : today;

        return assistantMessageRepository
                .findByUserIdAndScopeAndPeriodDateOrderByCreatedAtAsc(user.getId(), isRange7 ? "range7" : "today", periodDate)
                .stream()
                .map(m -> new AssistantMessageResponse(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .toList();
    }

    private String buildTurnPrompt(boolean isRange7, LocalDate periodStart, LocalDate periodEnd,
                                    String profileContext, GoalsResponse goals,
                                    String logSummary, String question) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        String periodLabel = isRange7
                ? "Einträge der letzten 7 Tage bis einschließlich " + periodEnd.format(fmt) + " (" + periodStart.format(fmt) + " bis " + periodEnd.format(fmt) + ")"
                : "Einträge am " + periodEnd.format(fmt);

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
