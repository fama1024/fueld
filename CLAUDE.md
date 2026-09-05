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
| CI | GitHub Actions – Build-Check bei jedem Push auf main + jedem PR; Label `automerge` mergt den PR automatisch nach grünem Build |

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
| Profil | Freitext-Felder + goal_tags Chips + Körperdaten + Geschlecht + Aktivitätslevel + Erinnerungen-Toggle (Push) |
| Mahlzeit loggen | Kamera/Galerie + Freitext → KI-Analyse mit Makros, Ziel-Feedback, Zutaten-Tipps |
| Mahlzeit-Kategorisierung | meal_type (Frühstück/Mittagessen/Abendessen/Snack), eaten_at, Datepicker. Keine Uhrzeit-Eingabe und **keine Uhrzeit-Anzeige** (Log-Cards, Dashboard "Mahlzeiten heute", Kalender-Tagesliste zeigen nur Datum + meal_type). Die Uhrzeit von `eaten_at` wird serverseitig aus dem meal_type abgeleitet (Frühstück 8:00, Mittag 12:30, Abendessen 19:00, Snack 15:00, ohne Typ 12:00) — nur für die Sortierung mehrerer Einträge innerhalb eines Tages, nicht fürs UI |
| Quick-Log | Rezept direkt ohne KI-Analyse speichern (`POST /meals/quick`) |
| Training loggen | Manuell oder Garmin Screenshot → KI-Analyse mit MET-Kalorien, missing_data |
| Dashboard (Tendenz) | Konzentrische Ringe (Apple Watch-Stil, SVG) + Heute/Woche-Tab + zeitbasierte Begrüßung. **Keine Zahlenwerte in der Standardansicht** — Füllstand serverseitig auf 5 Stufen gerastet (0/25/50/75/100 %) aus `meals/today` bzw. Tagesdurchschnitt der Woche (`meals/week`) vs. berechnetem Tagesziel (Feld `buckets` in beiden Responses). Tap auf den Ring blendet die exakten Werte ein (Ausnahmefall). |
| Tagesziel-Berechnung | Mifflin-St Jeor BMR × PAL-Faktor, Makro-Split nach goal_tags |
| KI-Insights | Täglich + wöchentlich, Upsert (kein Duplikat), "Neu analysieren"-Button; Trainings-Kontext enthält Garmin-Metriken (Distanz, Pace, Ø-Puls, Kalorien aus `WORKOUT_METRIC`) und manuelle Trainingsnotizen, nicht nur die KI-`summary`. **Wöchentlich zusätzlich:** die letzten bis zu 4 vorherigen weekly-Insights als Kontext (Mehrwochen-Trend statt isolierter Wochenbewertung) + die letzten 8 `WEIGHT_LOG`-Messungen als Ground Truth, die im Prompt stärker gewichtet werden als die geschätzten Tages-Makros |
| Vorratsschrank | Text + Foto/Kamera → KI-Extraktion → Bestätigen → Speichern; Zutaten-Bewertung (★★★) + Rezeptvorschläge; freier Kontext-Hinweis; "Als Mahlzeit loggen"-Button |
| Ziel-Feedback | `goal_alignment` — zielspezifische Einschätzung nach jeder Mahlzeit |
| Zutaten-Tipps | `ingredient_tips` — konkrete Lebensmittel zur Schließung der Tageslücke |
| goal_tags | 6 vordefinierte Ziel-Chips im Profil, beeinflussen Makro-Split und KI-Kontext |
| Gewichtsverlauf | Eintragen im Profil, SVG-Linienchart, letzte 5 Einträge + Löschen |
| Körperzusammensetzung | Xiaomi Scale S400 Screenshot → KI extrahiert Gewicht, BMI, Körperfett, Muskelmasse, Knochenmasse, Wasser; Bestätigen + Bearbeiten vor dem Speichern |
| KI-Analyse für Quick-Log | "KI-Analyse starten"-Button auf Mahlzeiten ohne Makros (z.B. nach Quick-Log) |
| Bulk-KI-Analyse | "Auswählen"-Modus in der Log-Historie: Checkboxen bei allen noch nicht analysierten Mahlzeiten/Trainings; "KI-Analyse starten (n)" ruft die bestehende Einzel-Analyse (`PUT /meals/:id` bzw. `/workouts/:id`) nacheinander pro ausgewähltem Eintrag auf (jeder in eigenem Kontext, kein Batch-Prompt) — Fortschrittsanzeige "x/y", einzelne Fehler brechen die restliche Auswahl nicht ab |
| Nährwerte im Vorrat | Foto-Extraktion liefert Kalorien/Protein/Carbs/Fett pro 100g (exakt bei sichtbarem Etikett, geschätzt sonst); Anzeige in Bestätigung + Vorratsliste |
| Gespeicherte Mahlzeiten | Tabelle `saved_meal` (V18). Dropdown "Gespeicherte Mahlzeiten" im Mahlzeit-Modal oberhalb der Freitext-Eingabe → Auswahl übernimmt Makros direkt **ohne KI-Call**, nur `meal_type` + `eaten_at` bestätigen (`POST /meals/from-saved/:id`, bumpt `last_used_at`). "Als gespeicherte Mahlzeit merken"-Button (opt-in) auf analysierten Mahlzeiten-Cards, Name editierbar. Makros bleiben nach dem Speichern fix, kein Update. Löschen direkt im Dropdown |
| Deployment | Railway (Backend + PostgreSQL) + Vercel (Frontend), auto-deploy bei Push auf main |
| PWA | Installierbar auf iPhone/Android ("Zum Home-Bildschirm"), Kamera-Direktzugriff |
| Kalender | Neuer Hauptscreen (responsive Navigation). Monatsansicht mit Typ-Dots pro Tag (🍽️/🏃/⚖️), Klick auf Tag → Modal mit Tagesliste → Klick auf Aktivität → read-only Detailansicht im selben Modal (kein Routing weg vom Kalender); bei Mahlzeit/Training Link "Bearbeiten auf der Log-Seite →". Endpunkt `GET /api/v1/calendar?month=YYYY-MM` liefert alle drei Log-Typen kompakt, Details werden erst beim Öffnen nachgeladen über neue `GET /:id`-Endpunkte bei Mahlzeiten/Training/Gewicht |
| Push Notifications | Web Push (VAPID). Service Worker `public/sw.js` (nur Push, kein Offline-Cache). Toggle "Erinnerungen" im Profil → Permission + `pushManager.subscribe` → `push_subscription` (V19). Fester Scheduler (`@Scheduled`, Europe/Berlin) sendet 12:30 + 19:00 Uhr an alle Subscriptions (dumm, keine "heute schon geloggt"-Prüfung; Cron via `app.push.reminder.*-cron` überschreibbar). "Test senden"-Button. Abgelaufene Subs (HTTP 404/410) werden beim Senden entfernt. Server-seitig deaktiviert wenn `VAPID_*` fehlt (kein Fehler; `vapid-key` liefert `enabled:false`, Profil-Card zeigt dann nur "Noch nicht verfügbar" ohne Toggle). iOS: nur als installierte PWA ab 16.4 |
| Nachfragen (Dashboard) | Freitext-Frage-Karte unter den Nährstoff-Ringen (`AskCard`). `scope` folgt dem Heute/Woche-Tab → `POST /api/v1/assistant/ask` schickt Profil + berechnete Tagesziele + Log-Einträge (Mahlzeiten + Trainings) des Zeitraums als Kontext an `claude-sonnet-5`, Antwort als Freitext. **One-Shot:** keine Rückfragen, kein Gesprächsverlauf, nichts persistiert (Frage + Antwort nur in `sessionStorage`). Prompt weist auf grobe Schätzwerte hin. Profil-/Log-Formatierung geteilt mit dem Insight über `com.fueld.ai.LogContextFormatter` |
| Produkt-Cache | Tabelle `product_cache` (V21, pro Nutzer, UNIQUE auf `user_id` + `LOWER(name)`). Bei jeder Vorrats-Foto-Extraktion (`POST /pantry/extract`) werden die bis zu 50 zuletzt genutzten bekannten Produkte des Nutzers als Kontext in den Extraktions-Prompt eingespeist ("nutze diese Werte statt neu zu schätzen, außer Etikett zeigt Abweichung") — kein Bypass der KI, nur Konsistenz-Hinweis. Nach jeder Extraktion werden alle erkannten Produkte mit Nährwerten upserted (Name-Match case-insensitive, `last_used_at` wird gebumpt). Kein eigenes UI/Endpunkt — rein interner Cache innerhalb von `PantryService`. Matching bewusst einfach gehalten (Name-Vergleich, kein Fuzzy-Matching/Barcode) |
| Dashboard Tage-Navigation | Pfeile im "Heute"-Tab der Nährstoffe-Karte, bis zu 7 Tage zurück (nicht in die Zukunft). `GET /meals/today` + `GET /workouts/today` akzeptieren optional `?date=YYYY-MM-DD`. Tendenz-Ringe bleiben weiterhin gerastert (nicht exakt) für jeden angezeigten Tag. Wochen-Tab, Ziele und Profil sind unabhängig vom gewählten Tag. Die Nachfragen-Karte (`AskCard`) folgt bisher nur Heute/Woche, noch nicht dem einzelnen ausgewählten Tag. |
| Insights für vergangene Tage generieren | `POST /insights/generate?type=daily&date=YYYY-MM-DD` erstellt einen Daily-Insight für einen beliebigen Tag statt nur heute (nur bei `type=daily` relevant, `type=weekly` ignoriert den Parameter weiterhin). `regenerate()` reicht bei daily jetzt `existing.getPeriodStart()` durch statt immer "heute" zu nehmen. Dashboard zeigt im "Heute"-Tab für den gewählten Tag entweder den vorhandenen Insight (Teaser wie zuvor, jetzt tagesbezogen) oder — falls für diesen Tag noch keiner existiert und etwas geloggt wurde — einen Button "Einordnung erstellen". Prompt-Formulierung ("heute"/"morgen") ist jetzt abhängig davon, ob der Tag der echte heutige Tag ist. |
| Verlaufs-Chart (Kalorienverlauf) | Neuer Tab "Verlauf" in der Insights-Seite (kein eigener Hauptscreen). `GET /meals/trend?days=7\|30` (Backend clamped 1–90) liefert lückenlose Tageswerte (Kalorien/Protein/Carbs/Fett, 0 an Tagen ohne Eintrag) für den gewählten Zeitraum, aggregiert aus `meal_log` in `MealService.getTrend()`. SVG-Linienchart im Stil des Gewichtsverlauf-Charts im Profil (gleiche Farben/Maße, eigene lokale Komponente in `InsightsPage.tsx`, kein Chart-Sharing). Lazy-Load nur bei Tab-Aufruf. Zeigt aktuell nur Kalorien, nicht Protein/Carbs/Fett (Datenfelder sind aber schon in der Response vorhanden). |

