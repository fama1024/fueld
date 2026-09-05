package com.fueld.productcache;

import com.fueld.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_cache")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProductCacheEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String name;

    @Column(name = "calories_per_100g")
    private Integer caloriesPer100g;

    @Column(name = "protein_per_100g", precision = 5, scale = 1)
    private BigDecimal proteinPer100g;

    @Column(name = "carbs_per_100g", precision = 5, scale = 1)
    private BigDecimal carbsPer100g;

    @Column(name = "fat_per_100g", precision = 5, scale = 1)
    private BigDecimal fatPer100g;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @PrePersist
    void onCreate() {
        if (this.lastUsedAt == null) this.lastUsedAt = Instant.now();
    }
}
