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
| Web Frontend | React + TypeScript + Vite |
| Mobile | PWA (installierbar auf iPhone/Android) |
| Backend | Java 25, Spring Boot 4.1.1, Maven |
| Datenbank | PostgreSQL + Flyway-Migrationen |
| Auth | Spring Security + JWT |
| KI | Claude API (`claude-sonnet-5`) – Text + Bildanalyse |
| UI-Bibliothek | shadcn/ui + Tailwind v4 |
| Deployment | Railway (Backend + PostgreSQL) + Vercel (Frontend) |
| CI | GitHub Actions – Build-Check bei jedem Push auf main |

### Entwicklungsreihenfolge

1. ✅ **Backend** – Spring Boot + PostgreSQL + Auth
2. ✅ **KI-Integration** – Claude API für Bild + Textanalyse
3. ✅ **Web-Frontend** – React
4. ✅ **Deployment** – Railway + Vercel + PWA
5. ⬜ **Mobile App** – React Native + Expo (optional, PWA reicht vorerst)

---

## Implementierungsstand

### ✅ Vollständig umgesetzt

| Feature | Details |
|---|---|
| Auth (JWT) | Registrierung, Login, Token-basierte Absicherung |
| Profil | Freitext-Felder + goal_tags Chips + Körperdaten + Geschlecht + Aktivitätslevel |
| Mahlzeit loggen | Kamera/Galerie + Freitext → KI-Analyse mit Makros, Ziel-Feedback, Zutaten-Tipps |
| Mahlzeit-Kategorisierung | meal_type (Frühstück/Mittagessen/Abendessen/Snack), eaten_at, Datepicker |
| Quick-Log | Rezept direkt ohne KI-Analyse speichern (`POST /meals/quick`) |
| Training loggen | Manuell oder Garmin Screenshot → KI-Analyse mit MET-Kalorien, missing_data |
| Dashboard | Konzentrische Ringe (Apple Watch-Stil, SVG) + Heute/Woche-Tab + zeitbasierte Begrüßung mit Name |
| Tagesziel-Berechnung | Mifflin-St Jeor BMR × PAL-Faktor, Makro-Split nach goal_tags |
| KI-Insights | Täglich + wöchentlich, Upsert (kein Duplikat), "Neu analysieren"-Button |
| Vorratsschrank | Text + Foto/Kamera → KI-Extraktion → Bestätigen → Speichern; Zutaten-Bewertung (★★★) + Rezeptvorschläge; freier Kontext-Hinweis; "Als Mahlzeit loggen"-Button |
| Ziel-Feedback | `goal_alignment` — zielspezifische Einschätzung nach jeder Mahlzeit |
| Zutaten-Tipps | `ingredient_tips` — konkrete Lebensmittel zur Schließung der Tageslücke |
| goal_tags | 6 vordefinierte Ziel-Chips im Profil, beeinflussen Makro-Split und KI-Kontext |
| Gewichtsverlauf | Eintragen im Profil, SVG-Linienchart, letzte 5 Einträge + Löschen |
| Körperzusammensetzung | Xiaomi Scale S400 Screenshot → KI extrahiert Gewicht, BMI, Körperfett, Muskelmasse, Knochenmasse, Wasser; Bestätigen + Bearbeiten vor dem Speichern |
| KI-Analyse für Quick-Log | "KI-Analyse starten"-Button auf Mahlzeiten ohne Makros (z.B. nach Quick-Log) |
| Nährwerte im Vorrat | Foto-Extraktion liefert Kalorien/Protein/Carbs/Fett pro 100g (exakt bei sichtbarem Etikett, geschätzt sonst); Anzeige in Bestätigung + Vorratsliste |
| Deployment | Railway (Backend + PostgreSQL) + Vercel (Frontend), auto-deploy bei Push auf main |
| PWA | Installierbar auf iPhone/Android ("Zum Home-Bildschirm"), Kamera-Direktzugriff |

### ⬜ Noch ausstehend

