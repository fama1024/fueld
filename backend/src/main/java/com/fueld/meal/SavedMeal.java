package com.fueld.meal;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Wiederverwendbare Mahlzeit fürs schnelle Loggen ohne KI-Call.
 * Makros werden beim Merken einmal übernommen und danach nie aktualisiert
 * (bewusst einfachste Variante).
 */
@Entity
@Table(name = "saved_meal")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SavedMeal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String name;

    @Column(name = "text_input", columnDefinition = "TEXT")
    private String textInput;

    private Integer calories;
    private Integer protein;
    private Integer carbs;
    private Integer fat;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @PrePersist
    void onCreate() {
        if (this.lastUsedAt == null) this.lastUsedAt = Instant.now();
    }
}
