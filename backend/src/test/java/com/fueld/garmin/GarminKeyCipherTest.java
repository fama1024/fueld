package com.fueld.garmin;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GarminKeyCipherTest {

    private static final String SECRET = Base64.getEncoder().encodeToString(new byte[32]);
    private static final String OTHER_SECRET = Base64.getEncoder().encodeToString("x".repeat(32).getBytes());

    @Test
    void verschluesseltUndEntschluesselt() {
        GarminKeyCipher cipher = new GarminKeyCipher(SECRET);

        String stored = cipher.encrypt("mein-key");

        assertThat(stored).doesNotContain("mein-key");
        assertThat(cipher.decrypt(stored)).isEqualTo("mein-key");
    }

    @Test
    void gleicherKeyErgibtJedesMalAnderenText() {
        GarminKeyCipher cipher = new GarminKeyCipher(SECRET);

        assertThat(cipher.encrypt("mein-key")).isNotEqualTo(cipher.encrypt("mein-key"));
    }

    @Test
    void anderesGeheimnis_kannNichtLesen() {
        String stored = new GarminKeyCipher(SECRET).encrypt("mein-key");

        assertThatThrownBy(() -> new GarminKeyCipher(OTHER_SECRET).decrypt(stored))
                .isInstanceOf(GarminException.class)
                .hasMessageContaining("neu eintragen");
    }

    @Test
    void veraenderterText_wirdErkannt() {
        GarminKeyCipher cipher = new GarminKeyCipher(SECRET);
        byte[] stored = Base64.getDecoder().decode(cipher.encrypt("mein-key"));
        stored[stored.length - 1] ^= 1;

        assertThatThrownBy(() -> cipher.decrypt(Base64.getEncoder().encodeToString(stored)))
                .isInstanceOf(GarminException.class);
    }

    @Test
    void ohneOderMitFalschemGeheimnis_istDeaktiviert() {
        assertThat(new GarminKeyCipher("").isConfigured()).isFalse();
        assertThat(new GarminKeyCipher("zu-kurz").isConfigured()).isFalse();
        assertThat(new GarminKeyCipher(Base64.getEncoder().encodeToString(new byte[16])).isConfigured()).isFalse();
        assertThat(new GarminKeyCipher(SECRET).isConfigured()).isTrue();
    }
}
