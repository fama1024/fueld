-- Grobe Einschätzung der KI: beanspruchte Muskelgruppen und Nutzen des Trainings, je als JSON-Liste
ALTER TABLE workout_log ADD COLUMN muscles TEXT;
ALTER TABLE workout_log ADD COLUMN benefits TEXT;