### ⬜ Noch ausstehend

- **Garmin API** — falls Zugang möglich (aktuell Screenshot-basiert)
- **Export** — PDF/CSV
- **Mobile App** — React Native + Expo (optional, da PWA funktioniert)
- **Nachfragen: Chatverlauf ergänzen** — "Nachfragen (Dashboard)" (siehe oben) ist bereits als reines One-Shot ohne Persistenz umgesetzt (Frage + Antwort nur in `sessionStorage`, `scope` = Heute/Woche-Tab). Ursprünglich war zusätzlich ein **gespeicherter Chatverlauf** geplant, inkl. Scope auf einen einzelnen Tag (Einstieg: Tages-Detailansicht, siehe Dashboard Tage-Navigation) statt nur Heute/Woche. Falls gewünscht: neues Datenmodell nötig (Tabelle für Frage/Antwort-Nachrichten inkl. Zeitraum-Scope, ähnlich `AI_INSIGHT` aber mehrere Einträge pro Zeitraum statt Upsert), `POST /api/v1/assistant/ask` müsste den Verlauf mitschreiben/mitschicken statt nur einmalig zu antworten.

---

### Notizen zur Produktrichtung (warum diese Priorisierung)

App wurde bisher zu unregelmäßig genutzt. Ursachenanalyse (Stand: Juni 2026), alle drei Gegenmaßnahmen inzwischen umgesetzt:
1. **Vergessen** war der Hauptgrund, nicht fehlender Nutzen → umgesetzt als Push Notifications (feste Erinnerungen 12:30 / 19:00 Uhr).
2. **Zu hohe Detailtiefe** beim Eintragen (nur grobe Beschreibung wie "Nudeln mit Tomatensauce" gewünscht, kein Interesse an präzisem Tracking) UND bei der Anzeige (exakte Kalorien-/Makrowerte aus ungenauem Input wirken falsch präzise) → Dashboard von "präzise" auf "Tendenz" zurückgebaut + gespeicherte Mahlzeiten fürs schnelle Loggen.
3. **Fehlender Rückkopplungs-Loop** — unklar ob KI-Empfehlungen befolgt werden → kein zusätzlicher Check-in-Screen, stattdessen Mehrwochen-Trend im wöchentlichen Insight.

