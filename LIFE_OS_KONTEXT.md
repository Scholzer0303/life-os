# LIFE_OS_KONTEXT.md
# Wird nach jedem Schritt aktualisiert — immer die neueste Version ins Claude Project hochladen

Zuletzt aktualisiert: 2026-04-04 (Session abgeschlossen — Bugs 1–6 ✅, Änderungen 7–10 ✅, Änderung 11 dokumentiert, Features 12–15 neu nummeriert)

---

## Was ist Life OS?

Eine PWA (Progressive Web App) — persönlicher KI-Mentor und Journal-System für Lukas.
Ziel: Echte Ziele finden, runterbrechen auf Tagesebene, KI-Coach on-demand.

---

## Tech Stack

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS v4
- Datenbank: Supabase (PostgreSQL) — Projekt: life-os, Region: Europe West (London)
- KI: Anthropic Claude API (claude-sonnet-4-6)
- State: Zustand
- Animationen: Framer Motion
- PWA: Vite PWA Plugin
- Deployment: Vercel ✅ live auf https://life-os-henna-xi.vercel.app

---

## Projektordner

```
C:/Users/Anwender/Desktop/life-os/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/       ✅ HeatmapGrid, StreakBadge, GoalCard
│   │   ├── journal/         ✅ MorningJournal, EveningJournal, FreeformJournal, AIFeedbackCard
│   │   │                       MorningStep2Goal (Ziel-Kaskade + Identitäts-Anker)
│   │   ├── goals/           ✅ GoalCard, GoalDetailCard, GoalSheet
│   │   └── onboarding/      ✅ 9 Schritte
│   │       Step1.tsx         Willkommen + Name
│   │       Step2.tsx         Lebensrad (Spider-Web SVG)
│   │       Step3_Ikigai.tsx  Ikigai (4 Fragen + KI-Synthese) — NEU
│   │       Step3.tsx         Werte-Radar (12 Karten, Top-5)
│   │       Step4.tsx         5-Warum-Kette (Claude API)
│   │       Step5.tsx         Nordstern (KI-Zusammenfassung)
│   │       Step6_Identity.tsx Identitäts-Modul (zukünftiges Ich) — NEU
│   │       Step6.tsx         Stopp-Liste
│   │       Step7.tsx         3-Jahres → Jahr → Quartalsziel
│   ├── pages/
│   │   ├── Login.tsx             ✅
│   │   ├── Onboarding.tsx        ✅ orchestriert 9 Steps, totalSteps=9
│   │   ├── Dashboard.tsx         ✅
│   │   ├── Journal.tsx           ✅
│   │   ├── Goals.tsx             ✅ Tab: 3J/Jahr/Quartal/Monat/Woche/Alle
│   │   ├── Coach.tsx             ✅ Muster-Panel + starterOverride
│   │   ├── Review.tsx            ✅ Muster in Step 0
│   │   ├── Settings.tsx          ✅ 6 Sektionen
│   │   └── PatternInterrupt.tsx  ✅
│   ├── lib/
│   │   ├── supabase.ts      ✅
│   │   ├── claude.ts        ✅ Rate Limiting, alle KI-Funktionen
│   │   ├── db.ts            ✅ CRUD für alle 5 Tabellen + Analyse-Helfer
│   │   └── utils.ts         ✅
│   ├── store/
│   │   └── useStore.ts      ✅ Zustand Global State
│   └── types/
│       ├── index.ts         ✅ inkl. PatternAnalysis
│       └── database.ts      ✅ Supabase v2 Types
├── public/icons/            ✅ icon-192.png, icon-512.png, apple-touch-icon.png
├── scripts/
│   └── generate-icons.mjs   ✅ Node.js PNG-Generator
├── .env                     ✅ Keys eingetragen
├── .env.example             ✅ Keys dokumentiert
├── .gitignore               ✅ .env geschützt
├── .npmrc                   ✅ legacy-peer-deps=true
├── schema.sql               ✅ Bereits in Supabase eingespielt
├── vercel.json              ✅ SPA-Rewrites
└── vite.config.ts           ✅ PWA konfiguriert
```

---

## Supabase Tabellen (alle angelegt ✅)

| Tabelle | Wichtige Felder |
|---|---|
| `profiles` | id, user_id, name, north_star, values[], stop_list[], ikigai(json), ai_profile(json), identity_statement, onboarding_completed |
| `goals` | id, user_id, title, type (three_year/year/quarterly/monthly/weekly), status, parent_id, progress, quarter, month, year, week |
| `journal_entries` | id, user_id, entry_date, type, feeling_score, main_goal_today, potential_blockers, accomplished, what_blocked, energy_level, free_text, timeblocks(json), ai_feedback, linked_goal_ids[], identity_action |
| `coach_sessions` | id, user_id, messages(json), trigger, summary |
| `pattern_events` | id, user_id, event_type, notes |