- **Push Notifications** — tägliche Erinnerungen
- **Garmin API** — falls Zugang möglich (aktuell Screenshot-basiert)
- **Export** — PDF/CSV
- **Mobile App** — React Native + Expo (optional, da PWA funktioniert)
- **Produkt-Cache** — einmal per KI extrahierte Produkt-Nährwerte (Name → Kalorien/Protein/Carbs/Fett pro 100g) in eigener Tabelle zwischenspeichern; bei bekannten Produkten werden die gecachten Werte als Kontext in den KI-Prompt eingespeist statt die KI komplett zu ersetzen (Konsistenz + geringere Kosten, KI bleibt aber im Loop für Zubereitungs-Details). Ähnliches Prinzip existiert bereits ansatzweise bei `PANTRY_ITEM`. Offene Frage: Matching über Produktname (unscharf) oder Barcode (exakt, mehr UI-Aufwand)

---

## Deployment

### Infrastruktur

| Service | Plattform | URL |
|---|---|---|
| Backend (Spring Boot) | Railway | `https://<name>.up.railway.app` |
| Datenbank (PostgreSQL) | Railway (Plugin) | intern |
| Frontend (React) | Vercel | `https://<name>.vercel.app` |

### Railway – Backend

- Root Directory: `backend/`
- Build: Dockerfile (multi-stage Maven → JRE 25 Alpine)
- Health-Check: `GET /api/v1/health`
- Pflicht-Env-Vars:
  ```
  PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD  ← aus Railway PostgreSQL-Plugin
  JWT_SECRET        ← openssl rand -base64 32
  ANTHROPIC_API_KEY ← Anthropic Console
  ALLOWED_ORIGINS   ← Vercel-URL (z.B. https://fueld.vercel.app)
  ```
- Spring-Profil: `prod` (via Dockerfile ENTRYPOINT)

### Vercel – Frontend

- Root Directory: `frontend/`
- Framework: Vite (auto-erkannt)
- Pflicht-Env-Var:
  ```
  VITE_API_URL = https://<railway-url>/api/v1
  ```
- SPA-Routing via `vercel.json` (alle Pfade → index.html)

### Lokale Entwicklung

- Backend läuft auf Port 8080, Postgres auf Port 5433 (docker-compose)
- Frontend: `npm run dev` → `http://localhost:5173`
- `VITE_API_URL` nicht gesetzt → fallback `http://localhost:8080/api/v1`

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
- calories_per_100g (INT), protein_per_100g (DECIMAL), carbs_per_100g (DECIMAL), fat_per_100g (DECIMAL) — optional
- added_at (TIMESTAMPTZ)

**WEIGHT_LOG**
- id (UUID), user_id (FK)
- weight (DECIMAL 5,1) — Körpergewicht in kg
- bmi (DECIMAL 4,1), body_fat_pct (DECIMAL 4,1), muscle_mass_pct (DECIMAL 4,1), bone_mass_kg (DECIMAL 4,1), water_pct (DECIMAL 4,1) — optional, aus Xiaomi Screenshot
- logged_at (TIMESTAMPTZ)

### Flyway-Migrationen (V1–V17)

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
| V15 | weight_log |
| V16 | Körperzusammensetzungs-Felder in weight_log (bmi, body_fat_pct, etc.) |
| V17 | Nährwerte pro 100g in pantry_item |

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
- `claude-sonnet-5`
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

### Vorratsschrank-Extraktion — JSON-Response (pro Zutat)

```json
{
  "items": [
    {
      "name": "Kichererbsen",
      "quantity": "400g Dose",
      "calories_per_100g": 164,
      "protein_per_100g": 8.9,
      "carbs_per_100g": 27.4,
      "fat_per_100g": 2.6
    }
  ]
}
```

### Körperzusammensetzungs-Analyse (Xiaomi) — JSON-Response

