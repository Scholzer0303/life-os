# LIFE_OS_KONTEXT.md
# Wird nach jedem Schritt aktualisiert — immer die neueste Version ins Claude Project hochladen

Zuletzt aktualisiert: Nach Schritt 20 (Phase 2 vollständig)

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
- Deployment: Vercel (noch nicht deployed)

---

## Projektordner

```
C:/Users/Anwender/Desktop/life-os/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── journal/         ✅ MorningJournal, EveningJournal, FreeformJournal, AIFeedbackCard
│   │   ├── goals/           ✅ GoalCard, GoalDetailCard, GoalSheet
│   │   ├── coach/           ✅ (kein separater Ordner, direkt in Coach.tsx)
│   │   └── onboarding/      ✅ Alle 7 Schritte
│   ├── pages/
│   │   ├── Login.tsx        ✅
│   │   ├── Onboarding.tsx   ✅
│   │   ├── Dashboard.tsx    ✅
│   │   ├── Journal.tsx      ✅
│   │   ├── Goals.tsx        ✅
│   │   ├── Coach.tsx        ✅
│   │   └── Review.tsx       ✅
│   ├── lib/
│   │   ├── supabase.ts      ✅
│   │   ├── claude.ts        ✅ Mit Rate Limiting
│   │   ├── db.ts            ✅ CRUD für alle 5 Tabellen
│   │   └── utils.ts         ✅
│   ├── store/
│   │   └── useStore.ts      ✅ Zustand Global State
│   └── types/
│       ├── index.ts         ✅
│       └── database.ts      ✅ Supabase v2 Types
├── .env                     ✅ Keys eingetragen
├── .gitignore               ✅ .env geschützt
├── schema.sql               ✅ Bereits in Supabase eingespielt
├── vite.config.ts           ✅ PWA konfiguriert
└── LIFE_OS_CLAUDE_CODE_BRIEFING.md
```

---

## Supabase Tabellen (alle angelegt ✅)

- `profiles` — Nutzerprofil, Nordstern, Werte, Ikigai, Stopp-Liste
- `goals` — Quartal/Monat/Woche Ziele mit Hierarchie
- `journal_entries` — Morgen/Abend/Freeform Einträge mit Timeblocks
- `coach_sessions` — KI-Coach Gespräche
- `pattern_events` — Pattern Interrupt Log

Row Level Security: aktiv auf allen Tabellen ✅

---

## Fertige Schritte

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

### ✅ Schritt 4 — Onboarding (7 Schritte)
1. Willkommen + Name
2. Lebensrad mit animiertem Spider-Web SVG (8 Achsen)
3. Werte-Radar: 12 Karten, Top-5-Auswahl, Konflikt-Erkennung
4. 5-Warum-Kette mit Claude API (bis zu 5 KI-Folgefragen)
5. Nordstern: KI-Zusammenfassung + Freitext
6. Stopp-Liste: min. 3 Einträge, dynamisch erweiterbar
7. Erstes Quartalsziel → speichert Profile + Goal in Supabase
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

## Nächste Schritte

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

## Ausstehend

Alle Phase-2-Schritte abgeschlossen. 🎉

---

## Deployment Info

| | |
|---|---|
| **Production URL** | https://life-os-henna-xi.vercel.app |
| **GitHub Repo** | https://github.com/Scholzer0303/life-os |
| **Vercel Projekt** | scholzer0303s-projects/life-os |
| **Deployment ID** | dpl_25iiiULAVmdVkzaxHDKSAy8X8ECR |
| **Deployed am** | 2026-04-03 |

Auto-Deploy: Jeder Push auf `master` → Vercel baut und deployed automatisch.

---

## Dev Server starten

```bash
cd Desktop/life-os
npm run dev
```

Browser: http://localhost:5174

---

## Bekannte Eigenheiten

- Dev Server läuft manchmal auf Port 5174 statt 5173 (wenn 5173 belegt)
- Git LF/CRLF Warnings sind normal auf Windows — kein Problem
- "auto-compact" in Claude Code = normales Verhalten bei langen Sessions
