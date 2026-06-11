package com.fueld.insight;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import com.fueld.meal.MealLog;
import com.fueld.meal.MealLogRepository;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.user.User;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutLogRepository;
import com.fueld.insight.dto.InsightResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsightService {

    @Value("${app.claude.api-key:}")
    private String apiKey;

    private final AiInsightRepository insightRepository;
    private final MealLogRepository mealLogRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        client = apiKey.isBlank()
                ? AnthropicOkHttpClient.fromEnv()
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    public InsightResponse generate(User user, String type) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);

        boolean isDaily = "daily".equals(type);
        LocalDate periodStart = isDaily ? today : today.with(java.time.DayOfWeek.MONDAY);
        LocalDate periodEnd = today;

        Instant from = periodStart.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);
        List<WorkoutLog> workouts = workoutLogRepository
                .findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(user.getId(), from, to);

        String profileContext = profileRepository.findByUserId(user.getId())
                .map(this::formatProfile)
                .orElse("Kein Profil vorhanden.");

        String logSummary = buildLogSummary(meals, workouts, zone);
        String prompt = buildPrompt(isDaily, profileContext, periodStart, periodEnd, logSummary);

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-6")
                .maxTokens(1024L)
                .addUserMessage(prompt)
                .build();

        Message response = client.messages().create(params);
        String content = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        // Upsert: existing insight for same period overwrite
        AiInsight insight = insightRepository
                .findByUserIdAndTypeAndPeriodStart(user.getId(), type, periodStart)
                .orElse(AiInsight.builder().user(user).type(type).periodStart(periodStart).build());

        insight.setPeriodEnd(periodEnd);
        insight.setContent(content);
        insight.setCreatedAt(Instant.now());

        return toResponse(insightRepository.save(insight));
    }

    public InsightResponse regenerate(User user, UUID id) {
        AiInsight existing = insightRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!existing.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return generate(user, existing.getType());
    }

    public List<InsightResponse> getHistory(User user, String type) {
        List<AiInsight> insights = type != null
                ? insightRepository.findByUserIdAndTypeOrderByCreatedAtDesc(user.getId(), type)
                : insightRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return insights.stream().map(this::toResponse).toList();
    }

    private String buildPrompt(boolean isDaily, String profileContext,
                                LocalDate periodStart, LocalDate periodEnd, String logSummary) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        if (isDaily) {
            return """
                    Nutzerprofil:
                    %s

                    Einträge für heute (%s):
                    %s

                    Erstelle eine kurze, motivierende Tagesauswertung (2–3 Absätze):
                    1. Wie war der Tag ernährungstechnisch und sportlich?
                    2. Was lief gut, was könnte morgen besser sein?
                    3. Ein konkreter Tipp für morgen bezogen auf die Ziele.
                    Schreibe direkt und persönlich, ohne Überschriften.
                    """.formatted(profileContext, periodStart.format(fmt), logSummary);
        } else {
            return """
                    Nutzerprofil:
                    %s

                    Aktivitäten der Woche (%s bis %s):
                    %s

                    Erstelle eine motivierende wöchentliche Zusammenfassung (3–5 Absätze):
                    1. Was lief diese Woche gut?
                    2. Wo gibt es Verbesserungspotenzial?
                    3. Konkrete Empfehlungen für die nächste Woche bezogen auf die Ziele.
                    Schreibe direkt und persönlich, ohne Überschriften.
                    """.formatted(profileContext,
                    periodStart.format(fmt), periodEnd.format(fmt), logSummary);
        }
    }

    private String buildLogSummary(List<MealLog> meals, List<WorkoutLog> workouts, ZoneId zone) {
        if (meals.isEmpty() && workouts.isEmpty()) return "Keine Einträge in diesem Zeitraum.";

        StringBuilder sb = new StringBuilder();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM. HH:mm");

        if (!meals.isEmpty()) {
            sb.append("MAHLZEITEN (").append(meals.size()).append("):\n");
            for (MealLog m : meals) {
                sb.append("- ").append(m.getEatenAt().atZone(zone).format(fmt))
                        .append(": ").append(m.getTextInput());
                if (m.getCalories() != null) sb.append(" | ").append(m.getCalories()).append(" kcal");
                if (m.getProtein()  != null) sb.append(", ").append(m.getProtein()).append("g P");
                if (m.getCarbs()    != null) sb.append(", ").append(m.getCarbs()).append("g K");
                if (m.getFat()      != null) sb.append(", ").append(m.getFat()).append("g F");
                sb.append("\n");
            }
        }

        if (!workouts.isEmpty()) {
            sb.append("\nTRAININGS (").append(workouts.size()).append("):\n");
            for (WorkoutLog w : workouts) {
                sb.append("- ").append(w.getPerformedAt().atZone(zone).format(fmt))
                        .append(": ").append(w.getType());
                if (w.getDurationMinutes() != null) sb.append(", ").append(w.getDurationMinutes()).append(" min");
                if (w.getSummary() != null) sb.append(" | ").append(w.getSummary());
                sb.append("\n");
            }
        }
        return sb.toString();
    }

    private String formatProfile(Profile p) {
        StringBuilder sb = new StringBuilder();
        List<String> tags = profileService.deserializeGoalTags(p.getGoalTags());
        if (!tags.isEmpty()) sb.append("Ziele (ausgewählt): ").append(String.join(", ", tags)).append("\n");
        if (p.getGoals() != null) sb.append("Ziele (Freitext): ").append(p.getGoals()).append("\n");
        if (p.getDiet()  != null) sb.append("Ernährung: ").append(p.getDiet()).append("\n");
        if (p.getSports()!= null) sb.append("Sport: ").append(p.getSports()).append("\n");
        return sb.isEmpty() ? "Kein Profil vorhanden." : sb.toString();
    }

    private InsightResponse toResponse(AiInsight i) {
        return new InsightResponse(i.getId(), i.getType(), i.getPeriodStart(),
                i.getPeriodEnd(), i.getContent(), i.getCreatedAt());
    }
}
