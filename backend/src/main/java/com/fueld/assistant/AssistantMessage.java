package com.fueld.assistant;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "assistant_message")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AssistantMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** "today" | "week" */
    @Column(nullable = false, length = 10)
    private String scope;

    /** Thread-Schlüssel: bei scope=today der gefragte Tag, bei scope=week der Montag der Woche. */
    @Column(name = "period_date", nullable = false)
    private LocalDate periodDate;

    /** "user" | "assistant" */
    @Column(nullable = false, length = 10)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) this.createdAt = Instant.now();
    }
}
