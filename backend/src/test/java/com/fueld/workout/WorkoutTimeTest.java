package com.fueld.workout;

import com.fueld.ai.AiService;
import com.fueld.profile.ProfileRepository;
import com.fueld.user.User;
import com.fueld.workout.dto.WorkoutAnalysis;
import com.fueld.workout.dto.WorkoutLogRequest;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Beim Einordnen schickt das Frontend nur ein Datum. Die Uhrzeit darf dabei nicht verloren gehen. */
class WorkoutTimeTest {

    private static final Instant MORNING = Instant.parse("2026-11-26T06:12:00Z");

    private final WorkoutLogRepository workouts = mock(WorkoutLogRepository.class);
    private final AiService ai = mock(AiService.class);
    private final WorkoutService service = new WorkoutService(
            workouts, mock(WorkoutMetricRepository.class), mock(ProfileRepository.class), ai);
    private final User user = User.builder().id(UUID.randomUUID()).build();

    @Test
    void garmin_behaeltDieStartzeit_auchBeiAnderemDatum() {
        assertThat(analyse(42L, "2026-11-20")).isEqualTo(MORNING);
        verify(ai).analyzeWorkout(any(), any(), any(), any(), any(),
                eq("Donnerstag, 26.11.2026, Start 07:12 Uhr"));
    }

    @Test
    void ohneGarmin_bleibtDerZeitpunktBeiGleichemTag() {
        assertThat(analyse(null, "2026-11-26")).isEqualTo(MORNING);
        verify(ai).analyzeWorkout(any(), any(), any(), any(), any(),
                eq("Donnerstag, 26.11.2026 (Uhrzeit unbekannt)"));
    }

    @Test
    void ohneGarmin_einNeuesDatumWirdUebernommen() {
        assertThat(analyse(null, "2026-11-20")).isEqualTo(Instant.parse("2026-11-20T11:00:00Z"));
    }

    private Instant analyse(Long garminActivityId, String date) {
        UUID id = UUID.randomUUID();
        WorkoutLog workout = WorkoutLog.builder().id(id).user(user).type(WorkoutType.crossfit)
                .garminActivityId(garminActivityId).performedAt(MORNING).build();
        when(workouts.findById(id)).thenReturn(Optional.of(workout));
        when(workouts.save(workout)).thenReturn(workout);
        when(ai.analyzeWorkout(any(), any(), any(), any(), any(), any()))
                .thenReturn(mock(WorkoutAnalysis.class));
        return service.updateWorkout(user, id, new WorkoutLogRequest(WorkoutType.crossfit, 52, null, null, date))
                .performedAt();
    }
}