Leitprinzip für alle künftigen Feature-Entscheidungen bei Fueld: **Aufwand beim Eintragen senken hat Vorrang vor Genauigkeit der Auswertung.**

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
- Optionale Env-Vars:
  ```
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  ← npx web-push generate-vapid-keys
  VAPID_SUBJECT     ← mailto:… oder https-URL (Default mailto:noreply@fueld.app)
  ```
  Ohne die VAPID-Keys sind Push-Benachrichtigungen serverseitig deaktiviert (kein Fehler, Endpunkte antworten mit `enabled: false`).
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

**SAVED_MEAL**
- id (UUID), user_id (FK)
- name (TEXT) — Anzeigename im Dropdown, z.B. "Nudeln mit Tomatensauce & Parmesan"
- text_input (TEXT) — ursprünglicher Freitext
- calories (INT), protein (INT), carbs (INT), fat (INT) — fix, keine Aktualisierung nach dem Speichern
- last_used_at (TIMESTAMPTZ)

**PUSH_SUBSCRIPTION** — Web-Push-Subscription pro Gerät/Browser
- id (UUID), user_id (FK)
- endpoint (TEXT), p256dh (TEXT), auth (TEXT) — kommen 1:1 vom PushManager
- created_at (TIMESTAMPTZ)
- UNIQUE (user_id, endpoint)

