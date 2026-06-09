package com.fueld.profile;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profile")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(columnDefinition = "TEXT")
    private String goals;

    @Column(columnDefinition = "TEXT")
    private String diet;

    @Column(columnDefinition = "TEXT")
    private String sports;

    @Column(precision = 5, scale = 2)
    private BigDecimal bodyWeight;

    private Integer height;

    private Integer age;

    @Column(length = 10)
    private String gender; // "male", "female", "diverse"

    @Column(length = 20)
    private String activityLevel; // "sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
