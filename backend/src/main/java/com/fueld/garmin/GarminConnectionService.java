package com.fueld.garmin;

import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Verwaltet den Garmin-Key pro Nutzer. Der Key wird nur geschrieben und intern entschlüsselt,
 * keine API-Antwort gibt ihn je zurück.
 */
@Service
@RequiredArgsConstructor
public class GarminConnectionService {

    private final GarminConnectionRepository repository;
    private final GarminKeyCipher cipher;
    private final GarminClient client;

    public boolean isConnected(User user) {
        return repository.existsByUserId(user.getId());
    }

    public Optional<String> emailOf(User user) {
        return repository.findByUserId(user.getId()).map(GarminConnection::getEmail);
    }

    /**
     * Speichert oder ändert den Zugang. Ein neuer Key zählt nur, wenn Garmin ihn annimmt, ohne Key
     * bleibt der bisherige bestehen. Bewusst ohne Transaktion: Die Prüfung bei Garmin soll keine der
     * wenigen Datenbankverbindungen blockieren.
     */
    public void save(User user, String email, String apiKey) {
        GarminConnection connection = repository.findByUserId(user.getId())
                .orElseGet(() -> GarminConnection.builder().user(user).build());
        boolean hasNewKey = apiKey != null && !apiKey.isBlank();
        if (hasNewKey) {
            String key = apiKey.trim();
            client.verifyKey(key);
            connection.setApiKeyEncrypted(cipher.encrypt(key));
        } else if (connection.getApiKeyEncrypted() == null) {
            throw new GarminKeyMissingException();
        }
        connection.setEmail(email.trim());
        repository.save(connection);
    }

    @Transactional
    public void remove(User user) {
        repository.deleteByUserId(user.getId());
    }

    public String apiKeyOf(User user) {
        return repository.findByUserId(user.getId())
                .map(connection -> cipher.decrypt(connection.getApiKeyEncrypted()))
                .orElseThrow(() -> new GarminException("Kein Garmin-Key hinterlegt"));
    }

    /** Alle Nutzer mit Key, für den täglichen Abruf. */
    public List<User> connectedUsers() {
        return repository.findAllWithUser().stream().map(GarminConnection::getUser).toList();
    }
}
