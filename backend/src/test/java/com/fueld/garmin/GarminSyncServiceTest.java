package com.fueld.garmin;

import com.fueld.garmin.dto.GarminSyncResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutExercise;
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
    private static final String KEY = "user-key";
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
                GarminConnectionService connections = mock(GarminConnectionService.class);
        service = new GarminSyncService(client, workoutRepo, metricRepo, connections);
        user = User.builder().id(UUID.randomUUID()).email("me@fueld.test").build();
        when(connections.apiKeyOf(user)).thenReturn(KEY);

        when(workoutRepo.save(any(WorkoutLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workoutRepo.findGarminImportsByUserId(user.getId())).thenReturn(List.of());
    }

    @Test
    void importiertNeueUndUeberspringtBekannte() {
        GarminActivity known = activity(1L, 1);
        when(workoutRepo.findGarminImportsByUserId(user.getId())).thenReturn(List.of(imported(known)));
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(List.of(known, activity(2L, 2)));

        GarminSyncResponse result = service.sync(user, 7);

        assertThat(result).isEqualTo(new GarminSyncResponse(1, 0, 1));
    }

    @Test
    void bekannteTrainings_bekommenFehlendeDetails_ohneSonstigeAenderungen() {
        // performedAt steht auf einem falschen Wert, so wie nach dem früheren Einordnen
        WorkoutLog existing = WorkoutLog.builder().garminActivityId(1L).notes("Eigene Notiz").summary("Einordnung")
                .performedAt(Instant.parse("2026-01-01T11:00:00Z")).build();
        when(workoutRepo.findGarminImportsByUserId(user.getId())).thenReturn(List.of(existing));
        GarminActivity base = activity(1L, 1);
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(List.of(new GarminActivity(
                1L, base.activityName(), base.startTimeGMT(), base.duration(), null, null, null, null,
                new GarminActivity.ActivityType("strength_training"), "5x5 schwer",
                List.of(new GarminActivity.ExerciseSet("DEADLIFT", null, 5, 25, 100000.0, null, null)),
                2.5, 3.1, "ANAEROBIC_CAPACITY")));

        assertThat(service.sync(user, 7)).isEqualTo(new GarminSyncResponse(0, 1, 0));

        assertThat(existing.getPerformedAt()).isEqualTo(GarminActivityMapper.startTime(base));
        assertThat(existing.getGarminTypeKey()).isEqualTo("strength_training");
        assertThat(existing.getGarminDescription()).isEqualTo("5x5 schwer");
        assertThat(existing.getGarminExercises()).extracting(WorkoutExercise::name).containsExactly("Deadlift");
        assertThat(existing.trainingEffect().label()).isEqualTo("Anaerobe Kapazität");
        assertThat(existing.getNotes()).isEqualTo("Eigene Notiz");
        assertThat(existing.getSummary()).isEqualTo("Einordnung");
        // Ein zweiter Lauf findet nichts mehr zu ändern
        assertThat(service.sync(user, 7)).isEqualTo(new GarminSyncResponse(0, 0, 1));
        verify(workoutRepo, never()).save(any(WorkoutLog.class));
    }

    @Test
    void standard_stopptAmStichtagUndLaedtKeineAeltereSeite() {
        // Seite 0 komplett im Fenster, Seite 1 enthält schon eine Aktivität vor dem Stichtag
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(recentPage(100L));
        // Volle Seite (sonst würde schon die Seitengröße den Lauf beenden): 2 im Fenster, der Rest älter
        List<GarminActivity> page1 = new ArrayList<>(List.of(activity(200L, 3), activity(201L, 4)));
        for (int i = 0; i < PAGE_SIZE - 2; i++) page1.add(activity(210L + i, 30 + i));
        when(client.fetchActivities(KEY, PAGE_SIZE, PAGE_SIZE)).thenReturn(page1);

        GarminSyncResponse result = service.sync(user, 7);

        assertThat(result.imported()).isEqualTo(PAGE_SIZE + 2);
        verify(client, never()).fetchActivities(KEY, 2 * PAGE_SIZE, PAGE_SIZE);
    }

    @Test
    void gesamteHistorie_laedtAlleSeitenBisZurLetzten() {
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(recentPage(100L));
        when(client.fetchActivities(KEY, PAGE_SIZE, PAGE_SIZE)).thenReturn(
                List.of(activity(300L, 400), activity(301L, 900)));

        GarminSyncResponse result = service.sync(user, GarminSyncService.MAX_DAYS);

        assertThat(result.imported()).isEqualTo(PAGE_SIZE + 2);
        // Letzte Seite war kürzer als PAGE_SIZE: kein weiterer Abruf
        verify(client, times(2)).fetchActivities(any(), anyInt(), anyInt());
    }

    @Test
    void wiederholterLauf_importiertNichtDoppelt() {
        List<GarminActivity> all = List.of(activity(1L, 1), activity(2L, 2));
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(all);
        when(workoutRepo.findGarminImportsByUserId(user.getId()))
                .thenReturn(all.stream().map(this::imported).toList());

        assertThat(service.sync(user, 7)).isEqualTo(new GarminSyncResponse(0, 0, 2));
    }

    @Test
    void leereAntwort_istKeinFehler() {
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(List.of());

        assertThat(service.sync(user, 7)).isEqualTo(new GarminSyncResponse(0, 0, 0));
    }

    @Test
    void ungueltigeTage_werdenBegrenzt() {
        when(client.fetchActivities(KEY, 0, PAGE_SIZE)).thenReturn(List.of(activity(1L, 0)));

        // days=0 wird auf 1 Tag angehoben, die heutige Aktivität wird trotzdem importiert
        assertThat(service.sync(user, 0).imported()).isEqualTo(1);
    }

    private List<GarminActivity> recentPage(long firstId) {
        List<GarminActivity> page = new ArrayList<>();
        for (int i = 0; i < PAGE_SIZE; i++) page.add(activity(firstId + i, 1));
        return page;
    }

    private WorkoutLog imported(GarminActivity a) {
        return WorkoutLog.builder().garminActivityId(a.activityId()).garminTypeKey("running")
                .performedAt(GarminActivityMapper.startTime(a)).build();
    }

    private GarminActivity activity(long id, int daysAgo) {
        String start = GMT.format(Instant.now().minus(daysAgo, ChronoUnit.DAYS).minus(5, ChronoUnit.MINUTES));
        return new GarminActivity(id, "Training", start, 3600.0, 10000.0, 140.0, 170.0, 700.0,
                new GarminActivity.ActivityType("running"), null, null, null, null, null);
    }
}
