ALTER TABLE ai_insight ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'weekly';
ALTER TABLE meal_log ADD COLUMN ingredient_tips TEXT;