Row Level Security: aktiv auf allen Tabellen ✅

### Wichtige Feldnamen (Fallstricke!)
- Journal: `main_goal_today` (nicht `morning_goal`), `what_blocked` (nicht `blockers`), `entry_date` (nicht `created_at` für Datum)
- Profile: `ai_profile` (json, enthält PatternAnalysis), `ikigai` (json mit loves/good_at/paid_for/world_needs/synthesis)

---

## Ausstehend — Feedback-Session (April 2026)

Die folgenden Bugs und Features wurden beim Testen der Live-App identifiziert.
Bearbeitungsreihenfolge: erst alle Bugs (1–6) ✅, dann Änderungen (7–11), dann große Features (12–15).
**Immer nur einen Punkt nach dem anderen. Erst testen, dann "weiter" sagen.**

### 🐛 Bugs — alle behoben ✅

**Bug 1 — Onboarding-Fortschritt geht bei Tab-Wechsel verloren** ✅ BEHOBEN
- Step-Index: `useState` lazy initializer + `useEffect` in `Onboarding.tsx` (Keys: `life-os-onboarding-step`, `life-os-onboarding-data`)
- Zwischeneingaben: `onDataChange`-Callback in `Step3_Ikigai.tsx` synchronisiert lokalen State sofort in Parent → localStorage
- Sub-Schritt (Ikigai-Fragen): eigener Key `onboarding_ikigai_substep` in `Step3_Ikigai.tsx`

**Bug 2 — Markdown-Formatierung wird als Text angezeigt** ✅ BEHOBEN
- `react-markdown` installiert (npm install react-markdown --legacy-peer-deps)
- Eingebaut in: `Step5Nordstern.tsx` (KI-Vorschlag), `Coach.tsx` (role: assistant), `AIFeedbackCard.tsx` (Feedback-Text)

**Bug 3 — Coach-Unterhaltung geht bei Tab-Wechsel verloren** ✅ BEHOBEN
- Keys: `coach_session_mode`, `coach_session_messages`, `coach_session_id`
- Lazy initializer stellt mode + messages + session.id bei Mount wieder her
- useEffects speichern bei jeder Änderung; handleReset + logout leeren die Keys

**Bug 4 — Grammatikfehler Morgenjournal Schritt 2** ✅ BEHOBEN
- `src/components/journal/MorningStep2Goal.tsx` Zeile 45: "dein einen Ziel" → "dein Ziel"

**Bug 5 — Morgenjournal zeigt leeres Formular wenn heute bereits Eintrag vorhanden** ✅ BEHOBEN
- `useEffect` in `MorningJournal.tsx` ruft `getTodayEntries` auf Mount auf
- Falls morning-Eintrag für heute vorhanden: alle Felder vorausfüllen (feeling, goal, blockers, timeblocks, identityAction)
- Speichern weiterhin via UPSERT (`createJournalEntry`) — kein Duplikat möglich

**Bug 6 — "KI hilft mir formulieren"-Button nur nach eigenem Text klickbar** ✅ BEHOBEN
- `disabled`-Bedingung in `Step6_Identity.tsx` auf `isRefining` reduziert (kein `!text.trim()` mehr)
- `reformulateIdentity` in `claude.ts` bekommt optionalen `context`-Parameter (northStar, values, ikigaiSynthesis, fiveWhysSummary)
- Ohne Text: KI generiert Vorschlag aus Onboarding-Kontext; mit Text: KI verfeinert den vorhandenen Text

### ✏️ Änderungen (7–11)

**Änderung 7 — Pattern-Interrupt Banner: Logik-Fix + ⓘ-Symbol** ✅ BEHOBEN
- Logik-Fix: Banner erscheint nur wenn `profiles.created_at` > 3 Tage alt UND kein Eintrag in den letzten 3 Tagen
- ⓘ-Icon (lucide `Info`) neben Titel-Text im Banner; bei Hover/Tap öffnet sich Tooltip mit Erklärungstext
- Tooltip-Farbe: `color: 'var(--text-primary)'` — passt sich an Theme an (Fix nach erstem Test)
- Datei: `src/pages/Dashboard.tsx`

