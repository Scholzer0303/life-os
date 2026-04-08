# LIFE_OS_KONTEXT.md — Projektgedächtnis
# Wird nach JEDEM abgeschlossenen Schritt von Claude Code aktualisiert.
# Nach jeder Session: diese Datei ins Claude Project hochladen (ersetzt alte Version).
# Zuletzt aktualisiert: 2026-04-08 (Paket 5D komplett abgeschlossen — KI-Feedback final)

---

## Session-Start Lesereihenfolge
VISION.md → LIFE_OS_KONTEXT.md → LIFE_OS_FEATURES.md

---

## Aktueller App-Stand

Life OS ist eine vollständig funktionsfähige PWA, live auf https://life-os-henna-xi.vercel.app

**Was die App aktuell kann (Stand nach Paket 5 komplett):**
- Navigation: Dashboard · Journal · Coach · Übersicht · Einstellungen
- Journal: Tag (Morgen/Abend), Woche, Monat, Quartal, Jahr — alle mit Planung + Reflexion
- Morgenjournal: Metriken (Energie, Gewicht, Schlaf), 0–4 Tasks, Kalender-Check, KI-Impuls
- Abendjournal: Reflexion, Habits abhaken (mit Frequenz-Logik), Energie-Farben, Abschluss
- Ziele: Hierarchie vollständig in UI (parent_id Dropdown Woche→Monat→Quartal→Jahr)
- Ziel-KI: Sparkles-Button an jedem Ziel → FeedbackPanel mit Markdown, Cache, Rückfrage-Verlauf, Navigation-persistent
- Habits: Tabellen habits + habit_logs, frequency_type + frequency_value, Monatsübergang-Dialog
- Übersicht: Kalender-Monatsansicht, Habit-Grid, Metriken-Charts (Recharts)
- Coach: 4 Modi, Ton-Auswahl (sachlich/arschtritt/anerkennend), vergangene Sessions
- Einstellungen: Eingeklappt/aufklappbar (11 Sektionen), Vision readonly mit Link zu Journal→Jahr
- Dashboard: Vision-Banner ("Vision"), Streak, Tasks, Wochenziele, Heatmap
- Überall: "Nordstern" → "Vision" in UI (DB-Feld `north_star` unverändert)

**Bekannte offene Bugs:**
- keine bekannten Bugs mehr

**Behobene Bugs (Paket 5A Schritt 1):**
- ✅ Abhak-Sync Dashboard↔Wochenziele: handleToggleTask aktualisiert jetzt auch dailyTasks-State
- ✅ Supabase-Link 404 in Einstellungen entfernt (Info-Text bleibt)
- ✅ KI-Fehler zeigen jetzt immer "KI momentan nicht verfügbar — bitte erneut versuchen." (MorningJournal, EveningJournal, JournalWeek/Month/Quarter/Year, Coach, AIFeedbackCard)

**Neue Komponenten (Paket 5D):**
- `src/components/journal/FeedbackPanel.tsx` — Shared KI-Feedback-Panel mit Markdown, Rückfrage-Verlauf, "Neues Feedback"/"Rückfrage"-Buttons
- Modul-level Caches in allen 4 Journal-Komponenten: `goalFeedbackCache`, `followupHistoryCache`, `openGoalId` — überleben Navigation

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
| `profiles` | User-Profil, Vision (Feld: north_star), Werte, Ikigai, Identität | aktiv |
| `goals` | Ziel-Hierarchie (three_year/year/quarterly/monthly/weekly), parent_id vorhanden | aktiv |
| `journal_entries` | Morgen/Abend/Freeform-Einträge | aktiv |
| `coach_sessions` | KI-Coach + Reviews | aktiv |
| `pattern_events` | Pattern-Interrupt-Logs | aktiv |
| `goal_tasks` | Tasks pro Ziel | aktiv |
| `habits` | Habits pro Monat (inkl. frequency_type + frequency_value) | aktiv |
| `habit_logs` | Tägliche Habit-Abhakungen | aktiv |
| `recurring_blocks` | Kalender-Zeitblöcke (deaktiviert, Code bleibt) | inaktiv |
| `recurring_block_exceptions` | Ausnahmen Serientermine (deaktiviert) | inaktiv |
| `journal_periods` | Planung + Reflexion für Woche/Monat/Quartal/Jahr | aktiv |

**Geplante Migrations in Paket 6 (noch nicht ausgeführt):**
```sql
-- Paket 6B Schritt 4:
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_check TEXT
  CHECK (identity_check IN ('yes', 'partly', 'no'));
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_note TEXT;
```

---

## Projektstruktur (relevante Dateien)

```
src/
  pages/
    Dashboard.tsx         → aktiv, Umbenennung Nordstern→Vision in Paket 5
    Journal.tsx           → aktiv, Herzstück
    Coach.tsx             → aktiv, erhält erweiterten Kontext in Paket 6
    Overview.tsx          → aktiv
    Goals.tsx             → deaktiviert (Code bleibt, nicht navigierbar)
    Review.tsx            → deaktiviert (Code bleibt, nicht navigierbar)
    Settings.tsx          → wird in Paket 5 neu strukturiert
  components/
    journal/
      JournalDay.tsx      → aktiv (Morgen + Abend)
      JournalWeek.tsx     → aktiv
      JournalMonth.tsx    → aktiv
      JournalQuarter.tsx  → aktiv
      JournalYear.tsx     → aktiv
      MorningJournal.tsx  → alt, bleibt im Code (wird später entfernt)
      EveningJournal.tsx  → alt, bleibt im Code (wird später entfernt)
    overview/
      OverviewCalendar.tsx → aktiv
      HabitGrid.tsx        → aktiv
      MetricChart.tsx      → aktiv
    vision/
      VisionFlow.tsx      → NEU in Paket 6
    identity/
      IdentityFlow.tsx    → NEU in Paket 6
  lib/
    db.ts                 → alle Supabase-Operationen
    claude.ts             → alle Claude-API-Aufrufe
    utils.ts              → Perioden-Hilfsfunktionen
```

