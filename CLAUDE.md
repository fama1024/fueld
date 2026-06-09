# Fueld

## Projektübersicht

Fueld ist eine persönliche Fitness- und Ernährungs-Tracking-App mit KI-Analyse. Der Nutzer fotografiert Mahlzeiten und Verpackungen, trägt Trainingseinheiten ein (manuell oder per Garmin-Screenshot), und bekommt von der KI personalisiertes Feedback basierend auf seinen Zielen und seiner Historie.

### Kernidee

Zwei Ebenen:
1. **Profil (statisch)** – Ziele, Ernährungsweise, Sportarten als Freitext. Ist immer Teil des KI-Kontexts.
2. **Log (wächst täglich)** – Mahlzeiten + Trainingseinheiten. KI nutzt die gesamte Historie für immer bessere Analysen.

### KI-Analyse Flow

```
Nutzer schickt: Foto(s) + Freitext
                    ↓
KI kennt: Profil + letzte 14 Tage Historie
                    ↓
KI antwortet: Bewertung + Makros + Empfehlung
                    ↓
Wird strukturiert in Datenbank gespeichert
```

### Garmin Screenshot Integration

Statt API-Integration: Nutzer fotografiert Garmin Connect Screenshots. KI liest Werte heraus (Distanz, Pace, Herzrate etc.) und fragt proaktiv nach fehlenden Screens:
> "Für eine vollständige Analyse wäre noch der Herzraten-Screen hilfreich."

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Web Frontend | React |
| Mobile | React Native + Expo |
| Backend | Java Spring Boot + Maven |
| Datenbank | PostgreSQL |
| Auth | Spring Security + JWT |
| KI | Claude API (claude-sonnet-4-20250514) – Text + Bildanalyse |
| Deployment | Railway + GitHub Actions CI |

### Entwicklungsreihenfolge

1. **Backend** – Spring Boot + PostgreSQL + Auth
2. **KI-Integration** – Claude API für Bild + Textanalyse
3. **Web-Frontend** – React
4. **Mobile** – React Native + Expo

---

## Datenmodell

### Kernentitäten

**USER** – Nutzerkonto
- id (UUID), email, name, password_hash, created_at

**PROFILE** – Persönlicher KI-Kontext (einmalig, wird gepflegt)
- id (UUID), user_id (FK)
- goals (TEXT) – Freitext: z.B. "Muskeln aufbauen, Bauchfett verlieren"
- diet (TEXT) – Freitext: z.B. "vegan/vegetarisch"
- sports (TEXT) – Freitext: z.B. "Crossfit, Laufen, Gravel-Bike"
- body_weight (DECIMAL), height (INT), age (INT) – optional
- updated_at

**MEAL_LOG** – Eine Mahlzeit
- id (UUID), user_id (FK)
- text_input (TEXT) – Freitext des Nutzers: z.B. "Kichererbsen dazu gemischt"
- ai_analysis (TEXT) – vollständige KI-Antwort gespeichert
- calories (INT), protein (DECIMAL), carbs (DECIMAL), fat (DECIMAL) – aus KI extrahiert
- logged_at, created_at

**MEAL_PHOTO** – Fotos zu einer Mahlzeit (mehrere möglich)
- id (UUID), meal_log_id (FK)
- photo_url (TEXT)
- photo_type (ENUM: `packaging` | `meal`)
- created_at

**WORKOUT_LOG** – Eine Trainingseinheit
- id (UUID), user_id (FK)
- type (ENUM: `running` | `crossfit` | `cycling` | `other`)
- duration_minutes (INT)
- notes (TEXT) – Freitext
- ai_analysis (TEXT) – KI-Antwort
- logged_at, created_at

**WORKOUT_METRIC** – Strukturierte Werte aus Garmin Screenshot
- id (UUID), workout_log_id (FK)
- distance_km (DECIMAL)
- pace_per_km (TEXT) – z.B. "5:43"
- avg_heart_rate (INT)
- max_heart_rate (INT)
- calories_burned (INT)

**AI_INSIGHT** – Wöchentliche KI-Zusammenfassung
- id (UUID), user_id (FK)
- period_start (DATE), period_end (DATE)
- content (TEXT)
- created_at

### KI-Kontext Aufbau (Backend-Logik)