**Änderung 8 — Review umbenennen + manueller Startbutton** ✅ BEHOBEN
- "Review" → "Wochenreview" in Navigation.tsx (Tab-Label), Dashboard.tsx (Quick-Button), Review.tsx (Abschluss-Button)
- Landing-Screen vor dem Flow: zeigt Titel + Kurzbeschreibung + "Wochenreview starten →"-Button
- KI-Zusammenfassung startet erst nach Klick auf Button (useEffect hängt nun an `started`-State, nicht am Mount)
- Dateien: `src/pages/Review.tsx`, `src/components/layout/Navigation.tsx`, `src/pages/Dashboard.tsx`

**Änderung 9 — Einstellungen: ⓘ-Symbole bei allen Buttons** ✅ BEHOBEN
- Wiederverwendbare `InfoTooltip`-Komponente in Settings.tsx (hover + touch-toggle), `color: 'var(--text-primary)'`
- Tooltips bei: Speichern, Ikigai speichern, KI-Analyse (beide), Onboarding neu starten, Journal löschen, Ziele löschen, Alle Daten löschen, Abmelden
- Datei: `src/pages/Settings.tsx`

**Änderung 10 — Review: Zeitraum-Auswahl (Woche/Monat/Quartal/Jahr)** ✅ BEHOBEN
- Landing-Screen: 4 Buttons (Woche/Monat/Quartal/Jahr), aktiver Zeitraum lila hervorgehoben
- Titel und Start-Button passen sich dynamisch an ("Wochenreview starten →", "Monatsreview starten →" etc.)
- Neue Funktion `generateReviewSummary(zeitraum, entries, goals, profile)` in `claude.ts` + exportierter Typ `ReviewPeriod`
- Beim Start: `getRecentEntries(userId, tage)` lädt passende Einträge (7/30/90/365 Tage), Ziele nach Typ gefiltert
- Dateien: `src/pages/Review.tsx`, `src/lib/claude.ts`

**Änderung 11 — Review: Intelligente Datenaggregation je Zeitraum** ⚠️ OFFEN
- Problem: Bei Quartal/Jahr werden zu viele rohe Tageseinträge an die KI übergeben → Token-Limit-Risiko
- Fix: Hierarchie — Monat nutzt Wochenreviews, Quartal nutzt Monatsreviews, Jahr nutzt Quartalsreviews
- Fallback: Falls kein Review höherer Ebene existiert → eine Ebene tiefer gehen
- Technisch: neue DB-Funktion `getReviewSessions(userId, trigger, seit)` + Anpassung `generateReviewSummary()`
- Dateien: `src/lib/db.ts`, `src/lib/claude.ts`, `src/pages/Review.tsx`

### 💡 Große Features — eigene Sessions je Feature

**Feature 12 — Kalender-Tab mit wiederkehrenden Zeitblöcken** ⚠️ OFFEN
- Eigener Tab "Kalender" in der Navigation
- Zeitblöcke als Tagesansicht (ähnlich Google Calendar, aber in der App)
- Wiederkehrende Serien: täglich, Mo-Fr, wöchentlich etc.
- Beim Bearbeiten einer Serie: Auswahl "Nur diesen Termin / Ab diesem Termin / Alle Termine"
- Sync: Änderungen im Morgenjournal Schritt 4 erscheinen im Kalender und umgekehrt
- Neue Supabase-Tabellen `recurring_blocks` + `recurring_block_exceptions` nötig
- Aufwand: Sehr Groß — eigene Session

**Feature 13 — Ziel-Kaskade mit abhakbaren Tasks** ⚠️ OFFEN
- Jedes Ziel kann Sub-Tasks bekommen (z.B. Wochenziel A → A1, A2, A3)
- Tasks haben Checkboxen — wenn abgehakt verschiebt sich Fortschrittsbalken automatisch
- Dashboard zeigt aktive Wochenziel-Karte mit Tasks inline (max. 3, "Alle anzeigen")
- Neue Supabase-Tabelle `goal_tasks` nötig (id, goal_id, title, completed, sort_order)
- Aufwand: Groß — eigene Session

**Feature 14 — Tasks im Tagesjournal mit Dashboard-Sync** ⚠️ OFFEN
- Baut auf Feature 13 auf — erst Feature 13 umsetzen
- Morgenjournal Schritt 2: konkrete Tages-Tasks eintragen (nicht nur Fokus)
- Tasks im Dashboard mit Checkboxen sichtbar
- Tasks im Abendjournal als Liste mit Status (erledigt/offen)
- Aufwand: Groß — eigene Session nach Feature 13

**Feature 15 — Coach-Archiv** ⚠️ OFFEN
- Vergangene Coach-Sessions abrufbar und durchsuchbar
- Im Coach-Tab: neuer Button "Vergangene Sessions" oben rechts
- Sortiert nach Datum, neueste zuerst; Tap öffnet Unterhaltung (read-only)
- `coach_sessions` Tabelle existiert bereits — keine Schema-Änderung nötig
- Aufwand: Mittel — eigene Session

