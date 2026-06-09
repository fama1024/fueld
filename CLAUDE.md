# Fueld

## Projektübersicht

Fueld ist eine persönliche Fitness- und Ernährungs-Tracking-App mit KI-Analyse. Der Nutzer fotografiert Mahlzeiten und Verpackungen, trägt Trainingseinheiten ein (manuell oder per Garmin-Screenshot), und bekommt von der KI personalisiertes Feedback basierend auf seinen Zielen und seiner Historie.

### Kernidee

Zwei Ebenen:
1. **Profil (statisch)** – Ziele (Chips + Freitext), Ernährungsweise, Sportarten, Körperdaten. Immer Teil des KI-Kontexts.
2. **Log (wächst täglich)** – Mahlzeiten + Trainingseinheiten. KI nutzt die gesamte Historie für immer bessere Analysen.

### KI-Analyse Flow

```
Nutzer schickt: Foto(s) + Freitext
                    ↓
KI kennt: Profil (inkl. goal_tags) + heutiger Makrostand + Tagesziele
                    ↓
KI antwortet: Makros + Bewertung + Ziel-Feedback + Zutaten-Tipps
                    ↓
Wird strukturiert in Datenbank gespeichert
```

### Garmin Screenshot Integration

Statt API-Integration: Nutzer fotografiert Garmin Connect Screenshots. KI liest Werte heraus (Distanz, Pace, Herzrate, Kalorien etc.) und weist auf fehlende Screens hin:
> "Körpergewicht im Profil eintragen → genauere Kalorien"

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Web Frontend | React + TypeScript |
| Mobile | React Native + Expo (geplant) |
| Backend | Java 21, Spring Boot 3.x, Maven |
| Datenbank | PostgreSQL + Flyway-Migrationen |
| Auth | Spring Security + JWT |
| KI | Claude API (`claude-opus-4-8`) – Text + Bildanalyse |
| UI-Bibliothek | shadcn/ui + Tailwind v4 |
| Deployment | Railway + GitHub Actions CI (geplant) |

### Entwicklungsreihenfolge

1. ✅ **Backend** – Spring Boot + PostgreSQL + Auth
2. ✅ **KI-Integration** – Claude API für Bild + Textanalyse
3. ✅ **Web-Frontend** – React
4. ⬜ **Mobile** – React Native + Expo

---

## Implementierungsstand

### ✅ Vollständig umgesetzt

| Feature | Details |
|---|---|
| Auth (JWT) | Registrierung, Login, Token-basierte Absicherung |
| Profil | Freitext-Felder + goal_tags Chips + Körperdaten + Geschlecht + Aktivitätslevel |
| Mahlzeit loggen | Foto(s) + Freitext → KI-Analyse mit Makros, Ziel-Feedback, Zutaten-Tipps |
| Mahlzeit-Kategorisierung | meal_type (Frühstück/Mittagessen/Abendessen/Snack), eaten_at, Datepicker |
| Quick-Log | Rezept direkt ohne KI-Analyse speichern (`POST /meals/quick`) |
| Training loggen | Manuell oder Garmin Screenshot → KI-Analyse mit MET-Kalorien, missing_data |
| Dashboard | Tages- und Wochen-Ringdiagramme (SVG) + Nährwert-Analyse-Karte mit Heute/Woche-Tab |
| Tagesziel-Berechnung | Mifflin-St Jeor BMR × PAL-Faktor, Makro-Split nach goal_tags |
| KI-Insights | Täglich + wöchentlich, Upsert (kein Duplikat), "Neu analysieren"-Button |
| Vorratsschrank | Text + Foto → KI-Extraktion → Bestätigen → Speichern; Zutaten-Bewertung (★★★) + Rezeptvorschläge; freier Kontext-Hinweis ("ich bin krank"); "Als Mahlzeit loggen"-Button |
| Ziel-Feedback | `goal_alignment` — zielspezifische Einschätzung nach jeder Mahlzeit |
| Zutaten-Tipps | `ingredient_tips` — konkrete Lebensmittel zur Schließung der Tageslücke |
| goal_tags | 6 vordefinierte Ziel-Chips im Profil, beeinflussen Makro-Split und KI-Kontext |

### ⬜ Noch ausstehend

- **Deployment** — Railway + GitHub Actions CI
- **Mobile App** — React Native + Expo (Phase 4)
- **Gewichtsverlauf** — eigene Tracking-Kurve
- **Push Notifications** — tägliche Erinnerungen
- **Garmin API** — falls Zugang möglich (aktuell Screenshot-basiert)
- **Export** — PDF/CSV

---

## Datenmodell

### Aktuelle Entitäten

**USER**
- id (UUID), email, name, password_hash, created_at

**PROFILE**
- id (UUID), user_id (FK)
- goals (TEXT) — Freitext-Ziele
- goal_tags (TEXT) — JSON-Array: `["Muskelaufbau","Ausdauer verbessern"]`
- diet (TEXT), sports (TEXT)
- body_weight (DECIMAL), height (INT), age (INT)
- gender (VARCHAR: `male` | `female` | `diverse`)
- activity_level (VARCHAR: `sedentary` | `lightly_active` | `moderately_active` | `very_active` | `extra_active`)
- updated_at