Bei jeder KI-Anfrage werden kombiniert:
1. PROFILE des Nutzers (immer)
2. Letzte 14 Tage MEAL_LOG + WORKOUT_LOG (als Kontext)
3. Neuer Eintrag (Foto + Text)

---

## KI-Integration

### Modell
- claude-sonnet-4-20250514
- Multimodal: Text + Bilder (Fotos von Mahlzeiten, Verpackungen, Garmin Screenshots)

### Mahlzeit-Analyse Prompt Struktur

```
System:
Du bist ein Ernährungsberater. Hier ist das Profil des Nutzers:
[PROFILE]

Letzte 14 Tage:
[MEAL_LOG + WORKOUT_LOG]

Aufgabe: Analysiere die neue Mahlzeit. Antworte in JSON:
{
  "summary": "kurze Bewertung",
  "calories": 450,
  "protein": 28,
  "carbs": 52,
  "fat": 12,
  "feedback": "passt gut zu deinen Zielen weil...",
  "tip": "optional: Empfehlung"
}

User:
[Foto(s) + Freitext]
```

### Workout-Analyse Prompt Struktur

```
System:
Du bist ein Fitness-Coach. Hier ist das Profil des Nutzers:
[PROFILE]

Letzte 14 Tage:
[WORKOUT_LOG]

Aufgabe: Analysiere das Training aus dem Screenshot.
Extrahiere alle sichtbaren Metriken.
Falls wichtige Daten fehlen, frage gezielt nach (z.B. Herzraten-Screen).

Antworte in JSON:
{
  "summary": "kurze Bewertung",
  "distance_km": 8.2,
  "pace_per_km": "5:43",
  "avg_heart_rate": 158,
  "max_heart_rate": 174,
  "calories_burned": 520,
  "feedback": "...",
  "missing_data": ["Herzraten-Zonen Screen wäre hilfreich"]
}
```

---

## MVP-Scope (Phase 1)

**In Scope:**
- User-Registrierung und Login (JWT)
- Profil anlegen und bearbeiten (Freitext)
- Mahlzeit loggen: Foto(s) + Freitext → KI-Analyse mit explizitem Ziel-Feedback (s.u.)
- Training loggen: manuell oder Garmin Screenshot → KI-Analyse
- Tagesübersicht: Kalorien + Makros + Trainingseinheiten
- Wöchentliche KI-Zusammenfassung
- Historie (scrollbare Liste aller Einträge)

### Ziel-Feedback nach Mahlzeit

Nach dem Loggen soll der Nutzer direkt sehen, wie die Mahlzeit auf seine konkreten Ziele eingezahlt hat — nicht nur eine generische Bewertung, sondern eine klare Einschätzung bezogen auf sein Profil. Beispiele:

- "Protein trifft deinen Bedarf für Muskelaufbau gut."
- "Für einen Gravel-Tag mit hohem Energiebedarf etwas wenig Kohlenhydrate."
- "Passt zur veganen Ernährung, gute Aminosäure-Kombination."

**Umsetzung (noch offen):**
- Eigenes JSON-Feld `goal_alignment` im KI-Response (1–2 Sätze, zielspezifisch)
- Im Prompt explizit anweisen: Ziele aus dem Profil direkt adressieren, nicht pauschal loben
- UI: prominent unter den Makros anzeigen, visuell abgesetzt vom allgemeinen Feedback

### KI-Insights: Täglich + Wöchentlich mit Neu-Analyse

Aktuell können nur neue Insights generiert werden (`POST /insights/generate`). Geplante Verbesserungen:

**Zwei Insight-Typen:**
- **Täglich** — kurze Tagesauswertung: Wie war der Tag ernährungstechnisch? Ziele erreicht? Was morgen besser machen?
- **Wöchentlich** — tiefere Analyse: Muster über die Woche, Fortschritt in Richtung Fitnessziele, Trends bei Makros + Training

**Neu-Analyse bestehender Insights:**
- Jeder Insight (täglich oder wöchentlich) hat einen "Neu analysieren"-Button
- Überschreibt den bestehenden Eintrag für denselben Zeitraum statt einen neuen zu erstellen
- Sinnvoll wenn z.B. am Abend noch Einträge nachgetragen wurden oder man eine frischere Einschätzung will
- Backend-Logik: prüfe ob für denselben Zeitraum (Tag / Kalenderwoche) bereits ein Insight existiert → wenn ja, Update statt Insert