---

## Phase 1 — Fertige Schritte (1–8)

### ✅ Schritt 1 — Setup
Vite + React + TypeScript + Tailwind v4 + Supabase Client + Claude API Wrapper + Zustand Store + PWA Config + Git init

### ✅ Schritt 2 — Auth
Supabase Magic Link Login (kein Passwort nötig)
Login-Seite: http://localhost:5174/login
AuthGuard schützt alle Routen außer /login

### ✅ Schritt 3 — Datenbankschema
Vollständiger Supabase v2-kompatibler Database-Typ
CRUD Layer für alle 5 Tabellen
Streak-Berechnung, Heatmap-Daten, Volltextsuche

### ✅ Schritt 4 — Onboarding (9 Schritte nach Phase 2)
1. Willkommen + Name
2. Lebensrad mit animiertem Spider-Web SVG (8 Achsen)
3. **Ikigai** (4 Fragen + KI-Synthese) — hinzugefügt in Schritt 19
4. Werte-Radar: 12 Karten, Top-5-Auswahl, Konflikt-Erkennung
5. 5-Warum-Kette mit Claude API (bis zu 5 KI-Folgefragen)
6. Nordstern: KI-Zusammenfassung + Freitext
7. **Identität** (zukünftiges Ich + KI-Reformulierung) — hinzugefügt in Schritt 18
8. Stopp-Liste: min. 3 Einträge, dynamisch erweiterbar
9. 3-Jahres-Ziel → Jahres-Ziel → Quartalsziel (mit parent_id-Kette) — erweitert in Schritt 17
Auto-Redirect zu /onboarding wenn nicht abgeschlossen

### ✅ Schritt 5 — Dashboard
- Greeting (Morgen/Tag/Abend je Uhrzeit)
- Nordstern-Banner (immer sichtbar oben)
- Heutiger Status: Morgen/Abend-Journal mit Check-State
- Quick-Access: Freeform, Coach, Review
- Wochenziele mit Live-Fortschrittsbalken + Slider
- Streak-Badge (Amber, Feuer-Icon)
- 60-Tage Heatmap (Morgen=Blau, Abend=Grün, Beide=Lila)
- Pattern Interrupt Banner (3+ Tage kein Eintrag)
- Bottom Tab Bar Navigation (5 Tabs, Lucide-Icons)
- AppLayout-Wrapper für alle geschützten Seiten

### ✅ Schritt 6 — Morgen-Journal
- Schritt 1: Emoji-Feeling-Skala (1-5) + optionaler Text
- Schritt 2: Tages-Ziel + Verknüpfung mit Wochenziel
- Schritt 3: Potenzielle Blocker (überspringbar)
- Schritt 4: Flex-Timeboxing (Blöcke, Dauer-Picker, 15-Min-Puffer, inline editierbar, max 6 Blöcke)
- Schritt 5: Zusammenfassung + Speichern
Gespeichert in Supabase, zurück zum Dashboard nach Speichern

### ✅ Schritt 7 — Abend-Journal + Journal-Modul
- Abend-Journal: 4 Schritte (Geschafft/Blocker/Energie 1-10/Freitext)
- KI-Feedback: "Coach um Feedback bitten" Button nach Speichern
- AIFeedbackCard: speichert Feedback in DB, Refresh-Button
- Freeform-Journal: freies Schreiben + Ziel-Verknüpfung + KI-Feedback
- Journal-Übersicht: Monatskalender mit farbigen Punkten
- Entry-Detail: Bottom Sheet mit allen Feldern, Timeblocks, KI-Feedback
- Volltextsuche: debounced, zeigt Ergebnisse als Cards

### ✅ Schritt 8 — Ziel-Hierarchie
- Tab-Bar: Alle/Quartal/Monat/Woche (aktueller Zeitraum)
- Baumstruktur: Q → M → W mit Expand/Collapse
- GoalCard: Titel, Beschreibung, Breadcrumb, Fortschritts-Slider, Status-Badge
- "Untergeordnetes Ziel hinzufügen" direkt aus der Karte
- Löschen mit Bestätigungs-Prompt
- KI-Check: Coach bewertet Ziel auf Kurs + Nordstern-Alignment
- Max. 3 Ziele pro Ebene
- Nordstern-Banner oben zur Orientierung

---

## Phase 1 — Fertige Schritte (9–14)

