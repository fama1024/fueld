package com.fueld.push;

import com.fueld.user.User;
import tools.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.List;

@Slf4j
@Service
public class PushService {

    private final PushSubscriptionRepository repository;
    private final ObjectMapper objectMapper;

    private final String publicKey;
    private final boolean enabled;
    private nl.martijndwars.webpush.PushService webPush;

    public PushService(PushSubscriptionRepository repository,
                       ObjectMapper objectMapper,
                       @Value("${app.push.vapid.public-key:}") String publicKey,
                       @Value("${app.push.vapid.private-key:}") String privateKey,
                       @Value("${app.push.vapid.subject:mailto:noreply@fueld.app}") String subject) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.publicKey = publicKey;
        this.enabled = !publicKey.isBlank() && !privateKey.isBlank();

        if (!enabled) {
            log.warn("Push-Benachrichtigungen deaktiviert – VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY nicht gesetzt.");
            return;
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            this.webPush = new nl.martijndwars.webpush.PushService(publicKey, privateKey, subject);
        } catch (Exception e) {
            throw new IllegalStateException("VAPID-Schlüssel ungültig – Push kann nicht initialisiert werden", e);
        }
        log.info("Push-Benachrichtigungen aktiv.");
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getPublicKey() {
        return publicKey;
    }

    @Transactional
    public void subscribe(User user, String endpoint, String p256dh, String auth) {
        PushSubscription sub = repository.findByUserIdAndEndpoint(user.getId(), endpoint)
                .orElseGet(() -> PushSubscription.builder().user(user).endpoint(endpoint).build());
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        repository.save(sub);
    }

    @Transactional
    public void unsubscribe(User user, String endpoint) {
        repository.deleteByUserIdAndEndpoint(user.getId(), endpoint);
    }

    /** Alle Geräte eines Nutzers (z.B. Test-Button). */
    public void sendToUser(User user, PushMessage message) {
        deliver(repository.findByUserId(user.getId()), message);
    }

    /** Alle Subscriptions aller Nutzer (Erinnerungs-Scheduler). */
    public void sendToEveryone(PushMessage message) {
        deliver(repository.findAll(), message);
    }

    private void deliver(List<PushSubscription> subs, PushMessage message) {
        if (!enabled) {
            log.debug("Push nicht aktiv – {} Nachricht(en) verworfen", subs.size());
            return;
        }
        if (subs.isEmpty()) return;

        byte[] payload = objectMapper.writeValueAsString(message).getBytes(StandardCharsets.UTF_8);
        int sent = 0;
        for (PushSubscription s : subs) {
            try {
                HttpResponse res = webPush.send(new Notification(s.getEndpoint(), s.getP256dh(), s.getAuth(), payload));
                int code = res.getStatusLine().getStatusCode();
                if (code == 404 || code == 410) {
                    repository.delete(s);
                    log.info("Abgelaufene Push-Subscription entfernt (HTTP {})", code);
                } else if (code >= 400) {
                    log.warn("Push-Zustellung fehlgeschlagen: HTTP {}", code);
                } else {
                    sent++;
                }
            } catch (Exception e) {
                log.warn("Push-Zustellung fehlgeschlagen: {}", e.getMessage());
            }
        }
        log.info("Push verschickt: {}/{} zugestellt", sent, subs.size());
    }
}
