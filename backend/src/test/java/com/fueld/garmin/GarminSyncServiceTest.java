package com.fueld.garmin;

import com.fueld.garmin.dto.GarminSyncResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutLogRepository;
import com.fueld.workout.WorkoutMetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GarminSyncServiceTest {

    private static final int PAGE_SIZE = 50;
    private static final DateTimeFormatter GMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC);

    private GarminClient client;
    private WorkoutLogRepository workoutRepo;
    private GarminSyncService service;
    private User user;

    @BeforeEach
    void setUp() {
        client = mock(GarminClient.class);
        workoutRepo = mock(WorkoutLogRepository.class);
        WorkoutMetricRepository metricRepo = mock(WorkoutMetricRepository.class);
        service = new GarminSyncService(client, workoutRepo, metricRepo, "me@fueld.test");
        user = User.builder().id(UUID.randomUUID()).email("me@fueld.test").build();

        when(workoutRepo.save(any(WorkoutLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workoutRepo.findGarminActivityIdsByUserId(user.getId())).thenReturn(Set.of());
    }

    @Test
    void importiertNeueUndUeberspringtBekannte() {
        when(workoutRepo.findGarminActivityIdsByUserId(user.getId())).thenReturn(Set.of(1L));
        when(client.fetchActivities(0, PAGE_SIZE)).thenReturn(List.of(activity(1L, 1), activity(2L, 2)));

        GarminSyncResponse result = service.sync(user);

        assertThat(result).isEqualTo(new GarminSyncResponse(1, 1));
    }

    @Test
    void standard_stopptAmStichtagUndLaedtKeineAeltereSeite() {
        // Seite 0 komplett im Fenster, Seite 1 enthält schon eine Aktivität vor dem Stichtag
        when(client.fetchActivities(0, PAGE_SIZE)).thenReturn(recentPage(100L));
        // Volle Seite (sonst würde schon die Seitengröße den Lauf beenden): 2 im Fenster, der Rest älter
        List<GarminActivity> page1 = new ArrayList<>(List.of(activity(200L, 3), activity(201L, 4)));
        for (int i = 0; i < PAGE_SIZE - 2; i++) page1.add(activity(210L + i, 30 + i));
        when(client.fetchActivities(PAGE_SIZE, PAGE_SIZE)).thenReturn(page1);

        GarminSyncResponse result = service.sync(user, 7);

        assertThat(result.imported()).isEqualTo(PAGE_SIZE + 2);
        verify(client, never()).fetchActivities(2 * PAGE_SIZE, PAGE_SIZE);
    }

    @Test
    void gesamteHistorie_laedtAlleSeitenBisZurLetzten() {
        when(client.fetchActivities(0, PAGE_SIZE)).thenReturn(recentPage(100L));
        when(client.fetchActivities(PAGE_SIZE, PAGE_SIZE)).thenReturn(
                List.of(activity(300L, 400), activity(301L, 900)));

        GarminSyncResponse result = service.sync(user, GarminSyncService.MAX_DAYS);

        assertThat(result.imported()).isEqualTo(PAGE_SIZE + 2);
        // Letzte Seite war kürzer als PAGE_SIZE: kein weiterer Abruf
        verify(client, times(2)).fetchActivities(anyInt(), anyInt());
    }

    @Test
    void wiederholterLauf_importiertNichtDoppelt() {
        List<GarminActivity> all = List.of(activity(1L, 1), activity(2L, 2));
        when(client.fetchActivities(0, PAGE_SIZE)).thenReturn(all);
        when(workoutRepo.findGarminActivityIdsByUserId(user.getId())).thenReturn(Set.of(1L, 2L));

        assertThat(service.sync(user)).isEqualTo(new GarminSyncResponse(0, 2));
    }

    @Test
    void leereAntwort_istKeinFehler() {
        when(client.fetchActivities(0, PAGE_SIZE)).thenReturn(List.of());

        assertThat(service.sync(user)).isEqualTo(new GarminSyncResponse(0, 0));
    }

    @Test
    void ungueltigeTage_werdenBegrenzt() {
        when(client.fetchActivities(0, PAGE_SIZE)).thenReturn(List.of(activity(1L, 0)));

        // days=0 wird auf 1 Tag angehoben, die heutige Aktivität wird trotzdem importiert
        assertThat(service.sync(user, 0).imported()).isEqualTo(1);
    }

    private List<GarminActivity> recentPage(long firstId) {
        List<GarminActivity> page = new ArrayList<>();
        for (int i = 0; i < PAGE_SIZE; i++) page.add(activity(firstId + i, 1));
        return page;
    }

    private GarminActivity activity(long id, int daysAgo) {
        String start = GMT.format(Instant.now().minus(daysAgo, ChronoUnit.DAYS).minus(5, ChronoUnit.MINUTES));
        return new GarminActivity(id, "Training", start, 3600.0, 10000.0, 140.0, 170.0, 700.0,
                new GarminActivity.ActivityType("running"));
    }
}