### ✅ Schritt 9 — KI-Coach Chat-Interface
- 4 Modi-Auswahl: Festgesteckt / Auf Kurs? / Klarheit / Einfach reden
- Jeder Modus startet mit einem Starter-Prompt → KI antwortet sofort
- Chat-Interface: animierte Nachrichten-Bubbles, Typing-Indikator (3 Punkte)
- Enter = Senden, Shift+Enter = Zeilenumbruch
- Vollständiger Kontext: Nordstern + Ziele + letzte 7 Einträge + Stopp-Liste
- Session in coach_sessions gespeichert (trigger: 'on_demand')
- Nachrichten werden bei jedem Turn in DB synchronisiert
- "Neue Session"-Button (Reset) oben rechts
- Nordstern-Banner auf der Modus-Auswahlseite

### ✅ Schritt 10 — Wochen-Review
- 6-Schritt-Flow mit Fortschrittsbalken
- Schritt 1: KI-Zusammenfassung der Woche (auto-generiert beim Laden)
- Schritt 2: "Was lief gut?" — Freitext
- Schritt 3: "Was würdest du ändern?" — Freitext
- Schritt 4: Wochenziele abhaken + Fortschritts-Slider (Updates live in DB)
- Schritt 5: Neue Wochenziele für nächste Woche setzen (max 3, abgeleitet aus Monatsziel)
- Schritt 6: KI-Feedback auf die Review + "Abschließen"-Button
- Session wird als coach_sessions (trigger: 'weekly_review') gespeichert
- Neue Claude-Funktionen: generateWeeklySummary, generateWeeklyFeedback

### ✅ Schritt 11 — Pattern Interrupt
- Seite `/pattern-interrupt` mit 3-Schritt-Flow
- Schritt 1: "Hey — Leben passiert. Was ist gerade los?" → Freitext-Eingabe
- Schritt 2: KI antwortet mitfühlend + direkt (handlePatternInterrupt), Chat-Bubbles
- Schritt 3: Reset-Ritual — ein kleiner Schritt (Morgen-Journal oder Freeform)
- Pattern-Event wird in DB geloggt (event_type: 'pattern_interrupt')
- Automatischer Trigger: 3+ Tage kein Eintrag → Banner auf Dashboard navigiert jetzt zu /pattern-interrupt
- Manueller Trigger: diskreter Link ganz unten auf dem Dashboard ("Ich bin gerade raus aus dem Rhythmus")