**MEAL_LOG**
- id (UUID), user_id (FK)
- text_input (TEXT), summary (TEXT)
- calories (INT), protein (INT), carbs (INT), fat (INT)
- feedback (TEXT), tip (TEXT)
- goal_alignment (TEXT) — zielspezifisches KI-Feedback
- ingredient_tips (TEXT) — JSON-Array mit Lebensmittelempfehlungen
- meal_type (VARCHAR: `breakfast` | `lunch` | `dinner` | `snack`) — optional
- eaten_at (TIMESTAMPTZ) — Aktivitätsdatum (≠ logged_at)
- logged_at (TIMESTAMPTZ)

**WORKOUT_LOG**
- id (UUID), user_id (FK)
- type (VARCHAR: `running` | `crossfit` | `cycling` | `other`)
- duration_minutes (INT), notes (TEXT)
- summary (TEXT), feedback (TEXT)
- performed_at (TIMESTAMPTZ) — Aktivitätsdatum (≠ logged_at)
- logged_at (TIMESTAMPTZ)

**WORKOUT_METRIC** — strukturierte Werte aus Garmin Screenshot
- id (UUID), workout_log_id (FK)
- distance_km (DECIMAL), pace_per_km (TEXT)
- avg_heart_rate (INT), max_heart_rate (INT), calories_burned (INT)
- missing_data (TEXT) — JSON-Array mit Hinweisen auf fehlende Daten

**AI_INSIGHT**
- id (UUID), user_id (FK)
- type (VARCHAR: `daily` | `weekly`)
- period_start (DATE), period_end (DATE)
- content (TEXT)
- created_at
- UNIQUE (user_id, type, period_start)

**PANTRY_ITEM**
- id (UUID), user_id (FK)
- name (TEXT), quantity (TEXT) — optional
- added_at (TIMESTAMPTZ)

### Flyway-Migrationen (V1–V14)

| Version | Inhalt |
|---|---|
| V1–V3 | user, profile, meal_log Basistabellen |
| V4 | workout_log + workout_metric |
| V5 | goal_alignment in meal_log |
| V6 | ai_insight |
| V7 | workout type zu VARCHAR |
| V8 | gender + activity_level in profile |
| V9 | eaten_at (meal_log) + performed_at (workout_log) |
| V10 | meal_type in meal_log |
| V11 | type in ai_insight + ingredient_tips in meal_log |
| V12 | goal_tags in profile |
| V13 | pantry_item |
| V14 | UNIQUE-Constraint auf ai_insight |

### KI-Kontext Aufbau (Backend-Logik)

Bei jeder Mahlzeit-Anfrage:
1. PROFILE (immer) — inkl. goal_tags + Körperdaten
2. Heutiger Makrostand (Summe aller eaten_at = heute)
3. Berechnete Tagesziele (Mifflin-St Jeor)
4. meal_type (wenn angegeben)
5. Foto(s) + Freitext des Nutzers

---

## KI-Integration

### Modell
- `claude-opus-4-8`
- Multimodal: Text + Bilder (Fotos von Mahlzeiten, Verpackungen, Garmin Screenshots, Kühlschrank)

### Mahlzeit-Analyse — JSON-Response

```json
{
  "summary": "kurze Beschreibung der Mahlzeit",
  "calories": 450,
  "protein": 28,
  "carbs": 52,
  "fat": 12,
  "feedback": "allgemeine Bewertung",
  "tip": "optionaler Tipp",
  "goal_alignment": "Wie zahlt diese Mahlzeit konkret auf die Ziele ein?",
  "ingredient_tips": ["Tofu 150g → schließt Protein-Lücke", "Haferflocken → Carbs für Ausdauer"]
}
```

### Workout-Analyse — JSON-Response

```json
{
  "summary": "kurze Bewertung",
  "distance_km": 8.2,
  "pace_per_km": "5:43",
  "avg_heart_rate": 158,
  "max_heart_rate": 174,
  "calories_burned": 520,
  "feedback": "Bewertung + Kalorienschätzungsbasis",
  "missing_data": ["Herzraten-Screen wäre hilfreich"]
}
```

### Vorratsschrank-Analyse — JSON-Response

```json
{
  "ingredient_ratings": [
    { "name": "Kichererbsen", "stars": 3, "reason": "top für Protein-Lücke heute" }
  ],
  "recipes": [
    {
      "name": "Kichererbsen-Curry",
      "ingredients": ["Kichererbsen", "Spinat", "Kokosmilch"],
      "steps": "...",
      "calories": 420,
      "protein": 18,
      "carbs": 45,
      "fat": 14,
      "goal_fit": "Passt gut zu Muskelaufbau-Ziel"
    }
  ]
}
```

### Tagesziel-Berechnung (ProfileService)