---

## Ausstehend — Paket 5 + 6

| Nr | Name | Paket | Status |
|----|------|-------|--------|
| 5-1 | Bugs beheben (Sync, 404, KI-Fehler) | 5A | ✅ 2026-04-08 |
| 5-2 | PWA Session Persistence | 5A | ✅ 2026-04-08 |
| 5-3 | Ziel-Hierarchie UI (Verknüpfung) | 5B | ✅ 2026-04-08 |
| 5-4 | "Nordstern" → "Vision" überall ersetzen | 5C | ✅ 2026-04-08 |
| 5-5 | Einstellungen neu strukturieren | 5C | ✅ 2026-04-08 |
| 5-6 | KI-Ziel-Feedback: Markdown, Cache, Rückfrage-Verlauf, Navigation-persistent | 5D | ✅ 2026-04-08 |
| 6-1 | Vision: Geführter Erstellungs-Flow | 6A | ⬜ OFFEN |
| 6-2 | Vision als oberste Ebene in Kaskade | 6A | ⬜ OFFEN |
| 6-3 | Soll-Identität: Erstellung + Verwaltung | 6B | ⬜ OFFEN |
| 6-4 | Identität im täglichen Flow (Morgen/Abend) | 6B | ⬜ OFFEN |
| 6-5 | Habit-KI: Bewertung + Vorschläge | 6C | ⬜ OFFEN |
| 6-6 | Coach erhält vollständigen Kontext | 6D | ⬜ OFFEN |

---

## Wichtige Designentscheidungen (Paket 5+6)

1. **"Nordstern" heißt ab Paket 5 überall "Vision"** — DB-Feldname `north_star` bleibt, nur UI-Labels ändern sich.

2. **Ziel-Hierarchie ist optional** — Keine Pflichtverknüpfung. Lukas entscheidet ob er verknüpft oder nicht.

3. **KI direkt an Zielen** — Nicht im Coach-Tab, sondern kontextuell als kleines Panel direkt beim Ziel.

4. **Vision-Flow und Identitäts-Flow sind geführte Dialoge** — KI hilft beim Formulieren, Lukas entscheidet was gespeichert wird.

5. **Habit-Vorschläge sind übernehmbar** — Ein-Klick-Übernahme, Habit wird identisch zu manuell erstellten Habits.

6. **Identitäts-Abgleich abends ist dreistufig** — Ja / Teilweise / Nein. Textfeld öffnet sich nur bei Teilweise/Nein.

---

## Archiv

**Paket 1 — April 2026 ✅**
Bugs 1–6, Änderungen 7–11, Features 12–15. Build fehlerfrei, live deployed.

**Paket 2A — April 2026 ✅**
Fix 1–4, Feature 5–9 (Review-Archiv, Task-Kaskade, Kalender, Custom-Wochentage, Task-Verknüpfung).

**Paket 3A — April 2026 ✅**
Schritte 1–7: Morgenjournal (Zeitblock→Kalender-Check, Abschluss-Seite, Tasks max. 4),
Abendjournal (Energie-Farben, Dankbarkeit, Abschluss-Seite), Kalender-Tab entfernt.

**Paket 3B — April 2026 ✅**
Schritte 8–12: Dynamische Datum-Logik, Periodenübergang-Modal, Hierarchie visuell,
Tasks nur Monat/Woche, Coach Ton-Auswahl.

**Paket 3C — April 2026 ✅**
Schritt 13: Morgenjournal Metriken (weight + sleep_score).
Schritte 14–15: Habit-Tracker Datenbank (habits + habit_logs).

**Paket 4 (alle 15 Schritte) — April 2026 ✅**
4A: Navigation + journal_periods DB + habits frequency.
4B: JournalDay (Morgen + Abend).
4C: JournalWeek + JournalMonth + Habit-Frequenz-Logik.
4D: JournalQuarter + JournalYear.
4E: Übersicht (Kalender + Habit-Grid + Metriken-Charts).
4F: Ziele-Tab + Review-Tab aufgelöst, Profil repariert, Onboarding → Profil einrichten.

**Paket 5 (alle 6 Schritte) — April 2026 ✅**
5A: Bug-Fix (Sync, 404, KI-Fehler) + PWA Session Persistence.
5B: Ziel-Hierarchie UI — Dropdown Woche→Monat→Quartal→Jahr, parent_id in allen 4 Journal-Komponenten.
5C: "Nordstern" → "Vision" in allen UI-Labels + claude.ts. Einstellungen neu strukturiert (11 eingeklappte Sektionen).
5D: KI-Ziel-Feedback — FeedbackPanel (shared), Markdown-Rendering, Feedback-Cache, Panel-State-Persistenz, Rückfrage-Verlauf (gecacht + multi-turn).
