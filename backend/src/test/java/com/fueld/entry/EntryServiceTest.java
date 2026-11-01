package com.fueld.entry;

import com.fueld.ai.AiService;
import com.fueld.ai.LogContextFormatter;
import com.fueld.entry.dto.EntryAnalysis;
import com.fueld.entry.dto.EntryConfirmRequest;
import com.fueld.entry.dto.EntryConfirmResponse;
import com.fueld.entry.dto.EntryDraft;
import com.fueld.entry.dto.EntryParseRequest;
import com.fueld.entry.dto.EntryParseResponse;
import com.fueld.meal.MealService;
import com.fueld.meal.dto.TodaySummaryResponse;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EntryServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 1);

    private AiService ai;
    private MealService meals;
    private WorkoutService workouts;
    private EntryService service;
    private User user;

    @BeforeEach
    void setUp() {
        ai = mock(AiService.class);
        meals = mock(MealService.class);
        workouts = mock(WorkoutService.class);
        ProfileRepository profiles = mock(ProfileRepository.class);
        ProfileService profileService = mock(ProfileService.class);
        service = new EntryService(ai, meals, workouts, profiles, profileService, mock(LogContextFormatter.class));
        user = User.builder().id(UUID.randomUUID()).email("me@fueld.test").build();

        when(profiles.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(profileService.getGoals(user)).thenReturn(mock(GoalsResponse.class));
        TodaySummaryResponse today = mock(TodaySummaryResponse.class);
        when(today.meals()).thenReturn(List.of());
        when(meals.getTodaySummary(user)).thenReturn(today);
        when(workouts.getTodayWorkouts(user)).thenReturn(List.of());
    }

    private static EntryDraft meal(String mealType, String date) {
        return new EntryDraft("meal", "Nudeln", date, "Nudeln", null, mealType,
                500, 20, 80, 10, null, "good", null, null, null, null, null);
    }

    private static EntryDraft workout(String type, String date) {
        return new EntryDraft("workout", "5 km gelaufen", date, "Lauf", null, null,
                null, null, null, null, null, null, type, 30, null, null, 400);
    }

    @Test
    void zukunftsdatum_wirdAufHeuteGesetzt() {
        assertThat(EntryService.sanitize(meal("lunch", "2026-11-05"), TODAY).date()).isEqualTo("2026-11-01");
    }

    @Test
    void vergangenesDatum_bleibtErhalten() {
        assertThat(EntryService.sanitize(meal("lunch", "2026-10-30"), TODAY).date()).isEqualTo("2026-10-30");
    }

    @Test
    void ungueltigesDatum_wirdZuHeute() {
        assertThat(EntryService.sanitize(meal("lunch", "gestern"), TODAY).date()).isEqualTo("2026-11-01");
        assertThat(EntryService.sanitize(meal("lunch", null), TODAY).date()).isEqualTo("2026-11-01");
    }

    @Test
    void unbekannterMahlzeitTyp_fuehrtZurRueckfrage() {
        assertThat(EntryService.sanitize(meal("brunch", "2026-11-01"), TODAY).mealType()).isNull();
    }

    @Test
    void unbekannteSportart_wirdZuOther() {
        assertThat(EntryService.sanitize(workout("yoga", "2026-11-01"), TODAY).workoutType()).isEqualTo("other");
    }

    @Test
    void unbekannteArt_wirdVerworfen() {
        EntryDraft unknown = new EntryDraft("note", "Hallo", null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null);
        assertThat(EntryService.sanitize(unknown, TODAY)).isNull();
    }

    @Test
    void parse_speichertNichts() {
        EntryAnalysis.Item item = new EntryAnalysis.Item("meal", "Nudeln", TODAY.toString(), "Nudeln", null, null,
                500, 20, 80, 10, null, "good", null, null, null, null, null);
        when(ai.parseEntries(anyString(), anyString(), anyString(), anyInt(), anyInt(), eq("Nudeln"), any()))
                .thenReturn(new EntryAnalysis(List.of(item), null));

        EntryParseResponse response = service.parse(user, new EntryParseRequest("Nudeln", null));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().mealType()).isNull();
        verify(meals, never()).saveParsed(any(), any());
        verify(workouts, never()).saveParsed(any(), any());
    }

    @Test
    void parse_ohneTreffer_gibtHinweisWeiter() {
        when(ai.parseEntries(anyString(), anyString(), anyString(), anyInt(), anyInt(), eq("Hallo"), any()))
                .thenReturn(new EntryAnalysis(null, "Das konnte ich nicht zuordnen."));

        EntryParseResponse response = service.parse(user, new EntryParseRequest("Hallo", null));

        assertThat(response.items()).isEmpty();
        assertThat(response.message()).isEqualTo("Das konnte ich nicht zuordnen.");
    }

    @Test
    void confirm_speichertMahlzeitenUndTrainings() {
        String today = LocalDate.now(ZoneId.of("Europe/Berlin")).toString();

        EntryConfirmResponse response = service.confirm(user, new EntryConfirmRequest(
                List.of(meal("breakfast", today), meal("lunch", today), workout("running", today))));

        assertThat(response.meals()).isEqualTo(2);
        assertThat(response.workouts()).isEqualTo(1);
        verify(meals, times(2)).saveParsed(eq(user), any());
        verify(workouts, times(1)).saveParsed(eq(user), any());
    }
}
