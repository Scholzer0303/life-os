# LIFE_OS_KONTEXT.md — Projektgedächtnis
# Wird nach JEDEM abgeschlossenen Schritt von Claude Code aktualisiert.
# Nach jeder Session: diese Datei ins Claude Project hochladen (ersetzt alte Version).
# Zuletzt aktualisiert: 2026-04-07

---

## Session-Start Lesereihenfolge
VISION.md → LIFE_OS_KONTEXT.md → LIFE_OS_FEATURES.md

---

## Aktueller App-Stand

Life OS ist eine vollständig funktionsfähige PWA, live auf https://life-os-henna-xi.vercel.app

**Was die App kann:**
- Onboarding (9 Schritte): Name → Lebensrad → Ikigai → Werte → 5-Warum → Nordstern → Identität → Stopp-Liste → Ziele
- Journal: Morgen (5 Schritte), Abend (4 Schritte), Freeform — alle mit optionalem KI-Feedback
- Ziele: Hierarchie three_year → year → quarterly → monthly → weekly, Tasks auf allen Ebenen
- Dashboard: Nordstern, Identitäts-Banner, heutiger Fokus, Tasks, Wochenziele, Heatmap, Streak
- Coach: 4 Modi, Vergangene Sessions, Nordstern als Kontext
- Review: Woche/Monat/Quartal/Jahr, KI-Zusammenfassung, Archiv
- Kalender: Tab existiert noch (wird in Paket 3A Schritt 7 entfernt)
- Einstellungen: Profil, Werte, Stopp-Liste, Ikigai, KI-Profil, Onboarding neu starten, Datenverwaltung

**Bekannte Probleme die in Paket 3 behoben werden:**
- Morgenjournal Schritt 4 (Zeitblöcke) gegen Vision — wird ersetzt
- Keine Abschluss-Seite nach Journal-Speichern
- Energie-Farbkodierung fehlt im Abendjournal
- Dankbarkeit fehlt im Abendjournal
- Tasks fehlen in Morgenjournal-Zusammenfassung
- Ziele nicht echten Daten zugeordnet
- Kein Periodenübergang-Flow
- Kein Habit-Tracker
- Keine Metriken-Visualisierung
- Kalender-Tab noch sichtbar

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
| `goal_tasks` | Abhakbare Tasks pro Ziel (alle Ebenen) |
| `recurring_blocks` | Wiederkehrende Kalender-Zeitblöcke (wird in 3A entfernt) |
| `recurring_block_exceptions` | Ausnahmen Serientermine (wird in 3A entfernt) |

Neue Tabellen kommen in Paket 3C: `habits`, `habit_logs`

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

## Ausstehend — Paket 3

**Nächste Session startet mit: Paket 3C, Schritt 14**
Bearbeitungsreihenfolge strikt einhalten. Immer nur einen Schritt. Erst testen, dann "weiter".

| Nr | Name | Paket | Status |
|----|------|-------|--------|
| 8 | Ziele: Datum-Logik dynamisch | 3B | ✅ 2026-04-07 |
| 9 | Ziele: Periodenübergang-Flow | 3B | ✅ 2026-04-07 |
| 10 | Ziele: Hierarchie visuell | 3B | ✅ 2026-04-07 |
| 11 | Ziele: Tasks nur auf Monat/Woche | 3B | ✅ 2026-04-07 |
| 12 | Coach: Ton-Auswahl | 3B | ✅ 2026-04-07 |
| 13 | Morgenjournal: Metriken-Felder | 3C | ✅ 2026-04-07 |
| 9 | Ziele: Periodenübergang-Flow | 3B | ⚠️ OFFEN |
| 10 | Ziele: Hierarchie visuell | 3B | ⚠️ OFFEN |
| 11 | Ziele: Tasks nur auf Monat/Woche | 3B | ⚠️ OFFEN |
| 12 | Coach: Ton-Auswahl | 3B | ⚠️ OFFEN |
| 13 | Morgenjournal: Metriken-Felder | 3C | ⛔ Nach 3B |
| 14 | Habit-Tracker: Datenbank & Grundstruktur | 3C | ⛔ Nach 3B |
| 15 | Habit-Tracker: Habits beim Monatsziel definieren | 3C | ⛔ Nach 3B |
| 16 | Habit-Tracker: Abendjournal-Integration | 3C | ⛔ Nach 3B |
| 17 | Metriken-Visualisierung im Ziele-Tab | 3D | ⛔ Nach 3C |
| 18 | Habit-Tracker: Monatsübersicht vollständig | 3D | ⛔ Nach 3C |
| 19 | Review-Seite aufwerten | 3D | ⛔ Nach 3C |
| 20 | Subtile Animationen | 3D | ⛔ Nach 3C |

Genaue Spezifikation zu jedem Schritt: siehe LIFE_OS_FEATURES.md

---

## Archiv

**Paket 1 — April 2026 ✅**
Bugs 1–6, Änderungen 7–11, Features 12–15. Build fehlerfrei, live deployed.

**Paket 2A — April 2026 ✅**
Fix 1–4, Feature 5–9 (Review-Archiv, Task-Kaskade, Kalender Woche/Monat, Custom-Wochentage, Task-Verknüpfung + Übertrag-Dialog).

**Paket 3A — April 2026 ✅**
Schritte 1–7: Morgenjournal (Zeitblock→Kalender-Check, Abschluss-Seite, Tasks max. 4), Abendjournal (Energie-Farben, Dankbarkeit, Abschluss-Seite), Kalender-Tab entfernt. Neue DB-Felder: `calendar_planned`, `gratitude`.

**Paket 3B (Schritte 8–9) — April 2026 ✅**
Schritt 8: Dynamische Datum-Logik. Neue Funktionen in `utils.ts`. Perioden-Label tab-abhängig. Wochenwechsel- + Monatswechsel-Banner.
Schritt 9: Periodenübergang-Modal in `Goals.tsx`. Zeigt beim ersten Tab-Öffnen nach Periodenende die abgelaufenen Ziele (Monat > Quartal > Woche). Entscheidung Ja/Teilweise/Nein + Navigation zu Review oder neuem Ziel. localStorage verhindert doppeltes Erscheinen.
Schritt 10: Hierarchie visuell. `GoalDetailCard.tsx` berechnet Kinder jetzt selbst via `treeGoals`-Prop. Expand-Standard auf 2 Ebenen. Fortschritt zeigt Durchschnitt der Unterziele. "Alle"-Tab in `Goals.tsx` rendert Baumstruktur mit Waisen-Fallback pro Ebene.
Schritt 11: Tasks nur bei `monthly`/`weekly`. Ausgeblendet bei höheren Ebenen.
Schritt 12: Coach Ton-Auswahl. Neuer `CoachTone`-Typ in `claude.ts` (sachlich/arschtritt/anerkennend). Ton-Selector in `Coach.tsx` über den Modi-Karten. Ton-Badge im Chat-Header. localStorage-Persistenz. Ton fließt als Parameter in System-Prompt.
Schritt 13: Morgenjournal Metriken. DB-Spalten `weight` + `sleep_score` migriert. Typen in `database.ts` ergänzt. Felder in `MorningStep1Feeling.tsx` unterhalb Textarea. Toggle "Morgenmetriken" in `Settings.tsx` (localStorage, Standard: AN). Felder werden gespeichert und beim Re-Open vorgeladen.
