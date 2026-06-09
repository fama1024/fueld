package com.fueld.meal;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "meal_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "text_input", nullable = false)
    private String textInput;

    private String summary;
    private Integer calories;
    private Integer protein;
    private Integer carbs;
    private Integer fat;
    private String feedback;
    private String tip;

    @Column(name = "goal_alignment")
    private String goalAlignment;

    @Column(name = "ingredient_tips", columnDefinition = "TEXT")
    private String ingredientTips;

    @Column(name = "meal_type", length = 10)
    private String mealType;

    @Column(name = "eaten_at", nullable = false)
    private Instant eatenAt;

    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;

    @PrePersist
    void onCreate() {
        this.loggedAt = Instant.now();
        if (this.eatenAt == null) this.eatenAt = this.loggedAt;
    }
}
