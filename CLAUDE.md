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
- Mahlzeit loggen: Foto(s) + Freitext → KI-Analyse
- Training loggen: manuell oder Garmin Screenshot → KI-Analyse
- Tagesübersicht: Kalorien + Makros + Trainingseinheiten
- Wöchentliche KI-Zusammenfassung
- Historie (scrollbare Liste aller Einträge)

**Phase 2:**
- React Native Mobile App
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
