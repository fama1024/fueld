package com.fueld.workout;

import com.fueld.workout.dto.MuscleLoad;
import com.fueld.workout.dto.WorkoutAnalysis;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MuscleGroupsTest {

    private final ObjectMapper mapper = JsonMapper.builder().build();

    @Test
    void speichertBekannteGruppenInDerReihenfolgeDerKi() {
        String stored = MuscleGroups.store(List.of(new MuscleLoad("quads", "primary"), new MuscleLoad("calves", "secondary")));

        assertThat(stored).isEqualTo("quads:primary,calves:secondary");
    }

    @Test
    void unbekannteGruppen_undLeereEintraege_werdenVerworfen() {
        String stored = MuscleGroups.store(Arrays.asList(
                new MuscleLoad("quads", "primary"), new MuscleLoad("kopf", "primary"),
                new MuscleLoad(null, "primary"), null));

        assertThat(stored).isEqualTo("quads:primary");
    }

    @Test
    void unbekannteStufe_wirdZuSecondary() {
        assertThat(MuscleGroups.store(List.of(new MuscleLoad("back", "huge")))).isEqualTo("back:secondary");
        assertThat(MuscleGroups.store(List.of(new MuscleLoad("back", null)))).isEqualTo("back:secondary");
    }

    @Test
    void doppelteGruppe_behaeltDieStaerkereBelastung() {
        String stored = MuscleGroups.store(List.of(new MuscleLoad("back", "secondary"), new MuscleLoad("back", "primary")));

        assertThat(stored).isEqualTo("back:primary");
    }

    @Test
    void nichtsBrauchbares_ergibtNull() {
        assertThat(MuscleGroups.store(null)).isNull();
        assertThat(MuscleGroups.store(List.of())).isNull();
        assertThat(MuscleGroups.store(List.of(new MuscleLoad("kopf", "primary")))).isNull();
    }

    @Test
    void textVomClient_wirdNeuGeprueft() {
        assertThat(MuscleGroups.sanitizeStored("quads:primary,foo:primary,biceps:wild,kaputt,::")).isEqualTo("quads:primary,biceps:secondary");
        assertThat(MuscleGroups.sanitizeStored("")).isNull();
        assertThat(MuscleGroups.sanitizeStored(null)).isNull();
    }

    @Test
    void parse_liefertGruppenUndStufen() {
        assertThat(MuscleGroups.parse("quads:primary,glutes:secondary"))
                .containsExactly(new MuscleLoad("quads", "primary"), new MuscleLoad("glutes", "secondary"));
        assertThat(MuscleGroups.parse(null)).isNull();
    }

    @Test
    void kiAntwort_mitMuskelgruppen() {
        String json = """
                {"summary": "Gute Einheit", "distance_km": null, "feedback": "Solide.", "missing_data": [],
                 "muscle_groups": [{"group": "back", "level": "primary"}, {"group": "biceps", "level": "secondary", "extra": 1}]}
                """;

        WorkoutAnalysis analysis = mapper.readValue(json, WorkoutAnalysis.class);

        assertThat(analysis.muscleGroups()).containsExactly(new MuscleLoad("back", "primary"), new MuscleLoad("biceps", "secondary"));
    }

    @Test
    void kiAntwort_ohneMuskelgruppen_istKeinFehler() {
        WorkoutAnalysis analysis = mapper.readValue("{\"summary\": \"Ok\", \"muscle_groups\": null}", WorkoutAnalysis.class);

        assertThat(analysis.muscleGroups()).isNull();
        assertThat(MuscleGroups.store(analysis.muscleGroups())).isNull();
    }
}
