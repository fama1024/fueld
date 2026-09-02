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
import com.fueld.weight.WeightLog;
import com.fueld.weight.WeightLogRepository;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutLogRepository;
import com.fueld.workout.WorkoutMetric;
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

        String prompt;
        if (isDaily) {
            prompt = buildDailyPrompt(profileContext, periodStart, logSummary);
        } else {
            // Kontext für den Mehrwochen-Trend: vorherige Wochen-Auswertungen
            List<AiInsight> priorWeeklies = insightRepository
                    .findTop4ByUserIdAndTypeAndPeriodStartLessThanOrderByPeriodStartDesc(
                            user.getId(), "weekly", periodStart);
            // Waage-Messungen der letzten ~6 Wochen als gemessene Ground Truth
            Instant weightFrom = periodStart.minusWeeks(6).atStartOfDay(zone).toInstant();
            List<WeightLog> weights = weightLogRepository
                    .findByUserIdAndLoggedAtBetweenOrderByLoggedAtDesc(user.getId(), weightFrom, to);

            prompt = buildWeeklyPrompt(profileContext, periodStart, periodEnd, logSummary,
                    buildWeightSummary(weights, periodStart, zone),
                    buildPriorInsightsSummary(priorWeeklies));
        }

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

    private String buildDailyPrompt(String profileContext, LocalDate periodStart, String logSummary) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
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
    }

    private String buildWeeklyPrompt(String profileContext, LocalDate periodStart, LocalDate periodEnd,
                                     String logSummary, String weightSummary, String priorInsights) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        return """
                Nutzerprofil:
                %s

                Aktivitäten der Woche (%s bis %s):
                %s

                Körperzusammensetzung (Waage-Messungen der letzten Wochen, gemessene Werte):
                %s

                Deine vorherigen Wochen-Auswertungen (älteste zuerst):
                %s

                Erstelle eine motivierende wöchentliche Zusammenfassung (3–5 Absätze):
                1. Was lief diese Woche gut?
                2. Wo gibt es Verbesserungspotenzial?
                3. Konkrete Empfehlungen für die nächste Woche bezogen auf die Ziele.

                Wichtig:
                - Die Kalorien-/Makrowerte der Mahlzeiten sind grobe Schätzungen aus knappen Beschreibungen. Die Waage-Messungen (Gewicht, Körperfett, Muskelmasse) sind gemessene Werte – gewichte sie bei der Beurteilung des Fortschritts stärker als die geschätzten Makros.
                - Nutze die vorherigen Wochen-Auswertungen, um einen echten Mehrwochen-Trend zu benennen (z. B. "Protein über die letzten 3 Wochen steigend", "Gewicht seit 4 Wochen stabil"), statt die Woche isoliert zu bewerten.
                Schreibe direkt und persönlich, ohne Überschriften.
                """.formatted(profileContext, periodStart.format(fmt), periodEnd.format(fmt),
                logSummary, weightSummary, priorInsights);
    }

    private String buildWeightSummary(List<WeightLog> weights, LocalDate periodStart, ZoneId zone) {
        if (weights.isEmpty()) return "Keine Waage-Messungen in den letzten Wochen.";

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        List<WeightLog> recent = weights.stream().limit(10).toList();

        StringBuilder sb = new StringBuilder();
        // chronologisch (älteste zuerst), damit der Trend lesbar ist
        for (int i = recent.size() - 1; i >= 0; i--) {
            WeightLog w = recent.get(i);
            LocalDate day = w.getLoggedAt().atZone(zone).toLocalDate();
            sb.append("- ").append(day.format(fmt))
                    .append(day.isBefore(periodStart) ? "" : " (diese Woche)")
                    .append(": ").append(w.getWeight()).append(" kg");
            if (w.getBodyFatPct()    != null) sb.append(", Körperfett ").append(w.getBodyFatPct()).append(" %");
            if (w.getMuscleMassPct() != null) sb.append(", Muskelmasse ").append(w.getMuscleMassPct()).append(" %");
            if (w.getWaterPct()      != null) sb.append(", Wasser ").append(w.getWaterPct()).append(" %");
            if (w.getBmi()           != null) sb.append(", BMI ").append(w.getBmi());
            sb.append("\n");
        }
        return sb.toString();
    }

    private String buildPriorInsightsSummary(List<AiInsight> priorWeeklies) {
        if (priorWeeklies.isEmpty()) return "Noch keine früheren Wochen-Auswertungen vorhanden.";

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        StringBuilder sb = new StringBuilder();
        // Repository liefert neueste zuerst -> rückwärts iterieren für chronologische Reihenfolge
        for (int i = priorWeeklies.size() - 1; i >= 0; i--) {
            AiInsight ins = priorWeeklies.get(i);
            String content = ins.getContent().strip();
            if (content.length() > 800) content = content.substring(0, 800) + " …";
            sb.append("Woche ab ").append(ins.getPeriodStart().format(fmt)).append(":\n")
                    .append(content).append("\n\n");
        }
        return sb.toString().strip();
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
                WorkoutMetric metric = w.getMetric();
                if (metric != null) {
                    if (metric.getDistanceKm() != null) sb.append(", ").append(metric.getDistanceKm()).append(" km");
                    if (metric.getPacePerKm() != null) sb.append(", ").append(metric.getPacePerKm()).append(" min/km");
                    if (metric.getAvgHeartRate() != null) sb.append(", ⌀ ").append(metric.getAvgHeartRate()).append(" bpm");
                    if (metric.getCaloriesBurned() != null) sb.append(", ").append(metric.getCaloriesBurned()).append(" kcal");
                }
                if (w.getSummary() != null) sb.append(" | ").append(w.getSummary());
                if (w.getNotes() != null && !w.getNotes().isBlank()) sb.append(" | Notiz: ").append(w.getNotes());
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