**Datenmodell-Erweiterung:**
- Neues Feld `type` (ENUM: `daily` | `weekly`) in `ai_insight`
- `period_start` + `period_end` bereits vorhanden — für täglich: gleicher Tag; für wöchentlich: Mo–So
- Unique-Constraint: `(user_id, type, period_start)` — verhindert doppelte Insights für denselben Zeitraum

**UI:**
- Insights-Screen zeigt beide Tabs: "Täglich" und "Wöchentlich"
- Neuester Eintrag oben, ältere darunter zusammengeklappt
- "Neu analysieren" Button bei jedem Insight (nicht nur beim neuesten)
- Beim ersten Öffnen des Tages / der Woche: Hinweis "Noch kein Insight für heute — jetzt generieren?"

### Mahlzeit-Kategorisierung

Beim Loggen einer Mahlzeit soll der Nutzer optional angeben können:
- **Mahlzeittyp** (Frühstück, Mittagessen, Abendessen, Snack) — per Klick auswählbar, kein Pflichtfeld
- **Uhrzeit** — optional, Standard ist die aktuelle Uhrzeit

**Umsetzung (noch offen):**
- Neues Feld `meal_type` (ENUM: `breakfast` | `lunch` | `dinner` | `snack`) in `meal_log`
- Neues Feld `eaten_at` (TIMESTAMPTZ) — getrennt von `logged_at`
- UI: Kompakte Chip-Auswahl über dem Textfeld, Uhrzeitfeld optional einblendbar
- KI-Kontext: Mahlzeittyp + Uhrzeit im Prompt mitgeben für kontextbewusstere Analyse ("Abendessen um 21:30 — weniger Kohlenhydrate sinnvoll")

### Ziele im Profil: Schnellauswahl + Freitext

Das aktuelle Profil nutzt reinen Freitext für Ziele. Ergänzend sollen vordefinierten Ziele per Klick wählbar sein:

**Standard-Ziele (Toggle-Chips):**
- Muskelaufbau
- Gewicht verlieren
- Gewicht halten
- Ausdauer verbessern
- Mehr Energie im Alltag
- Besserer Schlaf

**Umsetzung (noch offen):**
- Ausgewählte Chips werden als strukturiertes Array gespeichert (neues Feld `goal_tags` in `profile`)
- Freies Textfeld bleibt für individuelle Ergänzungen
- KI-Prompt nutzt `goal_tags` zusätzlich zu `goals` für präzisere Analyse

### Datum bei Mahlzeit und Training

Wenn der Nutzer eine Mahlzeit oder ein Training für ein anderes Datum einträgt (z.B. nachträglich oder im Voraus), soll dieses Datum als Aktivitätsdatum gelten — nicht der Zeitpunkt des Eintragens.

**Umsetzung (noch offen):**
- Neues Feld `performed_at` (TIMESTAMPTZ) in `workout_log` — getrennt von `logged_at` (= Eintragszeitpunkt)
- `eaten_at` in `meal_log` dient demselben Zweck (bereits geplant unter Mahlzeit-Kategorisierung)
- UI: Datumsfeld mit Default "Heute", editierbar per Datepicker
- KI-Option: Datum aus Freitext extrahieren (z.B. "am 04.06.2026 von Farchant nach Garmisch") und automatisch setzen, Hinweis im `summary`
- Dashboard und Tagesfilter filtern nach `performed_at` / `eaten_at`, nicht nach `logged_at`

### Empfohlene Zutaten nach Mahlzeit (Tagesziel-Lücke)

Nach jeder Mahlzeit zeigt die KI, welche Lebensmittel helfen würden, das Tages- oder Wochenziel noch zu erreichen — konkret auf die verbleibende Makro-Lücke zugeschnitten, nicht generisch.

Beispiele:
- "Protein-Lücke heute: noch 55g fehlen → Tofu (150g = 18g), Tempeh, Hülsenfrüchte"
- "Für dein Ausdauer-Wochenziel fehlen noch Kohlenhydrate → Haferflocken, Süßkartoffel, Banane"
- Berücksichtigt Fitness-Ziele aus dem Profil (Muskelaufbau → Protein priorisieren, Ausdauer → Carbs)

