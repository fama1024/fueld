package com.fueld.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiServiceJsonTest {

    @Test
    void reinesJson_bleibtUnveraendert() {
        assertThat(AiService.extractJsonObject("{\"items\": []}")).isEqualTo("{\"items\": []}");
    }

    @Test
    void codeFences_werdenEntfernt() {
        assertThat(AiService.extractJsonObject("```json\n{\"items\": []}\n```")).isEqualTo("{\"items\": []}");
    }

    @Test
    void textDrumherum_wirdEntfernt() {
        assertThat(AiService.extractJsonObject("Hier ist das Ergebnis:\n{\"items\": [{\"kind\": \"meal\"}]}\nViele Grüße"))
                .isEqualTo("{\"items\": [{\"kind\": \"meal\"}]}");
    }

    @Test
    void ohneJson_bleibtDerText() {
        assertThat(AiService.extractJsonObject("Das geht nicht.")).isEqualTo("Das geht nicht.");
    }
}