```json
{
  "weight": 78.5,
  "bmi": 23.4,
  "body_fat_pct": 18.2,
  "muscle_mass_pct": 44.1,
  "bone_mass_kg": 3.2,
  "water_pct": 58.6
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

### Gewicht
- `POST   /api/v1/weight` — Eintrag loggen (inkl. optionaler Körperzusammensetzung)
- `POST   /api/v1/weight/analyze` — Xiaomi Screenshot → KI extrahiert Körperzusammensetzung
- `GET    /api/v1/weight` — Historie (neueste zuerst)
- `DELETE /api/v1/weight/:id`

### Vorrat
- `GET    /api/v1/pantry` — alle Einträge
- `POST   /api/v1/pantry/items` — Zutaten hinzufügen
- `DELETE /api/v1/pantry/items/:id`
- `POST   /api/v1/pantry/extract` — Foto → KI extrahiert Zutaten-Liste
- `POST   /api/v1/pantry/analyze` — KI-Analyse mit optionalem Kontext-Hinweis (`{ note: "..." }`)

### System
- `GET /api/v1/health` — Health-Check (öffentlich, für Railway)

---

## UI / Screens

### Hauptscreens (Bottom Nav)
1. **Dashboard** — Tages-/Wochen-Ringdiagramme + Nährwert-Analyse-Karte + heutige Mahlzeiten + Training
2. **Log** — Mahlzeit / Training loggen (Tabs), scrollbare Historie mit KI-Analyse-Cards
3. **Vorrat** — Zutaten verwalten (Text/Foto/Kamera), KI-Analyse mit Kontext, Rezeptvorschläge
4. **Profil** — goal_tags Chips + Freitext-Felder + Körperdaten + Gewichtsverlauf (SVG-Chart) + Aktivitätslevel
5. **Insights** — KI-Zusammenfassungen täglich/wöchentlich (Tabs), "Neu analysieren"

### Design-Prinzipien
- Minimalistisch, mobile-first
- Primärfarbe: `#16A34A` (Grün) für Aktionen, neutrale Grautöne für Struktur
- Ringdiagramme: Kalorien = Grün, Protein = Blau, Kohlenhydrate = Gelb, Fett = Orange
- Keine externe Chart-Bibliothek — reine SVG-Lösung
- PWA: Kamera-Button (`capture="environment"`) + Galerie-Button getrennt (iOS-Bug: `multiple` blockiert Kamera)

---

## Konventionen

### Backend (Spring Boot)

- Java 25, Spring Boot 4.1.1, Maven
- Package-Struktur: `com.fueld.<feature>` (z.B. `com.fueld.meal`)
- Pro Feature: Controller, Service, Repository, DTO, Entity
- DTOs für API-Kommunikation, Entities nicht direkt zurückgeben
- Serialisierung: Jackson 3 (`tools.jackson.databind.ObjectMapper` / `TypeReference`), camelCase (kein snake_case in API-Responses)
- `@JsonProperty`/`@JsonIgnoreProperties` bleiben unter `com.fasterxml.jackson.annotation` (Jackson 3 ändert dort nichts) — nur in internen AI-Parsing-Records (snake_case von Claude → camelCase für API)
- Flyway: `spring-boot-starter-flyway` statt `flyway-core` (Boot 4 autokonfiguriert Flyway sonst nicht mehr)
- REST-Endpunkte unter `/api/v1/...`
- Fotos: Base64 an Claude API, kein persistenter Speicher
- CORS: via `app.allowed-origins` Env-Var (kommagetrennt), Standard: `http://localhost:*`

### Frontend (React)

- Functional Components mit Hooks
- TypeScript (`tsconfig.app.json` mit `"ignoreDeprecations": "6.0"` wegen baseUrl)
- API-Calls über zentrales `apiClient`-Modul (`src/lib/apiClient`)
- Komponentenstruktur: `src/features/<feature>/...`
- Shared components: `src/components/`
- Pantry-Analyse wird in `sessionStorage` gehalten (bleibt bei Tab-Wechsel erhalten)

### Datenbank

- Migrationen mit Flyway (V1–V17)
- Tabellen-Namen: `snake_case`, Singular
- IDs als UUID
- Aktivitätszeitpunkt (`eaten_at`, `performed_at`) getrennt von Eintragszeitpunkt (`logged_at`)

### Git

- Feature-Branches: `feature/<kurze-beschreibung>`
- Commits auf Deutsch oder Englisch (konsistent)
- Push auf `main` → Railway + Vercel deployen automatisch

---

## Was Claude Code wissen sollte

- Solo-Entwickler in der Freizeit
- React solide, Spring Boot grundlegend
- Datenbank-Erfahrung dünn – Konzepte bitte miterkläre
- Bei Architektur-Entscheidungen kurz zurückfragen
- Code soll lesbar und nachvollziehbar sein, nicht clever
- Die App wird primär vom Entwickler selbst genutzt (Marcus, Fenix 7 Pro, vegan/vegetarisch, Crossfit + Laufen + Gravel-Bike)
- App läuft produktiv auf Railway + Vercel, wird täglich vom Entwickler genutzt
