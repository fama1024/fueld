package com.fueld.garmin;

import com.fueld.workout.WorkoutType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class GarminActivityMapperTest {

    // Werte in der Form, wie die Personal API sie liefert (Sekunden, Meter, UTC)
    private final GarminActivity run = new GarminActivity(
            1L, "Long Run", "2026-10-25 09:47:39", 10765.7, 21435.41, 135.0, 170.0, 1456.0,
            new GarminActivity.ActivityType("running"));

    @Test
    void startTime_wirdAlsUtcGelesen() {
        assertThat(GarminActivityMapper.startTime(run)).isEqualTo(Instant.parse("2026-10-25T09:47:39Z"));
    }

    @Test
    void startTime_ungueltigOderLeer_istNull() {
        assertThat(GarminActivityMapper.startTime(new GarminActivity(1L, null, null, null, null, null, null, null, null))).isNull();
        assertThat(GarminActivityMapper.startTime(new GarminActivity(1L, null, "kaputt", null, null, null, null, null, null))).isNull();
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
                new GarminActivity.ActivityType("hiit"));
        assertThat(GarminActivityMapper.distanceKm(hiit)).isNull();
        assertThat(GarminActivityMapper.pacePerKm(hiit, WorkoutType.running)).isNull();
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