### ✅ Schritt 12 — PWA (Manifest + Icons)
- vite.config.ts war bereits vollständig konfiguriert (VitePWA, workbox, runtimeCaching)
- `public/icons/` war leer — PNG-Icons fehlten
- Reiner Node.js PNG-Generator (scripts/generate-icons.mjs) ohne externe Dependencies
  - Nutzt Node.js built-in `zlib.deflateSync` für PNG-Kompression
  - Design: Lila Hintergrund (#863bff) + weißer Blitz
  - Output: icon-192.png, icon-512.png, apple-touch-icon.png (180px)
- `npm run generate-icons` als Script in package.json eingetragen
- PWA precacht jetzt 14 Einträge (vorher 7)

### ✅ Schritt 13 — Heatmap & Streak verfeinern

**HeatmapGrid:**
- Monatsbezeichnungen über den Wochen-Spalten (Jan, Feb, Mär…)
- Heute-Highlight: blauer Outline-Ring um die aktuelle Zelle
- Freeform-Einträge jetzt sichtbar (Amber/Gelb, war vorher unsichtbar)
- Abend-Farbe von accent-green auf echtes #16a34a (klar unterscheidbar)
- Beide-Farbe auf #7c3aed (tiefer lila statt #6B4FBB)
- Zellgröße 11px → 13px (besser auf Mobile)
- Tag-Labels: nur Mo/Mi/Fr/So (weniger Rauschen)

**StreakBadge:**
- Meilenstein-Badges: 7+ 🔥 Amber / 14+ 🔥 Orange / 30+ ⭐ / 60+ 🏆 / 100+ 💯
- Framer Motion Spring-Animation beim Erscheinen
- "Beste Streak: X Tage" Anzeige wenn bestStreak > aktueller Streak
- Zero-Streak-State: "🌱 Starte heute deinen Streak" statt null

**Dashboard:**
- `getBestStreak()` neu in db.ts, parallel geladen
- "Diese Woche: X/7" Anzeige neben dem Streak-Badge
- Beides im Heatmap-Header angezeigt

### ✅ Schritt 14 — Vercel Deployment (live)
- `vercel.json` erstellt: SPA-Rewrites, build/output/install/framework-Konfiguration
- `.env.example` erstellt: alle 3 Keys dokumentiert (Supabase URL, Anon Key, Anthropic API Key)
- `.npmrc` mit `legacy-peer-deps=true` für vite-plugin-pwa + vite@8 Kompatibilität
- Deployment via `npx vercel --prod` (Vercel CLI, nicht Dashboard)
- Supabase Site URL auf die Vercel-URL aktualisiert
- Build erfolgreich: 2267 Module, 14 PWA-Precache-Einträge, 964ms Buildzeit

---

## Bugfix-Session — 2026-04-04

### ✅ Bug behoben: Journal speichern (409 Conflict)
- **Fehler war:** `409 Conflict` beim Speichern von Morgen-/Abend-Journal
- **Ursache 1:** `createJournalEntry` nutzte `.insert()` statt `.upsert()`
- **Fix:** `db.ts` → `.upsert(entry, { onConflict: 'user_id,entry_date,type' })`
- **Ursache 2 (tiefer):** `profiles`-Eintrag fehlte für den User → Foreign-Key-Verletzung (`Key is not present in table profiles`)
- **Fix:** `App.tsx` → `loadProfile()` legt automatisch einen minimalen `profiles`-Eintrag an wenn keiner existiert
- **Voraussetzung:** Unique Constraint in Supabase angelegt: `ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_user_date_type_unique UNIQUE (user_id, entry_date, type)`
- **Getestet:** Journal speichern funktioniert, Dashboard zeigt Streak und Fokus korrekt ✅

### ✅ Bug behoben: 5-Warum-Kette API-Fehler
- **Fehler war:** `"This model does not support assistant message prefill. The conversation must end with a user message."`
- **Ursache:** `runFiveWhys` in `claude.ts` baute Conversation-Array mit alternierenden Rollen — bei gerader Anzahl Antworten endete es mit `assistant`
- **Fix:** Nach dem Array-Aufbau wird geprüft ob letzte Nachricht `assistant` ist — falls ja, wird `{ role: 'user', content: 'Bitte stelle mir die nächste Warum-Frage.' }` angehängt
- **Getestet:** Onboarding Schritt 5 läuft durch ✅

### ✅ Fix: Dashboard recentEntries fehlte
- **Fehler war:** TypeScript Build-Fehler — `recentEntries` und `goals` in `Dashboard.tsx` nicht als State-Variablen definiert
- **Fix:** `recentEntries` State + `getRecentEntries` in `loadDashboardData` ergänzt; `goals` → `weeklyGoals` (korrekter State-Name)

### ✅ Bug behoben: CSS --surface Variable fehlte
- **Fehler war:** Render-Fehler / leere Hintergründe weil `--surface` CSS-Custom-Property nicht definiert war
- **Ursache:** Tailwind v4 generiert nicht automatisch alle Custom Properties — `--surface` musste explizit in der globalen CSS definiert werden
- **Fix:** `src/index.css` (oder globale CSS-Datei) → `--surface` Variable unter `:root` eingetragen
- **Getestet:** Layout rendert korrekt, keine leeren Flächen mehr ✅

### ⚠️ Bug NICHT behoben: Onboarding-Fortschritt nicht persistent
- **Laut altem Kontext als behoben markiert — funktioniert aber weiterhin nicht**
- Symptom: Tab-Wechsel setzt Onboarding auf Schritt 1 zurück
- Steht als Bug 1 in der Ausstehend-Liste oben — wird in nächster Session als erstes angegangen

### ✅ Bug behoben: Onboarding Schritt 9 — goals INSERT 400 Bad Request (goal_type Enum)
- **Fehler war:** `400 Bad Request` beim Speichern von 3-Jahres-/Jahres-/Quartalsziel im letzten Onboarding-Schritt
- **Ursache:** Supabase `goal_type` Enum kannte die Werte `three_year` und `year` noch nicht
- **Fix:** SQL-Migration in Supabase SQL Editor ausgeführt:
  ```sql
  ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'three_year';
  ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'year';
  ```
- **Getestet:** Onboarding Schritt 9 speichert alle 3 Ziele erfolgreich, Weiterleitung zu Dashboard funktioniert ✅

---

## Phase 2 — Fertige Schritte

### ✅ Schritt 15 — Einstellungen-Tab + Profil bearbeiten + Daten löschen

**Neue DB-Funktionen (db.ts):**
- `countJournalEntries`, `countGoals` — Anzahl per HEAD-Query
- `deleteAllJournalEntries`, `deleteAllGoals` — selektives Löschen
- `deleteAllUserData` — löscht journal_entries, goals, coach_sessions, pattern_events; setzt Profil zurück (name bleibt)

**Settings-Seite (`src/pages/Settings.tsx`):**
- Sektion 1 — Profil: Name, E-Mail (read-only), Nordstern, Werte-Tags (entfernbar + hinzufügbar), Stopp-Liste, Speichern-Button
- Sektion 2 — Ikigai: editierbare Felder (Platzhalter, in Schritt 19 befüllt)
- Sektion 3 — KI-Profil: Platzhalter (in Schritt 20 befüllt)
- Sektion 4 — Onboarding neu starten (1-stufig bestätigt, name bleibt)
- Sektion 5 — Gefahrenzone: Journal löschen (2-stufig), Ziele löschen (2-stufig), Alle Daten löschen (3-stufig mit "LÖSCHEN"-Texteingabe)
- Sektion 6 — Abmelden

**Navigation:**
- Settings-Tab in Tab-Bar ergänzt (Icon: Settings, Route: /settings)
- Route /settings in App.tsx eingetragen

**Typen (`database.ts`):**
- `profiles`: `ai_profile: Json`, `identity_statement: string | null` hinzugefügt
- `journal_entries`: `identity_action: string | null` hinzugefügt

### ✅ Schritt 16 — Ziel-Kaskade sichtbar machen

**Neue DB-Funktion:**
- `getActiveGoalHierarchy(userId)` → gibt `{ week, month, quarter, year, three_year }` zurück (jeweils aktives Ziel oder null)

**MorningStep2Goal.tsx:**
- Kontext-Banner oberhalb des Tages-Ziel-Felds: Quartal → Monat → Woche, collapsible mit Chevron
- Falls kein Wochenziel: Link zu /goals

**EveningJournal.tsx:**
- Lädt heute's Morgen-Eintrag → zeigt `„Dein heutiges Ziel war: …"` dezent oben (alle Steps außer Feedback-Step)

**Dashboard.tsx:**
- Fokus-Card mit 🎯 wenn morning_goal vorhanden
- CTA-Banner "Starte deinen Tag — Ziel setzen" wenn noch kein Morgen-Journal

**JournalOverview.tsx:**
- `GoalBreadcrumb`-Komponente im Entry-Detail-Sheet: zeigt Ziel-Kette (via `linked_goal_ids[0]`) aus Store-Goals

### ✅ Schritt 17 — 3-Jahres-Horizont in der Ziel-Hierarchie

**Typen:**
- `GoalType` erweitert: `'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'`
- `database.ts`: goals.type um neue Werte ergänzt

**Goals.tsx:**
- Tab-Bar: `3 Jahre | Jahr | Quartal | Monat | Woche | Alle`
- Tree-View zeigt vollständige Hierarchie: three_year → year → quarterly → monthly → weekly
- SectionHeader und EmptyState für alle 5 Typen

**GoalSheet.tsx:**
- 5 Typ-Optionen, Placeholder-Texte je Typ
- validParents-Logik: year→three_year, quarterly→year, monthly→quarterly, weekly→monthly

**Step7QuartalZiel.tsx:**
- 3 interne Sub-Steps mit Fortschrittsbalken (1/3, 2/3, 3/3)
- Sub-Step 1: 3-Jahres-Ziel (Pflichtfeld)
- Sub-Step 2: Jahres-Ziel (überspringbar)
- Sub-Step 3: Quartalsziel + Nordstern-Kontext

**OnboardingData:** `threeYearGoalTitle`, `yearGoalTitle` hinzugefügt

**Onboarding.tsx:** speichert alle 3 Ziele mit korrekter parent_id-Verkettung

### ✅ Schritt 18 — Identitäts-Modul

**Neuer Onboarding-Schritt (`Step6_Identity.tsx`):**
- Position: zwischen Step5 (Nordstern) und Step6 (Stopp-Liste) → TOTAL_STEPS = 8
- Textarea: "Stell dir vor, es ist [Jahr+3]. Du hast alles erreicht. Wer bist du jetzt?"
- Button "KI hilft mir formulieren" → `reformulateIdentity()` in claude.ts
- "Überspringen"-Link
- Speichert `profiles.identity_statement`

**MorningStep2Goal.tsx:**
- Identitäts-Anker-Feld nach dem Tages-Ziel (nur wenn `identity_statement` gesetzt)
- Label: "Welche Handlung heute beweist wer du bist?" (optional)
- Speichert als `journal_entries.identity_action`

**Dashboard.tsx:**
- Identitäts-Reminder-Card: erste 60 Zeichen + "Vollständig lesen" (Modal) + ✕ dismiss
- Dismiss setzt `localStorage('identity_reminder_dismissed')` mit Timestamp
- Erscheint erneut nach 3+ Tagen

**claude.ts:** `reformulateIdentity()` hinzugefügt

### ✅ Schritt 19 — Ikigai als Onboarding-Schritt

**Neuer Onboarding-Schritt (`Step3_Ikigai.tsx`):**
- Position: nach Step2 (Lebensrad), vor Step3 (Werte-Radar) → TOTAL_STEPS = 9
- 4 Fragen einzeln mit Fortschrittsbalken (1/4–4/4)
- "Meinen Ikigai-Kern finden" → `generateIkigaiSynthesis()` → editierbare lila Card
- "Manuell eingeben" als Fallback, "Schritt überspringen" verfügbar
- Speichert `profiles.ikigai = { loves, good_at, paid_for, world_needs, synthesis }`

**Settings.tsx Sektion 2:**
- Alle 4 Ikigai-Felder + Synthesis als editierbare Textareas
- Eigener Speichern-Button → `updateProfile({ ikigai: {...} })`

**claude.ts:**
- `generateIkigaiSynthesis()` hinzugefügt
- `buildSystemPrompt()` bindet `ikigai.synthesis` als Kontext ein

**OnboardingData:** `ikigai: IkigaiData` hinzugefügt; `Onboarding.tsx` speichert ikigai bei Finish

### ✅ Schritt 20 — KI Muster-Erkennung

**types/index.ts:**
- `PatternAnalysis` Interface: energyPatterns, focusPatterns, sabotagePatterns, progressObservation, coachQuestion, generatedAt

**claude.ts:**
- `generatePatternAnalysis(profile, entries, goals)` → JSON-Parsing mit Backtick-Strip + try/catch

**Dashboard.tsx:**
- Auto-Analyse ab 14 Einträgen, alle 14 Tage (silent, kein UI-Feedback)
- Imports: `generatePatternAnalysis`, `updateProfile`

**Coach.tsx:**
- Muster-Panel auf Modus-Auswahlseite (< 30 Tage alt): Energie / Fokus / Achtung
- "Muster mit Coach besprechen →"-Button startet 'clarity'-Session mit coachQuestion als Starter
- `startSession` erweitert um optionales `starterOverride`-Argument

**Review.tsx:**
- Step 0 (KI-Zusammenfassung): sabotagePatterns + coachQuestion als Anhang

**Settings.tsx Sektion 3:**
- Vollständige Anzeige: Energie-Muster, Fokus-Muster, Sabotage-Trigger, "Zuletzt analysiert"-Datum
- "Jetzt neu analysieren"-Button (nur aktiv wenn ≥14 Einträge)
- Noch-nicht-Zustand: zeigt verbleibende Einträge bis 14

---

## Deployment Info

| | |
|---|---|
| **Production URL** | https://life-os-henna-xi.vercel.app |
| **GitHub Repo** | https://github.com/Scholzer0303/life-os |
| **Vercel Projekt** | scholzer0303s-projects/life-os |
| **Letzter Commit** | fix: --surface CSS-Variable definiert, Onboarding-Persistenz via localStorage |
| **Deployed am** | 2026-04-04 (Auto-Deploy via Push) — Bugfix-Session vollständig ✅ |

Auto-Deploy: Jeder Push auf `master` → Vercel baut und deployed automatisch.

---

## Dev Server starten

```bash
cd Desktop/life-os
npm run dev
```

Browser: http://localhost:5174

---

## KI-Funktionen in claude.ts (Überblick)

| Funktion | Wo genutzt |
|---|---|
| `sendCoachMessage()` | Coach.tsx — Chat |
| `getJournalFeedback()` | EveningJournal, FreeformJournal |
| `runFiveWhys()` | Onboarding Step4 |
| `summarizeNorthStar()` | Onboarding Step5 |
| `handlePatternInterrupt()` | PatternInterrupt.tsx |
| `generateWeeklySummary()` | Review.tsx Step 0 |
| `generateWeeklyFeedback()` | Review.tsx Step 5 |
| `generateIkigaiSynthesis()` | Onboarding Step3_Ikigai |
| `reformulateIdentity()` | Onboarding Step6_Identity |
| `checkGoalAlignment()` | Goals.tsx |
| `generatePatternAnalysis()` | Dashboard (auto), Settings (manuell) |

Alle Funktionen nutzen `claude-sonnet-4-6` mit Rate Limiting (min. 10s zwischen Requests).

---

## Bekannte Eigenheiten

- Dev Server läuft manchmal auf Port 5174 statt 5173 (wenn 5173 belegt)
- Git LF/CRLF Warnings sind normal auf Windows — kein Problem
- "auto-compact" in Claude Code = normales Verhalten bei langen Sessions
