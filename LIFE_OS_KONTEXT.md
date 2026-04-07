# LIFE_OS_KONTEXT.md — Projektgedächtnis
# Wird nach JEDEM abgeschlossenen Schritt von Claude Code aktualisiert.
# Nach jeder Session: diese Datei ins Claude Project hochladen (ersetzt alte Version).
# Zuletzt aktualisiert: 2026-04-08 (Paket 4A Schritt 1 abgeschlossen)

---

## Session-Start Lesereihenfolge
VISION.md → LIFE_OS_KONTEXT.md → LIFE_OS_FEATURES.md

---

## Aktueller App-Stand

Life OS ist eine vollständig funktionsfähige PWA, live auf https://life-os-henna-xi.vercel.app

**Was die App aktuell kann (Stand nach Paket 3C):**
- Onboarding (9 Schritte): Name → Lebensrad → Ikigai → Werte → 5-Warum → Nordstern → Identität → Stopp-Liste → Ziele
- Journal: Morgen (5 Schritte inkl. Metriken + Kalender-Check), Abend (Energie-Farben + Dankbarkeit + Abschluss-Seite), Freeform
- Ziele: Hierarchie three_year → year → quarterly → monthly → weekly, Tasks + Habits auf Monatsebene
- Habits: Tabellen `habits` + `habit_logs` in Supabase vorhanden. Habits können bei Monatszielen angelegt werden.
- Dashboard: Nordstern, Identitäts-Banner, heutiger Fokus, Tasks, Wochenziele, Heatmap, Streak
- Coach: 4 Modi, Ton-Auswahl (sachlich/arschtritt/anerkennend), Vergangene Sessions, Nordstern als Kontext
- Review: Woche/Monat/Quartal/Jahr, KI-Zusammenfassung, Archiv (wird in Paket 4 aufgelöst)
- Einstellungen: Profil, Werte, Stopp-Liste, Ikigai, KI-Profil, Onboarding neu starten, Datenverwaltung

**Navigation aktuell:** Dashboard | Journal | Coach | Übersicht | Einstellungen (seit Paket 4A Schritt 1)

**Navigation vorher:** Dashboard | Journal | Coach | Ziele | Review | Einstellungen

---

## Tech Stack

- React + TypeScript + Vite + Tailwind CSS v4
- Supabase (PostgreSQL) — Projekt: life-os, Region: Europe West (London), ID: oqmowbctjzoiwtgpoqmo
- Anthropic Claude API (`claude-sonnet-4-6`)
- Zustand (State), Framer Motion (Animationen), Recharts (Charts), PWA
- Deployment: Vercel, Auto-Deploy via GitHub (Branch: master)
- Lokaler Pfad: C:/Users/Anwender/Desktop/life-os

---

## Supabase-Tabellen

| Tabelle | Zweck | Status |
|---|---|---|
| `profiles` | User-Profil, Nordstern, Werte, Ikigai, Identität | aktiv |
| `goals` | Ziel-Hierarchie (three_year/year/quarterly/monthly/weekly) | aktiv, wird von Journal genutzt |
| `journal_entries` | Morgen/Abend/Freeform-Einträge | aktiv |
| `coach_sessions` | KI-Coach + Reviews | aktiv |
| `pattern_events` | Pattern-Interrupt-Logs | aktiv |
| `goal_tasks` | Tasks pro Ziel | aktiv |
| `habits` | Habits pro Monat (inkl. frequency_type + frequency_value nach Schritt 3) | aktiv |
| `habit_logs` | Tägliche Habit-Abhakungen | aktiv |
| `recurring_blocks` | Kalender-Zeitblöcke (deaktiviert, Code bleibt) | inaktiv |
| `recurring_block_exceptions` | Ausnahmen Serientermine (deaktiviert) | inaktiv |
| `journal_periods` | Planung + Reflexion für Woche/Monat/Quartal/Jahr | NEU in Paket 4 Schritt 2 |

---

## Projektstruktur (relevante Dateien)

```
src/
  pages/
    Dashboard.tsx         → bleibt wie jetzt (wird ggf. in Paket 5 überarbeitet)
    Journal.tsx           → wird in Paket 4 zum Herzstück umgebaut
    Coach.tsx             → bleibt, erhält mehr Kontext
    Overview.tsx          → NEU in Paket 4
    Goals.tsx             → wird deaktiviert (Code bleibt)
    Review.tsx            → wird deaktiviert (Code bleibt)
    Settings.tsx          → Profil-Bereiche werden einzeln bearbeitbar
  components/
    journal/
      MorningJournal.tsx  → Inhalt wird nach JournalDay.tsx übernommen
      EveningJournal.tsx  → Inhalt wird nach JournalDay.tsx übernommen
      JournalDay.tsx      → NEU (Paket 4B)
      JournalWeek.tsx     → NEU (Paket 4C)
      JournalMonth.tsx    → NEU (Paket 4C)
      JournalQuarter.tsx  → NEU (Paket 4D)
      JournalYear.tsx     → NEU (Paket 4D)
    habits/
      HabitManager.tsx    → NEU (Paket 4C)
      HabitChecklist.tsx  → NEU (Paket 4B)
      HabitGrid.tsx       → NEU (Paket 4E)
    overview/
      OverviewCalendar.tsx → NEU (Paket 4E)
      OverviewStats.tsx    → NEU (Paket 4E)
      MetricChart.tsx      → NEU (Paket 4E)
  lib/
    db.ts                 → neue Funktionen für journal_periods, habit-Frequenz
    claude.ts             → Coach erhält vollständigen Kontext
    utils.ts              → Perioden-Hilfsfunktionen (bereits vorhanden)
```

