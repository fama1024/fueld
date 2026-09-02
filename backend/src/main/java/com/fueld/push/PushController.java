package com.fueld.push;

import com.fueld.push.dto.EndpointRequest;
import com.fueld.push.dto.PushSubscriptionRequest;
import com.fueld.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@RequiredArgsConstructor
public class PushController {

    private final PushService pushService;

    /** Öffentlicher VAPID-Key + ob Push serverseitig konfiguriert ist. */
    @GetMapping("/vapid-key")
    public Map<String, Object> vapidKey() {
        return Map.of(
                "publicKey", pushService.getPublicKey(),
                "enabled", pushService.isEnabled()
        );
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PushSubscriptionRequest request) {
        pushService.subscribe(user, request.endpoint(), request.p256dh(), request.auth());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(
            @AuthenticationPrincipal User user,
            @RequestBody EndpointRequest request) {
        pushService.unsubscribe(user, request.endpoint());
        return ResponseEntity.noContent().build();
    }

    /** Schickt sofort eine Test-Benachrichtigung an alle Geräte des Nutzers. */
    @PostMapping("/test")
    public ResponseEntity<Void> test(@AuthenticationPrincipal User user) {
        pushService.sendToUser(user, new PushMessage(
                "Fueld Test 🔔", "Benachrichtigungen funktionieren.", "/log"));
        return ResponseEntity.noContent().build();
    }
}