**PRODUCT_CACHE** — zwischengespeicherte Produkt-Nährwerte aus der Vorrats-Foto-Extraktion (pro Nutzer)
- id (UUID), user_id (FK)
- name (TEXT)
- calories_per_100g (INTEGER), protein_per_100g (DECIMAL 5,1), carbs_per_100g (DECIMAL 5,1), fat_per_100g (DECIMAL 5,1) — optional
- last_used_at (TIMESTAMPTZ)
- UNIQUE (user_id, LOWER(name))

### Flyway-Migrationen (V1–V21)

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
| V18 | saved_meal |
| V19 | push_subscription |
| V20 | Altdaten: meal_log.eaten_at aus meal_type ableiten (statt pauschal 12:00) |
| V21 | product_cache |

### KI-Kontext Aufbau (Backend-Logik)

Bei jeder Mahlzeit-Anfrage:
1. PROFILE (immer) — inkl. goal_tags + Körperdaten
2. Heutiger Makrostand (Summe aller eaten_at = heute)
3. Berechnete Tagesziele (Mifflin-St Jeor)
4. meal_type (wenn angegeben)
5. Foto(s) + Freitext des Nutzers

Beim wöchentlichen Insight (`type=weekly`) zusätzlich:
6. Bis zu 4 vorherige weekly-Insights (Content, ggf. auf ~700 Zeichen gekürzt) — als Referenz für Mehrwochen-Trends
7. Letzte 8 `WEIGHT_LOG`-Messungen (Gewicht, Körperfett, Muskelmasse, Wasser) — Prompt weist die KI an, diese als Ground Truth stärker zu gewichten als die geschätzten Tages-Makros

