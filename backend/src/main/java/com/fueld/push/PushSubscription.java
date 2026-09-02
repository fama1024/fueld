package com.fueld.push;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Eine Web-Push-Subscription des Browsers (ein Eintrag pro Gerät/Browser).
 * endpoint + die beiden Schlüssel (p256dh, auth) kommen unverändert vom
 * PushManager im Frontend und werden zum Verschlüsseln/Zustellen gebraucht.
 */
@Entity
@Table(name = "push_subscription")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String p256dh;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String auth;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) this.createdAt = Instant.now();
    }
}
