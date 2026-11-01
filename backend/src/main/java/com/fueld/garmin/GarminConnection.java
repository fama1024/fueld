package com.fueld.garmin;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Der Garmin-Zugang eines Nutzers. Der Key liegt nur verschlüsselt vor (siehe {@link GarminKeyCipher}),
 * die Mail zeigt nur an, welches Garmin-Konto verbunden ist. Für den Abruf braucht Garmin sie nicht.
 */
@Entity
@Table(name = "garmin_connection")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class GarminConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String email;

    @Column(name = "api_key_encrypted", nullable = false, columnDefinition = "TEXT")
    private String apiKeyEncrypted;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }
}