```
BMR (Mifflin-St Jeor):
  Männer:  10 × kg + 6.25 × cm − 5 × alter + 5
  Frauen:  10 × kg + 6.25 × cm − 5 × alter − 161
  Divers:  Mittelwert

TDEE = BMR × PAL-Faktor (1.2 – 1.9)

Makro-Split nach goal_tags:
  Muskelaufbau:      TDEE + 200 kcal, Protein 2.0g/kg
  Gewicht verlieren: TDEE − 300 kcal, Protein 1.8g/kg
  Standard/Ausdauer: TDEE,            Protein 1.4g/kg
  Fett: ~28% der Kalorien, Rest: Kohlenhydrate
```

---

## API-Endpunkte

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Profil
- `GET  /api/v1/profile`
- `PUT  /api/v1/profile`
- `GET  /api/v1/profile/goals` — berechnete Tagesziele

### Mahlzeiten
- `POST /api/v1/meals` — loggen mit KI-Analyse
- `POST /api/v1/meals/quick` — loggen ohne KI (z.B. Rezept aus Vorrat)
- `GET  /api/v1/meals` — Historie
- `PUT  /api/v1/meals/:id` — bearbeiten + neu analysieren
- `GET  /api/v1/meals/today` — Tagessumme + Mahlzeiten heute
- `GET  /api/v1/meals/week` — Wochensumme

### Training
- `POST /api/v1/workouts`
- `GET  /api/v1/workouts`
- `PUT  /api/v1/workouts/:id`
- `GET  /api/v1/workouts/today`

### Insights
- `POST /api/v1/insights/generate?type=daily|weekly` — generieren/überschreiben
- `POST /api/v1/insights/:id/regenerate`
- `GET  /api/v1/insights?type=daily|weekly`

### Vorrat
- `GET    /api/v1/pantry` — alle Einträge
- `POST   /api/v1/pantry/items` — Zutaten hinzufügen
- `DELETE /api/v1/pantry/items/:id`
- `POST   /api/v1/pantry/extract` — Foto → KI extrahiert Zutaten-Liste
- `POST   /api/v1/pantry/analyze` — KI-Analyse mit optionalem Kontext-Hinweis (`{ note: "..." }`)

---

## UI / Screens

### Hauptscreens (Bottom Nav)
1. **Dashboard** — Tages-/Wochen-Ringdiagramme + Nährwert-Analyse-Karte + heutige Mahlzeiten + Training
2. **Log** — Mahlzeit / Training loggen (Tabs), scrollbare Historie mit KI-Analyse-Cards
3. **Vorrat** — Zutaten verwalten (Text/Foto), KI-Analyse mit Kontext, Rezeptvorschläge
4. **Profil** — goal_tags Chips + Freitext-Felder + Körperdaten + Geschlecht + Aktivitätslevel
5. **Insights** — KI-Zusammenfassungen täglich/wöchentlich (Tabs), "Neu analysieren"

### Design-Prinzipien
- Minimalistisch, mobile-first
- Primärfarbe: `#16A34A` (Grün) für Aktionen, neutrale Grautöne für Struktur
- Ringdiagramme: Kalorien = Grün, Protein = Blau, Kohlenhydrate = Gelb, Fett = Orange
- Keine externe Chart-Bibliothek — reine SVG-Lösung

---

## Konventionen

### Backend (Spring Boot)

- Java 21, Spring Boot 3.x, Maven
- Package-Struktur: `com.fueld.<feature>` (z.B. `com.fueld.meal`)
- Pro Feature: Controller, Service, Repository, DTO, Entity
- DTOs für API-Kommunikation, Entities nicht direkt zurückgeben
- Serialisierung: Jackson camelCase (kein snake_case in API-Responses)
- `@JsonProperty` nur in internen AI-Parsing-Records (snake_case von Claude → camelCase für API)
- REST-Endpunkte unter `/api/v1/...`
- Fotos: Base64 an Claude API, kein persistenter Speicher

### Frontend (React)

- Functional Components mit Hooks
- TypeScript
- API-Calls über zentrales `apiClient`-Modul (`src/lib/apiClient`)
- Komponentenstruktur: `src/features/<feature>/...`
- Shared components: `src/components/`

### Datenbank

- Migrationen mit Flyway (V1–V14)
- Tabellen-Namen: `snake_case`, Singular
- IDs als UUID
- Aktivitätszeitpunkt (`eaten_at`, `performed_at`) getrennt von Eintragszeitpunkt (`logged_at`)

### Git

- Feature-Branches: `feature/<kurze-beschreibung>`
- Commits auf Deutsch oder Englisch (konsistent)

---

## Was Claude Code wissen sollte

- Solo-Entwickler in der Freizeit
- React solide, Spring Boot grundlegend
- Datenbank-Erfahrung dünn – Konzepte bitte miterkläre
- Docker und Deployment will ich aktiv lernen
- Bei Architektur-Entscheidungen kurz zurückfragen
- Code soll lesbar und nachvollziehbar sein, nicht clever
- Die App wird primär vom Entwickler selbst genutzt (Marcus, Fenix 7 Pro, vegan/vegetarisch, Crossfit + Laufen + Gravel-Bike)
