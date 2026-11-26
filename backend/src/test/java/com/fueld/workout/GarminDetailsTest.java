package com.fueld.workout;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GarminDetailsTest {

    private final List<WorkoutExercise> exercises = List.of(
            new WorkoutExercise("Barbell Back Squat", 3, 30, new BigDecimal("80.0"), new BigDecimal("2250.0"), 95),
            new WorkoutExercise(null, 1, null, null, null, null));

    @Test
    void uebungsliste_bleibtBeimSpeichernAlsJsonUnveraendert() {
        // Wichtig für den Sync: sonst gälte jedes Training bei jedem Lauf als geändert
        WorkoutExerciseListConverter converter = new WorkoutExerciseListConverter();

        assertThat(converter.convertToEntityAttribute(converter.convertToDatabaseColumn(exercises))).isEqualTo(exercises);
        assertThat(converter.convertToDatabaseColumn(List.of())).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isEmpty();
    }

    @Test
    void text_fuerDieKi() {
        TrainingEffect effect = new TrainingEffect(new BigDecimal("3.0"), new BigDecimal("1.4"), "Tempo");

        assertThat(GarminDetailsText.describe("strength_training", "Grace\nin 4:12", exercises, effect)).isEqualTo(
                "Garmin-Aktivitätstyp: strength_training"
                        + " | Übungen laut Garmin: Barbell Back Squat (3 Sätze, 30 Wdh. gesamt, max. 80 kg, Volumen 2250 kg, 95 s);"
                        + " nicht erkannte Übung (1 Satz)"
                        + " | Training Effect laut Garmin: Tempo, aerob 3 von 5, anaerob 1.4 von 5"
                        + " | Beschreibung aus Garmin: Grace / in 4:12");
        assertThat(GarminDetailsText.describe(null, null, List.of(), null)).isEmpty();
    }

    @Test
    void listenDerKi_werdenBereinigt() {
        assertThat(WorkoutTags.clean(java.util.Arrays.asList(" Gesäß ", "", null, "Gesäß", "Waden", "Rücken"), 2))
                .containsExactly("Gesäß", "Waden");
        assertThat(WorkoutTags.clean(null, 3)).isEmpty();
    }
}
