package com.fueld.workout;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workout_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkoutLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WorkoutType type;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    private String notes;
    private String summary;
    private String feedback;

    @Column(name = "ai_analysis", columnDefinition = "TEXT")
    private String aiAnalysis;

    @OneToOne(mappedBy = "workoutLog", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private WorkoutMetric metric;

    @Column(name = "performed_at", nullable = false)
    private Instant performedAt;

    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;

    @PrePersist
    void onCreate() {
        this.loggedAt = Instant.now();
        if (this.performedAt == null) this.performedAt = this.loggedAt;
    }
}
