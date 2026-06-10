package com.fueld.weight;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "weight_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class WeightLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal weight;

    @Column(precision = 4, scale = 1)
    private BigDecimal bmi;

    @Column(name = "body_fat_pct", precision = 4, scale = 1)
    private BigDecimal bodyFatPct;

    @Column(name = "muscle_mass_pct", precision = 4, scale = 1)
    private BigDecimal muscleMassPct;

    @Column(name = "bone_mass_kg", precision = 4, scale = 1)
    private BigDecimal boneMassKg;

    @Column(name = "water_pct", precision = 4, scale = 1)
    private BigDecimal waterPct;

    @Column(name = "logged_at", nullable = false)
    private Instant loggedAt;

    @PrePersist
    void onCreate() {
        if (this.loggedAt == null) this.loggedAt = Instant.now();
    }
}