Bei der Dashboard-Nachfrage (`POST /assistant/ask`):
1. PROFILE (Ziele, Ernährung, Sport)
2. Berechnete Tagesziele (Mifflin-St Jeor)
3. Mahlzeiten + Trainings des Zeitraums (`scope=today` → heute, `scope=week` → seit Montag), Format identisch zum Insight (`LogContextFormatter`)
4. Freitext-Frage des Nutzers
Prompt weist explizit auf die groben Schätzwerte hin. One-Shot, kein Verlauf, nichts persistiert.

Profil- und Log-Formatierung für Insight und Nachfrage liegen gemeinsam in `com.fueld.ai.LogContextFormatter`.

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
- `GET  /api/v1/meals/:id` — Einzeleintrag (lazy-load für Kalender-Detailansicht)
- `PUT  /api/v1/meals/:id` — bearbeiten + neu analysieren
- `GET  /api/v1/meals/today` — Tagessumme + Mahlzeiten des Tages, optional `?date=YYYY-MM-DD` (Default heute) für die Dashboard-Tage-Navigation
- `GET  /api/v1/meals/week` — Wochensumme
- `GET  /api/v1/meals/trend?days=7|30` — Tageswerte für das Verlaufs-Chart (Backend clamped 1–90), lückenlos, 0 an Tagen ohne Eintrag

### Training
- `POST /api/v1/workouts`
- `GET  /api/v1/workouts`
- `GET  /api/v1/workouts/:id` — Einzeleintrag (lazy-load für Kalender-Detailansicht)
- `PUT  /api/v1/workouts/:id`
- `GET  /api/v1/workouts/today` — optional `?date=YYYY-MM-DD` (Default heute)

### Insights
- `POST /api/v1/insights/generate?type=daily|weekly` — generieren/überschreiben, optional `&date=YYYY-MM-DD` bei `type=daily` für einen vergangenen Tag (Default heute; bei `weekly` ohne Wirkung)
- `POST /api/v1/insights/:id/regenerate`
- `GET  /api/v1/insights?type=daily|weekly`

### Gewicht
- `POST   /api/v1/weight` — Eintrag loggen (inkl. optionaler Körperzusammensetzung)
- `POST   /api/v1/weight/analyze` — Xiaomi Screenshot → KI extrahiert Körperzusammensetzung
- `GET    /api/v1/weight` — Historie (neueste zuerst)
- `GET    /api/v1/weight/:id` — Einzeleintrag (lazy-load für Kalender-Detailansicht)
- `DELETE /api/v1/weight/:id`

### Vorrat
- `GET    /api/v1/pantry` — alle Einträge
- `POST   /api/v1/pantry/items` — Zutaten hinzufügen
- `DELETE /api/v1/pantry/items/:id`
- `POST   /api/v1/pantry/extract` — Foto → KI extrahiert Zutaten-Liste
- `POST   /api/v1/pantry/analyze` — KI-Analyse mit optionalem Kontext-Hinweis (`{ note: "..." }`)

### Kalender
- `GET /api/v1/calendar?month=YYYY-MM` — alle Mahlzeiten/Trainings/Gewichtseinträge des Monats kompakt (id, date, type)

### Gespeicherte Mahlzeiten
- `GET    /api/v1/saved-meals` — Liste für Dropdown im Log-Screen (nach `last_used_at` absteigend)
- `POST   /api/v1/saved-meals` — aus einer analysierten Mahlzeit heraus speichern (name + text_input + Makros werden übernommen, fix)
- `POST   /api/v1/meals/from-saved/:savedMealId` — loggen per Dropdown-Auswahl, kein KI-Call, übernimmt Makros direkt + optional meal_type/eaten_at im Body; bumpt `last_used_at`
- `DELETE /api/v1/saved-meals/:id`

### Push
- `GET  /api/v1/push/vapid-key` — `{ publicKey, enabled }` fürs Frontend-Subscribe
- `POST /api/v1/push/subscribe` — `{ endpoint, p256dh, auth }`, Upsert pro (user, endpoint)
- `POST /api/v1/push/unsubscribe` — `{ endpoint }`
- `POST /api/v1/push/test` — sofortige Test-Benachrichtigung an alle Geräte des Nutzers

