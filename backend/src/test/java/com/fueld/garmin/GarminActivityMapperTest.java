package com.fueld.garmin;

import com.fueld.workout.TrainingEffect;
import com.fueld.workout.WorkoutExercise;
import com.fueld.workout.WorkoutType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GarminActivityMapperTest {

    // Werte in der Form, wie die Personal API sie liefert (Sekunden, Meter, UTC)
    private final GarminActivity run = new GarminActivity(
            1L, "Long Run", "2026-10-25 09:47:39", 10765.7, 21435.41, 135.0, 170.0, 1456.0,
            new GarminActivity.ActivityType("running"), null, null, null, null, null);

    @Test
    void startTime_wirdAlsUtcGelesen() {
        assertThat(GarminActivityMapper.startTime(run)).isEqualTo(Instant.parse("2026-10-25T09:47:39Z"));
    }

    @Test
    void startTime_ungueltigOderLeer_istNull() {
        assertThat(GarminActivityMapper.startTime(new GarminActivity(1L, null, null, null, null, null, null, null, null, null, null, null, null, null))).isNull();
        assertThat(GarminActivityMapper.startTime(new GarminActivity(1L, null, "kaputt", null, null, null, null, null, null, null, null, null, null, null))).isNull();
    }

    @Test
    void einheiten_werdenUmgerechnet() {
        assertThat(GarminActivityMapper.durationMinutes(run)).isEqualTo(179);
        assertThat(GarminActivityMapper.distanceKm(run)).isEqualByComparingTo(new BigDecimal("21.44"));
        assertThat(GarminActivityMapper.rounded(135.0)).isEqualTo(135);
        assertThat(GarminActivityMapper.rounded(null)).isNull();
    }

    @Test
    void pace_nurBeiLaeufenMitDistanz() {
        assertThat(GarminActivityMapper.pacePerKm(run, WorkoutType.running)).isEqualTo("8:22");
        assertThat(GarminActivityMapper.pacePerKm(run, WorkoutType.cycling)).isNull();
    }

    @Test
    void ohneDistanz_keineDistanzUndKeinePace() {
        GarminActivity hiit = new GarminActivity(2L, null, "2026-10-26 07:00:00", 2400.0, 0.0, 150.0, 180.0, 400.0,
                new GarminActivity.ActivityType("hiit"), null, null, null, null, null);
        assertThat(GarminActivityMapper.distanceKm(hiit)).isNull();
        assertThat(GarminActivityMapper.pacePerKm(hiit, WorkoutType.running)).isNull();
    }

    @Test
    void uebungen_werdenInKiloUndSekundenUmgerechnet() {
        // Gramm, Gramm x Wiederholungen und Millisekunden, wie in Garmins Spezifikation
        GarminActivity strength = strength(null, List.of(
                new GarminActivity.ExerciseSet("SQUAT", "BARBELL_BACK_SQUAT", 3, 30, 80000.0, 2250000.0, 95400.0)));

        assertThat(GarminActivityMapper.exercises(strength)).containsExactly(new WorkoutExercise(
                "Barbell Back Squat", 3, 30, new BigDecimal("80.0"), new BigDecimal("2250.0"), 95));
    }

    @Test
    void uebungen_ohneZusatzgewichtOderErkennung() {
        GarminActivity strength = strength(null, List.of(
                new GarminActivity.ExerciseSet("PULL_UP", null, 4, 32, 0.0, 0.0, null),
                new GarminActivity.ExerciseSet("UNKNOWN", "UNKNOWN", 2, 0, null, null, null),
                // ohne jede Angabe: fällt weg
                new GarminActivity.ExerciseSet("UNKNOWN", null, 0, 0, null, null, 0.0)));

        assertThat(GarminActivityMapper.exercises(strength)).containsExactly(
                new WorkoutExercise("Pull Up", 4, 32, null, null, null),
                new WorkoutExercise(null, 2, null, null, null, null));
        assertThat(GarminActivityMapper.exercises(run)).isEmpty();
    }

    @Test
    void beschreibung_wirdBereinigtUndLeerZuNull() {
        assertThat(GarminActivityMapper.description(strength("  21-15-9 Thrusters  ", null))).isEqualTo("21-15-9 Thrusters");
        assertThat(GarminActivityMapper.description(strength("   ", null))).isNull();
        assertThat(GarminActivityMapper.description(strength("x".repeat(3000), null))).hasSize(2000);
    }

    private GarminActivity strength(String description, List<GarminActivity.ExerciseSet> sets) {
        return new GarminActivity(3L, "Kraft", "2026-10-26 07:00:00", 2400.0, null, null, null, null,
                new GarminActivity.ActivityType("strength_training"), description, sets, null, null, null);
    }

    @Test
    void trainingEffect_wirdGerundetUndUebersetzt() {
        assertThat(GarminActivityMapper.trainingEffect(withEffect(3.24000001, 0.0, "AEROBIC_BASE"))).isEqualTo(
                new TrainingEffect(new BigDecimal("3.2"), new BigDecimal("0.0"), "Grundlagenausdauer"));
        assertThat(GarminActivityMapper.trainingEffect(withEffect(null, null, "SOMETHING_NEW")).label()).isEqualTo("Something New");
    }

    @Test
    void trainingEffect_ohneMesswerteIstNull() {
        assertThat(GarminActivityMapper.trainingEffect(withEffect(0.0, 0.0, "UNKNOWN"))).isNull();
        assertThat(GarminActivityMapper.trainingEffect(withEffect(9.0, null, null))).isNull();
        assertThat(GarminActivityMapper.trainingEffect(run)).isNull();
    }

    private GarminActivity withEffect(Double aerobic, Double anaerobic, String label) {
        return new GarminActivity(4L, null, "2026-10-26 07:00:00", 2400.0, null, null, null, null, null, null, null,
                aerobic, anaerobic, label);
    }

    @Test
    void typMapping() {
        assertThat(GarminActivityMapper.type("running")).isEqualTo(WorkoutType.running);
        assertThat(GarminActivityMapper.type("treadmill_running")).isEqualTo(WorkoutType.running);
        assertThat(GarminActivityMapper.type("trail_running")).isEqualTo(WorkoutType.running);
        assertThat(GarminActivityMapper.type("cycling")).isEqualTo(WorkoutType.cycling);
        assertThat(GarminActivityMapper.type("gravel_cycling")).isEqualTo(WorkoutType.cycling);
        assertThat(GarminActivityMapper.type("mountain_biking")).isEqualTo(WorkoutType.cycling);
        assertThat(GarminActivityMapper.type("hiit")).isEqualTo(WorkoutType.crossfit);
        assertThat(GarminActivityMapper.type("strength_training")).isEqualTo(WorkoutType.crossfit);
        assertThat(GarminActivityMapper.type("yoga")).isEqualTo(WorkoutType.other);
        assertThat(GarminActivityMapper.type(null)).isEqualTo(WorkoutType.other);
    }
}
