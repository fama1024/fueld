package com.fueld.focus;

import com.fueld.ai.AiService;
import com.fueld.ai.LogContextFormatter;
import com.fueld.focus.dto.FocusAnalysis;
import com.fueld.focus.dto.FocusItem;
import com.fueld.focus.dto.FocusResponse;
import com.fueld.insight.AiInsight;
import com.fueld.insight.AiInsightRepository;
import com.fueld.meal.MealLogRepository;
import com.fueld.meal.MealService;
import com.fueld.meal.dto.DayTotalResponse;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FocusServiceTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Europe/Berlin"));
    private static final FocusItem HINT = new FocusItem("more", "Etwas mehr Protein bietet sich an.", List.of("Tofu"));

    private final ObjectMapper mapper = JsonMapper.builder().build();
    private AiService ai;
    private AiInsightRepository insights;
    private MealService meals;
    private ProfileRepository profiles;
    private ProfileService profileService;
    private FocusService service;
    private User user;

    @BeforeEach
    void setUp() {
        ai = mock(AiService.class);
        insights = mock(AiInsightRepository.class);
        meals = mock(MealService.class);
        profiles = mock(ProfileRepository.class);
        profileService = mock(ProfileService.class);
        WorkoutService workouts = mock(WorkoutService.class);
        MealLogRepository mealLogs = mock(MealLogRepository.class);
        service = new FocusService(ai, insights, meals, mealLogs, workouts, profiles, profileService,
                mock(LogContextFormatter.class), mapper);
        user = User.builder().id(UUID.randomUUID()).email("me@fueld.test").build();

        when(profileService.getGoals(user)).thenReturn(new GoalsResponse(2000, 100, 200, 60, true));
        when(profileService.deserializeGoalTags("tags")).thenReturn(List.of("Muskelaufbau"));
        when(profiles.findByUserId(user.getId())).thenReturn(Optional.of(
                Profile.builder().goalTags("tags").diet("vegan").build()));
        when(insights.findByUserIdAndTypeAndPeriodStart(user.getId(), FocusService.TYPE, TODAY))
                .thenReturn(Optional.empty());
        when(meals.getTrend(user, 7)).thenReturn(List.of(
                new DayTotalResponse(TODAY.minusDays(1), 2000, 70, 200, 60)));
        when(ai.generateFocus(any(), anyString(), anyString())).thenReturn(new FocusAnalysis(List.of(HINT), null));
    }

    private AiInsight stored(Instant createdAt) {
        return AiInsight.builder().user(user).type(FocusService.TYPE).periodStart(TODAY).periodEnd(TODAY)
                .content(mapper.writeValueAsString(new FocusAnalysis(List.of(HINT), FocusService.PROMPT_VERSION))).createdAt(createdAt).build();
    }

    @Test
    void ersterAufruf_erstelltUndSpeichertDenFokus() {
        FocusResponse response = service.getFocus(user);

        assertThat(response.goal()).isEqualTo("Muskelaufbau");
        assertThat(response.diet()).isEqualTo("vegan");
        assertThat(response.items()).containsExactly(HINT);
        ArgumentCaptor<AiInsight> saved = ArgumentCaptor.forClass(AiInsight.class);
        verify(insights).save(saved.capture());
        assertThat(saved.getValue().getType()).isEqualTo("focus");
        assertThat(saved.getValue().getContent()).contains("Tofu");
    }

    @Test
    void gerechneteWerte_gehenAnDieKi() {
        service.getFocus(user);

        ArgumentCaptor<String> facts = ArgumentCaptor.forClass(String.class);
        verify(ai).generateFocus(any(), facts.capture(), anyString());
        assertThat(facts.getValue()).contains("Protein 70 %").contains("Kalorien 100 %");
    }

    @Test
    void gespeicherterFokus_brauchtKeineKi() {
        when(insights.findByUserIdAndTypeAndPeriodStart(user.getId(), FocusService.TYPE, TODAY))
                .thenReturn(Optional.of(stored(Instant.now())));

        assertThat(service.getFocus(user).items()).containsExactly(HINT);
        verify(ai, never()).generateFocus(any(), anyString(), anyString());
    }

    @Test
    void geaendertesProfil_erstelltDenFokusNeu() {
        when(insights.findByUserIdAndTypeAndPeriodStart(user.getId(), FocusService.TYPE, TODAY))
                .thenReturn(Optional.of(stored(Instant.now().minusSeconds(60))));
        when(profiles.findByUserId(user.getId())).thenReturn(Optional.of(
                Profile.builder().goalTags("tags").updatedAt(Instant.now()).build()));

        service.getFocus(user);

        verify(ai).generateFocus(any(), anyString(), anyString());
    }

    @Test
    void aeltererPrompt_erstelltDenFokusNeu() {
        AiInsight old = stored(Instant.now());
        old.setContent(mapper.writeValueAsString(new FocusAnalysis(List.of(HINT), null)));
        when(insights.findByUserIdAndTypeAndPeriodStart(user.getId(), FocusService.TYPE, TODAY))
                .thenReturn(Optional.of(old));

        service.getFocus(user);

        verify(ai).generateFocus(any(), anyString(), anyString());
        assertThat(old.getContent()).contains("\"version\":" + FocusService.PROMPT_VERSION);
    }

    @Test
    void ohneAbgeschlosseneTage_gibtEsKeinenKiAufruf() {
        when(meals.getTrend(user, 7)).thenReturn(List.of(
                new DayTotalResponse(TODAY, 500, 20, 50, 10),
                new DayTotalResponse(TODAY.minusDays(1), 0, 0, 0, 0)));

        assertThat(service.getFocus(user).items()).isEmpty();
        verify(ai, never()).generateFocus(any(), anyString(), anyString());
    }

    @Test
    void kiFehler_liefertLeereListeUndSpeichertNichts() {
        when(ai.generateFocus(any(), anyString(), anyString())).thenThrow(new RuntimeException("kaputt"));

        FocusResponse response = service.getFocus(user);

        assertThat(response.items()).isEmpty();
        assertThat(response.goal()).isEqualTo("Muskelaufbau");
        verify(insights, never()).save(any());
    }

    @Test
    void sanitize_begrenztMengenUndVerwirftUnbrauchbares() {
        List<FocusItem> items = FocusService.sanitize(Arrays.asList(
                null,
                new FocusItem("sideways", "Unbekannte Richtung", null),
                new FocusItem("more", "  ", null),
                new FocusItem("more", " Eins ", List.of("A", "B", "C", "D")),
                new FocusItem("less", "Zwei", null),
                new FocusItem("ok", "Drei", null)));

        assertThat(items).hasSize(2);
        assertThat(items.getFirst().text()).isEqualTo("Eins");
        assertThat(items.getFirst().foods()).hasSize(3);
        assertThat(items.get(1).foods()).isEmpty();
    }

    @Test
    void leereKiAntwort_wirdNichtGespeichert() {
        when(ai.generateFocus(any(), anyString(), anyString())).thenReturn(new FocusAnalysis(null, null));

        assertThat(service.getFocus(user).items()).isEmpty();
        verify(insights, never()).save(any());
    }

    @Test
    void ohneProfil_bleibenZielUndErnaehrungLeer() {
        when(profiles.findByUserId(eq(user.getId()))).thenReturn(Optional.empty());

        FocusResponse response = service.getFocus(user);

        assertThat(response.goal()).isNull();
        assertThat(response.diet()).isNull();
        assertThat(response.items()).containsExactly(HINT);
    }
}