### Assistent
- `POST /api/v1/assistant/ask` — `{ question, scope: "today" | "week" }` → `{ answer, scope }`. One-Shot-Frage vom Dashboard, Kontext = Profil + Tagesziele + Log-Einträge des Zeitraums. Nichts wird gespeichert.

### System
- `GET /api/v1/health` — Health-Check (öffentlich, für Railway)

---

## UI / Screens

### Hauptscreens
1. **Dashboard** — Tendenz-Ringe (Heute/Woche-Tab) ohne Zahlenwerte, Füllstand serverseitig auf 5 Stufen gerastet, Tap zeigt exakte Werte + heutige Mahlzeiten + Training + "Nachfragen"-Karte (Freitext-Frage, scope folgt dem Tab)
2. **Log** — Mahlzeit / Training loggen (Tabs), scrollbare Historie mit KI-Analyse-Cards
3. **Kalender** — Monatsansicht aller Aktivitäten (Mahlzeit/Training/Gewicht) als Typ-Dots pro Tag; Klick auf Tag → Modal mit Tagesliste → Klick auf Aktivität → Detailansicht im selben Modal (siehe Implementierungsstand)
4. **Vorrat** — Zutaten verwalten (Text/Foto/Kamera), KI-Analyse mit Kontext, Rezeptvorschläge
5. **Profil** — goal_tags Chips + Freitext-Felder + Körperdaten + Gewichtsverlauf (SVG-Chart) + Aktivitätslevel + Erinnerungen-Toggle (Push)
6. **Insights** — KI-Zusammenfassungen täglich/wöchentlich (Tabs), "Neu analysieren"

### Navigation (responsive)
- **Mobile** (iPhone + Android, < `md` Breakpoint): Bottom Nav mit 4 Einträgen — Dashboard, Log, Kalender, **Mehr**. "Mehr" öffnet eine Liste mit Vorrat, Profil, Insights.
- **Desktop** (PC Browser, ≥ `md` Breakpoint): linke Sidebar mit allen 6 Screens direkt sichtbar, kein "Mehr" nötig.
- Eine Layout-Komponente pro Breakpoint (`BottomNav` mobile-only, `Sidebar` desktop-only via Tailwind `md:hidden` / `hidden md:flex`), gleiche Routen darunter.

### Design-Prinzipien
- Minimalistisch, mobile-first, aber Desktop-Nutzung wird bewusst mitgedacht (Sidebar statt Bottom Nav)
- Primärfarbe: `#16A34A` (Grün) für Aktionen, neutrale Grautöne für Struktur
- Ringdiagramme bleiben visuell bestehen, aber ohne Zahlenwerte + gerasteter (nicht exakter) Füllstand: Kalorien = Grün, Protein = Blau, Kohlenhydrate = Gelb, Fett = Orange
- Kalender-Dots: neutrale Typ-Icons statt Makro-Farben (🍽️ Mahlzeit, 🏃 Training, ⚖️ Gewicht)
- Keine externe Chart-Bibliothek — reine SVG-Lösung (gilt auch für die neue Tendenz-Anzeige)
- Genauigkeits-Erwartung bewusst niedrig halten: UI-Texte wie "Einordnung" / "Grobe Einschätzung" statt "KI-Feedback" / "Analyse"
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
- `main` ist geschützt: kein direkter Push, Pflicht-Checks „Backend Build" + „Frontend Build"
- Merge-Weg: Feature-Branch → PR → Label **`automerge`** setzen → Workflow `auto-merge.yml` aktiviert GitHubs native Auto-Merge (Squash), gemergt wird automatisch sobald beide Checks grün sind; Branch wird danach gelöscht

---

## Was Claude Code wissen sollte

- Solo-Entwickler in der Freizeit
- React solide, Spring Boot grundlegend
- Datenbank-Erfahrung dünn – Konzepte bitte miterkläre
- Bei Architektur-Entscheidungen kurz zurückfragen
- Code soll lesbar und nachvollziehbar sein, nicht clever
- Die App wird primär vom Entwickler selbst genutzt (Marcus, Fenix 7 Pro, vegan/vegetarisch, Crossfit + Laufen + Gravel-Bike)
- App läuft produktiv auf Railway + Vercel, wird täglich vom Entwickler genutzt