**Umsetzung (noch offen):**
- Neues JSON-Feld `ingredient_tips` (Array von Objekten: `{ ingredient, reason, estimated_contribution }`) im KI-Response
- Prompt kennt: Profil-Ziele + heutige Tagessumme (Makros) + Tagesziele (aus Mifflin-St Jeor Berechnung)
- KI berechnet Delta (Ziel − bereits gegessen) und schlägt konkret Lebensmittel vor, die die Lücke schließen
- UI: Kleine Karten unter der Mahlzeit-Analyse, mit Lebensmittelname + Grund + geschätzter Beitrag

### Virtueller Vorratsschrank

Der Nutzer pflegt einen persistenten digitalen Vorrat — per Foto, Freitext oder manuell. Die KI bewertet den Vorrat im Kontext der aktuellen Ziele und schlägt Rezepte vor.

#### Vorratsschrank verwalten

Drei Wege um Zutaten hinzuzufügen:
1. **Foto** — Kühlschrank, Regal oder einzelne Verpackung fotografieren → KI extrahiert alle erkennbaren Lebensmittel automatisch
2. **Freitext** — Kommagetrennte Eingabe ("Kichererbsen, Spinat, Reis")
3. **Manuell** — Einzelne Zutat über ein Eingabefeld hinzufügen

Zutaten können einzeln gelöscht werden (z.B. wenn aufgebraucht). Optional: Menge angeben (z.B. "Tofu 400g").

**Datenmodell:**
```
PANTRY_ITEM
- id (UUID), user_id (FK)
- name (TEXT)           -- z.B. "Kichererbsen"
- quantity (TEXT)       -- optional, z.B. "1 Dose", "400g"
- added_at (TIMESTAMPTZ)
```

#### Vorrats-Analyse

Aus dem aktuellen Vorrat heraus:
1. **Zutaten-Bewertung**: Welche Zutaten tragen wie gut zu den heutigen/wöchentlichen Zielen bei?
   - "Kichererbsen: ★★★ — top für Protein-Lücke heute, auch gute Carbs für Ausdauerwoche"
   - "Spinat: ★★★ — Eisen + Ballaststoffe, passt perfekt zur veganen Ernährung"
   - "Weißbrot: ★☆☆ — heute schon genug Carbs"
2. **Rezeptvorschläge**: 2–3 konkrete Rezepte aus dem Vorrat, mit Makros + Ziel-Passung

**Umsetzung (noch offen):**
- Eigener Screen "Vorrat" (5. Nav-Punkt oder Sub-Screen vom Log)
- Foto-Upload → KI extrahiert Zutaten-Liste → Nutzer bestätigt/korrigiert vor dem Speichern
- `GET /api/v1/pantry` — alle Einträge des Nutzers
- `POST /api/v1/pantry` — Zutat(en) hinzufügen (manuell oder aus KI-Extraktion)
- `DELETE /api/v1/pantry/:id` — Zutat entfernen
- `POST /api/v1/pantry/analyze` — KI-Analyse des aktuellen Vorrats (Bewertung + Rezepte), kein Speichern
- KI-Kontext bei Analyse: Profil + Tagesziele + heutiger/wöchentlicher Makrostand + alle Pantry-Items
- KI-Response für Analyse:
  ```json
  {
    "ingredient_ratings": [{ "name": "Kichererbsen", "stars": 3, "reason": "..." }],
    "recipes": [{ "name": "...", "ingredients": [...], "steps": "...", "calories": 420, "protein": 28, "goal_fit": "..." }]
  }
  ```
- UI: Zutaten-Liste mit Löschen-Button + Kamera/Text-Eingabe oben + "Analysieren"-Button → Ergebnisansicht
- "Als Mahlzeit loggen"-Button auf Rezeptkarte übernimmt Rezept direkt in den Meal-Log

### Dashboard: Tagesring-Diagramm (Ziele vs. Ist)

Das Dashboard soll visuell zeigen, wie weit der Nutzer seine Tagesziele erreicht hat — als Ringdiagramme (Donut Charts) für Kalorien, Protein, Kohlenhydrate und Fett.

