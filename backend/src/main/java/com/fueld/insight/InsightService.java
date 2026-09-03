package com.fueld.insight;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import com.fueld.ai.LogContextFormatter;
import com.fueld.meal.MealLog;
import com.fueld.meal.MealLogRepository;
import com.fueld.profile.ProfileRepository;
import com.fueld.user.User;
import com.fueld.weight.WeightLog;
import com.fueld.weight.WeightLogRepository;
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
    private final WeightLogRepository weightLogRepository;
    private final ProfileRepository profileRepository;
    private final LogContextFormatter logContextFormatter;

    /** So viele vorherige Wochenrückblicke fließen als Trend-Kontext in den weekly-Prompt. */
    private static final int PRIOR_WEEKLY_INSIGHTS = 4;

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
                .map(logContextFormatter::formatProfile)
                .orElse("Kein Profil vorhanden.");

        String logSummary = logContextFormatter.buildLogSummary(meals, workouts, zone);

        // Wöchentlich zusätzlich: Körperzusammensetzung als Ground Truth + vorherige
        // Wochenrückblicke, damit die KI echte Mehrwochen-Trends erkennt statt isoliert
        // pro Woche zu bewerten.
        String weightContext = "";
        String priorWeeklyContext = "";
        if (!isDaily) {
            weightContext = buildWeightSummary(
                    weightLogRepository.findByUserIdOrderByLoggedAtDesc(user.getId())
                            .stream().limit(8).toList(), zone);
            priorWeeklyContext = buildPriorWeeklyContext(
                    insightRepository.findByUserIdAndTypeAndPeriodStartBeforeOrderByPeriodStartDesc(
                                    user.getId(), "weekly", periodStart)
                            .stream().limit(PRIOR_WEEKLY_INSIGHTS).toList());
        }

        String prompt = buildPrompt(isDaily, profileContext, periodStart, periodEnd,
                logSummary, weightContext, priorWeeklyContext);

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-6")
                .maxTokens(isDaily ? 1024L : 1536L)
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
                                LocalDate periodStart, LocalDate periodEnd, String logSummary,
                                String weightContext, String priorWeeklyContext) {
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

                    Körperzusammensetzung (gemessen, älteste zuerst):
                    %s

                    Vorherige Wochenrückblicke (älteste zuerst), nur als Referenz für Mehrwochen-Trends:
                    %s

                    Erstelle eine motivierende wöchentliche Zusammenfassung (3–5 Absätze):
                    1. Was lief diese Woche gut?
                    2. Wo gibt es Verbesserungspotenzial?
                    3. Vergleiche Protein, Kalorien und Trainingsumfang mit den letzten Wochen (siehe vorherige Rückblicke) – benenne echte Trends (steigend / fallend / stabil), nicht nur diese Woche isoliert.
                    4. Konkrete Empfehlungen für die nächste Woche bezogen auf die Ziele.

                    Die Körperzusammensetzung ist gemessene Ground Truth – gewichte sie stärker als die geschätzten Tages-Makros, wenn beide sich widersprechen.
                    Schreibe direkt und persönlich, ohne Überschriften.
                    """.formatted(profileContext,
                    periodStart.format(fmt), periodEnd.format(fmt), logSummary,
                    weightContext, priorWeeklyContext);
        }
    }

    private String buildWeightSummary(List<WeightLog> logs, ZoneId zone) {
        if (logs.isEmpty()) return "Keine Messungen vorhanden.";
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        StringBuilder sb = new StringBuilder();
        for (WeightLog w : logs.reversed()) {   // Repository liefert neueste zuerst
            sb.append("- ").append(w.getLoggedAt().atZone(zone).format(fmt))
                    .append(": ").append(w.getWeight()).append(" kg");
            if (w.getBodyFatPct()    != null) sb.append(", KFA ").append(w.getBodyFatPct()).append("%");
            if (w.getMuscleMassPct() != null) sb.append(", Muskelmasse ").append(w.getMuscleMassPct()).append("%");
            if (w.getWaterPct()      != null) sb.append(", Wasser ").append(w.getWaterPct()).append("%");
            sb.append("\n");
        }
        return sb.toString();
    }

    private String buildPriorWeeklyContext(List<AiInsight> priorWeeklies) {
        if (priorWeeklies.isEmpty()) return "Keine vorherigen Wochenrückblicke vorhanden.";
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        StringBuilder sb = new StringBuilder();
        for (AiInsight i : priorWeeklies.reversed()) {   // Repository liefert neueste zuerst
            sb.append("Woche ab ").append(i.getPeriodStart().format(fmt)).append(":\n");
            String c = i.getContent();
            sb.append(c.length() > 700 ? c.substring(0, 700) + "…" : c).append("\n\n");
        }
        return sb.toString();
    }

    private InsightResponse toResponse(AiInsight i) {
        return new InsightResponse(i.getId(), i.getType(), i.getPeriodStart(),
                i.getPeriodEnd(), i.getContent(), i.getCreatedAt());
    }
}
