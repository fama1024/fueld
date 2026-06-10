ALTER TABLE weight_log
    ADD COLUMN bmi              DECIMAL(4,1),
    ADD COLUMN body_fat_pct     DECIMAL(4,1),
    ADD COLUMN muscle_mass_pct  DECIMAL(4,1),
    ADD COLUMN bone_mass_kg     DECIMAL(4,1),
    ADD COLUMN water_pct        DECIMAL(4,1);
