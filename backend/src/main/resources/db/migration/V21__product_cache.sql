CREATE TABLE product_cache (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    calories_per_100g INTEGER,
    protein_per_100g  DECIMAL(5,1),
    carbs_per_100g    DECIMAL(5,1),
    fat_per_100g      DECIMAL(5,1),
    last_used_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_cache_user_id ON product_cache(user_id);
CREATE UNIQUE INDEX idx_product_cache_user_name ON product_cache(user_id, LOWER(name));