---

## Ausstehend — Paket 4

**Nächste Session startet mit: Paket 4D, Schritt 9**
Reihenfolge strikt einhalten. Immer nur einen Schritt. Erst testen, dann weiter.

| Nr | Name | Paket | Status |
|----|------|-------|--------|
| 1 | Navigation + neue Seiten anlegen | 4A | ✅ 2026-04-08 |
| 2 | DB: journal_periods Tabelle | 4A | ✅ 2026-04-08 |
| 3 | DB: habits um frequency erweitern | 4A | ✅ 2026-04-08 |
| 4 | Journal Tag: Morgen-Eintrag | 4B | ✅ 2026-04-08 |
| 5 | Journal Tag: Abend-Eintrag + Habits | 4B | ✅ 2026-04-08 |
| 6 | Journal Woche: Planung + Reflexion | 4C | ✅ 2026-04-08 |
| 7 | Journal Monat: Planung + Ziele + Habits | 4C | ✅ 2026-04-08 |
| 8 | Habit-Frequenz-Logik + Wochenfortschritt | 4C | ✅ 2026-04-08 |
| 9 | Journal Quartal: Planung + Reflexion | 4D | ⛔ Nach 4C |
| 10 | Journal Jahr: Planung + Reflexion + Nordstern | 4D | ⛔ Nach 4C |
| 11 | Übersicht: Kalender-Monatsansicht | 4E | ⛔ Nach 4D |
| 12 | Übersicht: Habit-Grid | 4E | ⛔ Nach 4D |
| 13 | Übersicht: Metriken-Visualisierung | 4E | ⛔ Nach 4D |
| 14 | Ziele-Tab auflösen | 4F | ⛔ Nach 4E |
| 15 | Review-Tab auflösen + Profil reparieren | 4F | ⛔ Nach 4E |

---

## Wichtige Hinweise für Claude Code (Paket 4)

1. **Bestehende Inhalte übernehmen, nicht neu erfinden:**
   Der Inhalt von MorningJournal.tsx und EveningJournal.tsx ist gut — nur die Struktur ändert sich.
   Felder, Speicher-Logik, Validierung: übernehmen.

2. **Goals-Daten bleiben erhalten:**
   Die goals-Tabelle wird weiterhin genutzt. Monatsziele die bisher in Goals.tsx erstellt wurden,
   müssen in JournalMonth.tsx sichtbar und bearbeitbar sein.

3. **Habits-Tabelle bereits vorhanden:**
   habits + habit_logs wurden in Paket 3C angelegt. Nur frequency-Felder fehlen noch (Schritt 3).

4. **Kein Big Bang — schrittweise:**
   Nach jedem Schritt muss die App vollständig funktionieren. Keine halbfertigen Zustände committen.

5. **SQL immer zuerst zeigen:**
   Vor jeder DB-Migration: SQL ausgeben, auf Lukas' "weiter" warten, dann erst weitermachen.

---

## Archiv

**Paket 1 — April 2026 ✅**
Bugs 1–6, Änderungen 7–11, Features 12–15. Build fehlerfrei, live deployed.

**Paket 2A — April 2026 ✅**
Fix 1–4, Feature 5–9 (Review-Archiv, Task-Kaskade, Kalender, Custom-Wochentage, Task-Verknüpfung).

**Paket 3A — April 2026 ✅**
Schritte 1–7: Morgenjournal (Zeitblock→Kalender-Check, Abschluss-Seite, Tasks max. 4),
Abendjournal (Energie-Farben, Dankbarkeit, Abschluss-Seite), Kalender-Tab entfernt.
Neue DB-Felder: calendar_planned, gratitude.

**Paket 3B — April 2026 ✅**
Schritte 8–12: Dynamische Datum-Logik, Periodenübergang-Modal, Hierarchie visuell,
Tasks nur Monat/Woche, Coach Ton-Auswahl (sachlich/arschtritt/anerkennend).

**Paket 3C (Schritt 13) — April 2026 ✅**
Morgenjournal Metriken: weight + sleep_score in DB, Toggle in Settings, Felder in MorningStep1.

**Paket 3C (Schritte 14–15) — April 2026 ✅**
Habit-Tracker Datenbank (habits + habit_logs), Habits bei Monatszielen definierbar.
Schritte 16–20 aus Paket 3C/3D wurden obsolet durch Neuplanung (Paket 4).
