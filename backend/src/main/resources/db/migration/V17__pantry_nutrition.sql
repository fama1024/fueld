ALTER TABLE pantry_item
    ADD COLUMN calories_per_100g INTEGER,
    ADD COLUMN protein_per_100g  DECIMAL(5,1),
    ADD COLUMN carbs_per_100g    DECIMAL(5,1),
    ADD COLUMN fat_per_100g      DECIMAL(5,1);
