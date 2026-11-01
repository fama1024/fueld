package com.fueld.garmin;

import com.fueld.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GarminConnectionServiceTest {

    private GarminConnectionRepository repository;
    private GarminClient client;
    private GarminKeyCipher cipher;
    private GarminConnectionService service;
    private User user;

    @BeforeEach
    void setUp() {
        repository = mock(GarminConnectionRepository.class);
        client = mock(GarminClient.class);
        cipher = new GarminKeyCipher("test-secret");
        service = new GarminConnectionService(repository, cipher, client);
        user = User.builder().id(UUID.randomUUID()).email("a@fueld.test").build();
    }

    @Test
    void speichertNurVerschluesselt() {
        when(repository.findByUserId(user.getId())).thenReturn(Optional.empty());

        service.save(user, " a@garmin.test ", "  mein-key  ");

        verify(client).verifyKey("mein-key");
        ArgumentCaptor<GarminConnection> saved = ArgumentCaptor.forClass(GarminConnection.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getApiKeyEncrypted()).doesNotContain("mein-key");
        assertThat(cipher.decrypt(saved.getValue().getApiKeyEncrypted())).isEqualTo("mein-key");
        assertThat(saved.getValue().getEmail()).isEqualTo("a@garmin.test");
    }

    @Test
    void neuerKey_ersetztDenBestehenden() {
        GarminConnection existing = GarminConnection.builder().user(user).apiKeyEncrypted(cipher.encrypt("alt")).build();
        when(repository.findByUserId(user.getId())).thenReturn(Optional.of(existing));

        service.save(user, "a@garmin.test", "neu");

        verify(repository).save(existing);
        assertThat(service.apiKeyOf(user)).isEqualTo("neu");
    }

    @Test
    void ohneNeuenKey_bleibtDerAlte_undNurDieMailAendertSich() {
        GarminConnection existing = GarminConnection.builder().user(user).email("alt@garmin.test")
                .apiKeyEncrypted(cipher.encrypt("alt")).build();
        when(repository.findByUserId(user.getId())).thenReturn(Optional.of(existing));

        service.save(user, "neu@garmin.test", "  ");

        verify(client, never()).verifyKey(any());
        assertThat(service.apiKeyOf(user)).isEqualTo("alt");
        assertThat(existing.getEmail()).isEqualTo("neu@garmin.test");
    }

    @Test
    void ersterZugangOhneKey_wirdAbgelehnt() {
        when(repository.findByUserId(user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.save(user, "a@garmin.test", null)).isInstanceOf(GarminKeyMissingException.class);

        verify(repository, never()).save(any());
    }

    @Test
    void abgelehnterKey_wirdNichtGespeichert_undDerAlteBleibt() {
        GarminConnection existing = GarminConnection.builder().user(user).email("alt@garmin.test")
                .apiKeyEncrypted(cipher.encrypt("alt")).build();
        when(repository.findByUserId(user.getId())).thenReturn(Optional.of(existing));
        doThrow(new GarminKeyRejectedException(null)).when(client).verifyKey("falsch");

        assertThatThrownBy(() -> service.save(user, "neu@garmin.test", "falsch")).isInstanceOf(GarminKeyRejectedException.class);

        verify(repository, never()).save(any());
        assertThat(service.apiKeyOf(user)).isEqualTo("alt");
        assertThat(existing.getEmail()).isEqualTo("alt@garmin.test");
    }

    @Test
    void ohneHinterlegtenKey_gibtEsVerstaendlichenFehler() {
        when(repository.findByUserId(user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.apiKeyOf(user)).isInstanceOf(GarminException.class);
    }

    @Test
    void connectedUsers_liefertAlleNutzerMitKey() {
        when(repository.findAllWithUser()).thenReturn(List.of(GarminConnection.builder().user(user).build()));

        assertThat(service.connectedUsers()).containsExactly(user);
    }
}