**Tagesziel-Berechnung aus Profil (automatisch, kein manuelles Ziel nötig):**
- Formel: Mifflin-St Jeor BMR
  - Männer: 10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter + 5
  - Frauen: 10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter − 161
- BMR × Aktivitätsmultiplikator (PAL-Faktor) → TDEE (Total Daily Energy Expenditure)
- Makro-Split basierend auf `goal_tags`:
  - Muskelaufbau: Protein 2.0g/kg, Fett 25%, Rest Kohlenhydrate
  - Gewicht verlieren: Kalorienziel = TDEE − 300 kcal, Protein 1.8g/kg
  - Standard / Ausdauer: Protein 1.4g/kg, Fett 30%, Rest Kohlenhydrate
- Fehlende Profildaten → Hinweis im Dashboard ("Gewicht und Größe im Profil eintragen für präzise Tagesziele")

**Neue Profil-Felder (für Berechnung nötig):**
- `gender` (ENUM: `male` | `female` | `diverse`) — für Mifflin-St Jeor
- `activity_level` (ENUM: `sedentary` | `lightly_active` | `moderately_active` | `very_active` | `extra_active`) — PAL 1.2 bis 1.9
- UI: Einfache Auswahl per Chips im Profil

**UI: Ringdiagramme im Dashboard**
- Zwei Ebenen: **Tagesringe** (Ist heute vs. Tagesziel) + **Wochenringe** (Mo–So Summe vs. Tagesziel × 7)
- Je 4 Ringe: Kalorien, Protein, Kohlenhydrate, Fett
- Jeder Ring zeigt: Ist-Wert / Ziel-Wert + Prozentzahl in der Mitte
- Farben: Kalorien = Grün, Protein = Blau, Kohlenhydrate = Gelb, Fett = Orange
- Wochenringe zeigen Datumsbereich (z.B. "Mo 09.06 – So 15.06") als Kontext
- Keine externe Bibliothek — reine SVG-Lösung (stroke-dasharray)

**Umsetzung:**
- Backend: `GET /api/v1/profile/goals` gibt berechnete Tagesziele zurück (calories, protein, carbs, fat)
- Frontend: Dashboard ruft Tagesziele + `/meals/today` + `/workouts/today` ab, kombiniert zu Fortschritt

### Empfohlene Zutaten / Rezeptideen nach Mahlzeit
- Push Notifications für tägliche Erinnerungen
- Gewichtsverlauf tracken
- Garmin API (falls Zugang möglich)
- Export als PDF/CSV

---

## UI / Design

### Grundprinzipien
- Minimalistisch, klar, motivierend
- Hell- und Dunkelmodus
- Mobile-first (wird hauptsächlich unterwegs genutzt)
- Primärfarbe: #378ADD (Blau) oder nach Absprache

### Komponentenbibliothek
- shadcn/ui + Tailwind v4

### Hauptscreens
1. **Dashboard** – Tagesübersicht Kalorien/Makros + letzte Aktivitäten + KI-Insight
2. **Log** – "+ Mahlzeit" / "+ Training" Button, scrollbare Historie
3. **Profil** – Ziele, Ernährung, Sport als Freitext bearbeiten
4. **Insights** – Wöchentliche KI-Zusammenfassungen

---

## Konventionen

### Backend (Spring Boot)

- Java 21, Spring Boot 3.x, Maven
- Package-Struktur: `com.fueld.<feature>` (z.B. `com.fueld.meal`)
- Pro Feature: Controller, Service, Repository, DTO, Entity
- DTOs für API-Kommunikation, Entities nicht direkt zurückgeben
- REST-Endpunkte unter `/api/v1/...`
- Validation mit Jakarta Bean Validation
- Tests: JUnit 5 + MockMvc
- Fotos: werden als Base64 an Claude API geschickt, URL in DB gespeichert

### Frontend (React)

- Functional Components mit Hooks
- TypeScript
- State Management: React Context
- API-Calls über zentrales `apiClient`-Modul
- Komponentenstruktur: `src/features/<feature>/...`

### Datenbank

- Migrationen mit Flyway
- Tabellen-Namen: `snake_case`, Singular
- IDs als UUID
- Timestamps: `created_at`, `updated_at` standardmäßig

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
