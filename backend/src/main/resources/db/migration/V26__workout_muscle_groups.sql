-- Von der KI eingeschätzte Muskelgruppen eines Trainings, Format "quads:primary,glutes:secondary".
-- Leer heißt: keine Einschätzung, das Frontend nimmt dann die festen Gruppen der Sportart.
ALTER TABLE workout_log ADD COLUMN muscle_groups TEXT;
