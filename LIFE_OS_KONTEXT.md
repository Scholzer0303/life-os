# LIFE_OS_KONTEXT.md
# Wird nach jedem Schritt aktualisiert — immer die neueste Version ins Claude Project hochladen

Zuletzt aktualisiert: 2026-04-06

---

## Aktueller App-Stand

Life OS ist eine vollständig funktionsfähige PWA, live auf https://life-os-henna-xi.vercel.app

**Was die App kann:**
- Onboarding (9 Schritte): Name → Lebensrad → Ikigai → Werte → 5-Warum → Nordstern → Identität → Stopp-Liste → Ziele
- Journal: Morgen (5 Schritte inkl. Tages-Tasks), Abend (4 Schritte), Freeform — alle mit KI-Feedback
- Ziele: Hierarchie three_year → year → quarterly → monthly → weekly, mit abhakbaren Tasks (goal_tasks)
- Dashboard: Heatmap, Streak, Wochenziele mit Tasks, Tages-Tasks (verknüpft + unverknüpft, einheitliche Quelle), Pattern-Interrupt-Banner, Identitäts-Reminder
- Morgenjournal: Übertrag-Dialog für offene gestrige Tasks (Übernehmen/Löschen)
- Coach: 4 Modi, Muster-Panel, Archiv vergangener Sessions, localStorage-Persistenz
- Review: Woche/Monat/Quartal/Jahr, KI-Zusammenfassung mit intelligenter Datenaggregation
- Kalender: Tagesansicht mit wiederkehrenden Zeitblöcken, Serien-Bearbeitung, Sync mit Morgenjournal
- Einstellungen: Profil, Ikigai, KI-Analyse, Daten löschen (granular), Abmelden
- Pattern Interrupt: eigene Seite mit 3-Schritt-Flow

---

## Tech Stack

- React + TypeScript + Vite + Tailwind CSS v4
- Supabase (PostgreSQL) — Projekt: life-os, Region: Europe West (London)
- Anthropic Claude API (`claude-sonnet-4-6`)
- Zustand (State), Framer Motion (Animationen), PWA (Vite PWA Plugin)
- Deployment: Vercel, Auto-Deploy via GitHub (Branch: master)

---

## Supabase-Tabellen

| Tabelle | Zweck |
|---|---|
| `profiles` | User-Profil, Nordstern, Werte, Ikigai, Identität, KI-Analyse |
| `goals` | Ziel-Hierarchie (three_year/year/quarterly/monthly/weekly) |
| `journal_entries` | Morgen/Abend/Freeform-Einträge inkl. daily_tasks (JSONB) |
| `coach_sessions` | KI-Coach-Unterhaltungen + Reviews |
| `pattern_events` | Pattern-Interrupt-Logs |
| `goal_tasks` | Abhakbare Tasks pro Ziel |
| `recurring_blocks` | Wiederkehrende Kalender-Zeitblöcke |
| `recurring_block_exceptions` | Ausnahmen/Änderungen einzelner Serientermine |

Row Level Security aktiv auf allen Tabellen.

---

## Projektstruktur (relevante Dateien)

```
src/
  pages/          Dashboard, Journal, Goals, Coach, Review, Settings, Calendar, PatternInterrupt, Login, Onboarding
  components/
    journal/      MorningJournal, EveningJournal, FreeformJournal, AIFeedbackCard, MorningStep2Goal
    goals/        GoalCard, GoalDetailCard, GoalSheet
    dashboard/    HeatmapGrid, StreakBadge, GoalCard
    onboarding/   Step1–Step7 (9 Schritte)
    layout/       Navigation, AppLayout
  lib/            db.ts, claude.ts, supabase.ts, utils.ts
  store/          useStore.ts
  types/          index.ts, database.ts
```

---

## Ausstehend — Paket 2

Bearbeitungsreihenfolge: Fix 1 → Fix 2 → Fix 3 → Fix 4 → Feature 5 → Feature 6 → Feature 7 → Feature 8 → Feature 9 → (Pause) → Feature 10
**Immer nur einen Schritt nach dem anderen. Erst testen, dann "weiter" sagen.**

| Nr | Name | Typ | Status |
|----|------|-----|--------|
| Fix 1 | ⓘ beim "Ich bin raus"-Link | Klein | ✅ FERTIG |
| Fix 2 | Fokus-Karte im Dashboard verschieben | Klein | ✅ FERTIG |
| Fix 3 | Tab-Reihenfolge anpassen | Klein | ✅ FERTIG |
| Fix 4 | Supabase-Speicherinfo in Einstellungen | Klein | ✅ FERTIG |
| Feature 5 | Review-Archiv | Klein-Mittel | ✅ FERTIG |
| Feature 6 | Task-Kaskade für alle Ziel-Ebenen | Mittel | ✅ FERTIG |
| Feature 7 | Kalender: Wochen- und Monatsansicht | Mittel | ✅ FERTIG |
| Feature 8 | Kalender: Spezifische Wochentage | Mittel | ✅ FERTIG |
| Feature 9 | Tages-Tasks ↔ Wochenziel-Tasks verknüpfen | Groß | ✅ FERTIG |
| Feature 10 | Habit Tracker (Paket 2B) | Sehr Groß | ⛔ Erst nach 2A |

Genaue Spezifikation zu jedem Schritt: siehe LIFE_OS_FEATURES.md

---

## Archiv (abgeschlossene Pakete)

**Paket 1 — April 2026 ✅**
Bugs 1–6 (Onboarding-Persistenz, Markdown, Coach-Session, Grammatik, Journal-Prefill, KI-Button), Änderungen 7–11 (Banner-Logik, Review umbenennen, Einstellungs-Tooltips, Zeitraum-Auswahl, intelligente Aggregation), Features 12–15 (Kalender, Ziel-Tasks, Tages-Tasks im Journal, Coach-Archiv). Build fehlerfrei, live deployed.
