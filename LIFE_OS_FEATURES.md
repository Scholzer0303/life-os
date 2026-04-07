# LIFE_OS_FEATURES.md — Paket 4
# Journal als Herzstück — kompletter struktureller Umbau
# Claude Code liest diese Datei beim Session-Start automatisch.
# Nach Abschluss eines Schritts: Status auf ✅ UMGESETZT (Datum) setzen.
# Zuletzt aktualisiert: 2026-04-07

---

## ÜBERBLICK PAKET 4

Paket 4 ist der größte Umbau bisher. Ziel: Das Journal wird zum Herzstück der App.
Ziele und Habits wandern ins Journal. Review-Tab fällt weg. Neuer Übersichts-Tab entsteht.

**Reihenfolge ist kritisch. Niemals zwei Schritte gleichzeitig.**
**Bestehende Daten und funktionierende Features werden NICHT gelöscht — nur umgebaut.**

### Pakete
- **4A — Fundament** (Schritte 1–3): Navigation + DB-Migration + leeres Journal-Gerüst
- **4B — Journal Tag** (Schritte 4–5): Morgen + Abend in neuer Struktur
- **4C — Journal Woche/Monat** (Schritte 6–8): Planung/Reflexion + Ziele + Habits
- **4D — Journal Quartal/Jahr** (Schritte 9–10): Große Ebenen + Nordstern
- **4E — Übersicht** (Schritte 11–13): Kalender + Habit-Grid + Metriken
- **4F — Aufräumen** (Schritte 14–15): Ziele-Tab auflösen, Review-Tab auflösen, Profil fixen

---

## PAKET 4A — Fundament

---

### Schritt 1 — Navigation umbau + neue Seiten anlegen ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/components/layout/Navigation.tsx`, `src/App.tsx` (Router), neue Seiten
**Aufwand:** Klein

**Was gemacht wird:**
Neue Navigation: **Dashboard · Journal · Coach · Übersicht · Einstellungen**

- `src/pages/Journal.tsx` — NEU, vorerst nur leere Seite mit Tab-Leiste (Tag/Woche/Monat/Quartal/Jahr)
- `src/pages/Overview.tsx` — NEU, vorerst nur leere Seite mit Platzhalter-Text
- `Goals.tsx` Route bleibt erhalten aber ist nicht mehr in Navigation (nur noch via direktem URL erreichbar — Fallback)
- `Review.tsx` Route bleibt erhalten aber ist nicht mehr in Navigation

**Was NICHT geändert wird:** Inhalte von Goals.tsx und Review.tsx bleiben unberührt.

---

### Schritt 2 — Datenbank: journal_periods Tabelle ✅ UMGESETZT (2026-04-08)

**Aufwand:** Klein (nur SQL + Types + DB-Funktionen, kein UI)

**SQL-Migration:**
```sql
CREATE TABLE IF NOT EXISTS journal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  period_key TEXT NOT NULL,
  -- Beispiele für period_key: '2026-W15', '2026-04', '2026-Q2', '2026'
  planning_data JSONB DEFAULT '{}',
  reflection_data JSONB DEFAULT '{}',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_key)
);

ALTER TABLE journal_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_periods_own" ON journal_periods FOR ALL USING (auth.uid() = user_id);
```

**Neue DB-Funktionen in db.ts:**
```typescript
getJournalPeriod(userId, periodType, periodKey)   // → JournalPeriod | null
upsertJournalPeriod(userId, periodType, periodKey, data)
deleteJournalPeriod(id)
listJournalPeriods(userId, periodType)            // für Archiv-Abruf
```

**Neue Types in types/index.ts:**
```typescript
interface JournalPeriod {
  id: string;
  user_id: string;
  period_type: 'week' | 'month' | 'quarter' | 'year';
  period_key: string;
  planning_data: Record<string, unknown>;
  reflection_data: Record<string, unknown>;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
}
```

Kein UI in diesem Schritt.

---

### Schritt 3 — Datenbank: habits Tabelle um frequency erweitern ✅ UMGESETZT (2026-04-08)

**Aufwand:** Sehr klein (SQL-Migration + Type-Update)

Die habits-Tabelle aus Paket 3C muss um Frequenz-Felder erweitert werden:

**SQL-Migration:**
```sql
ALTER TABLE habits ADD COLUMN IF NOT EXISTS frequency_type TEXT NOT NULL DEFAULT 'daily' 
  CHECK (frequency_type IN ('daily', 'weekly'));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS frequency_value INT NOT NULL DEFAULT 1;
-- frequency_value: bei 'daily' irrelevant (immer 1), bei 'weekly' = Anzahl pro Woche (1–7)
```

Kein UI in diesem Schritt.

---

## PAKET 4B — Journal Tag

---

### Schritt 4 — Journal Tag: Morgen-Eintrag in neuer Struktur ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Journal.tsx`, `src/components/journal/JournalDay.tsx` (NEU)
**Aufwand:** Mittel

**Was gemacht wird:**
- `Journal.tsx` zeigt Tab-Leiste, bei "Tag" wird `JournalDay.tsx` geladen
- `JournalDay.tsx` hat zwei Sub-Tabs: **Morgen** und **Abend**
- Morgen-Inhalt: exakt wie der bestehende `MorningJournal.tsx` — Inhalt übernehmen, nicht neu erfinden
  - Energie (1–10), Gewicht, Schlaf (optional, aus Einstellungen)
  - 0–4 Tagesaufgaben
  - Kalender-Check (Ja/Nein)
  - Abschluss-Seite mit optionalem KI-Impuls
- Navigation: ← zurück / vor → (zwischen Tagen wechseln, wie in Mentor)
- Datum-Header: "Dienstag, 7. April · 2026 · KW 15"

**Was NICHT geändert wird:** `MorningJournal.tsx` bleibt erhalten (wird später entfernt wenn alles stabil).

---

### Schritt 5 — Journal Tag: Abend-Eintrag in neuer Struktur ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/components/journal/JournalDay.tsx`
**Aufwand:** Mittel

**Was gemacht wird:**
Abend-Inhalt in `JournalDay.tsx`:
- Tagesreflexion: Was lief gut / Was lief nicht gut / Freie Gedanken / Dankbarkeit
- Habits abhaken (alle aktiven Habits des aktuellen Monats, mit Frequenz-Status)
  - Täglich: erscheint immer
  - X/Woche: zeigt "X von Y diese Woche" — immer abhakbar
- Nicht-Verhandelbar-Sektion (falls vorhanden — aus Profil)
- Energie Abend (1–10, farbkodiert rot/gelb/grün)
- Abschluss-Screen: Energie in Farbe, erledigte Tasks X/Y, "Kopf ist frei."
- Optionaler KI-Satz

---

## PAKET 4C — Journal Woche/Monat

---

### Schritt 6 — Journal Woche: Planung + Reflexion ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Journal.tsx`, `src/components/journal/JournalWeek.tsx` (NEU)
**Aufwand:** Mittel

**Was gemacht wird:**
`JournalWeek.tsx` mit zwei Sub-Tabs: **Planung** und **Reflexion**

Navigation: KW 15 · 6.–12. April 2026 ← →

**Planung:**
- Identitätssatz: "Diese Woche bin ich der Lukas der..." (Freitext)
- Wochenziele (frei erstellbar, beliebig viele)
- Speichern in `journal_periods` (period_type: 'week', period_key: '2026-W15')

**Reflexion:**
- Wochenziele — Status (automatisch geladen aus Planung)
- Was lief gut? / Was lief nicht gut? / Eine Erkenntnis — Was ändere ich konkret?
- Memorable Moments dieser Woche (optional)
- KI-Zusammenfassung Button → generiert + speichert in `ai_summary`
- Speichern in `journal_periods`

Banner wenn neue Woche beginnt: "KW 16 startet — Planung ausstehend →"

---

### Schritt 7 — Journal Monat: Planung mit Zielen + Habits ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Journal.tsx`, `src/components/journal/JournalMonth.tsx` (NEU)
**Aufwand:** Groß

**Was gemacht wird:**
`JournalMonth.tsx` mit zwei Sub-Tabs: **Planung** und **Reflexion**

Navigation: April 2026 ← →

**Planung:**
- Monatsthema: "Wofür steht dieser Monat?" (Freitext)
- Monatsziele (frei erstellbar, beliebig viele — kein Kategorie-Zwang)
- Habit-Sektion:
  - Liste aller aktiven Habits mit farbigem Punkt, Edit, Löschen
  - "+ Habit hinzufügen" → Modal:
    - Titel (Pflicht)
    - Beschreibung (optional)
    - Frequenz: Toggle "Täglich" / "X mal pro Woche" + Zahlen-Input (1–7)
    - Farbe (6 Optionen)
    - Hinweistext (eingeblendet, nicht zwingend): "Tipp: 2–5 Habits pro Monat sind realistisch. Qualität vor Quantität."
  - Monatsübergang-Dialog: "Habits aus [Vormonat] übernehmen?" mit Checkbox-Auswahl
- Speichern in `journal_periods` (period_type: 'month', period_key: '2026-04')
  Ziele separat in `goals`-Tabelle (type: 'monthly')

**Reflexion:**
- Monatsziele — Status
- Was lief gut? / Was lief nicht gut? / Learnings
- KI-Zusammenfassung Button
- Speichern in `journal_periods`

---

### Schritt 8 — Habit-Tracking: Frequenz-Logik + Wochenfortschritt ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/components/journal/JournalDay.tsx`, `src/lib/db.ts`
**Aufwand:** Mittel

**Was gemacht wird:**
Für Habits mit `frequency_type: 'weekly'`:
- Im Abend-Eintrag: neben dem Habit-Namen erscheint "X von Y diese Woche" (z.B. "2 von 4")
- Sobald Y erreicht: Habit-Zeile grün markiert, aber weiterhin abhakbar
- `getHabitWeekProgress(userId, habitId, weekStart, weekEnd)` — neue DB-Funktion

Für `frequency_type: 'daily'`:
- Keine Änderung — täglich abhaken wie bisher

Monatsfortschritt:
- Täglich: erledigte Tage / Monatstage
- Wöchentlich: erledigte Wochen / (Monatstage / 7 gerundet) × frequency_value

---

## PAKET 4D — Journal Quartal/Jahr

---

### Schritt 9 — Journal Quartal: Planung + Reflexion ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/components/journal/JournalQuarter.tsx` (NEU)
**Aufwand:** Klein-Mittel

**Was gemacht wird:**
`JournalQuarter.tsx` — analog zu JournalWeek, aber für Quartal.

Navigation: Q2 2026 · Apr–Jun ← →

**Planung:**
- Quartalsziel (frei, ein Hauptziel + optionale Unterziele)
- Speichern in `journal_periods` (period_key: '2026-Q2') + `goals` (type: 'quarterly')

**Reflexion:**
- Quartalsziel — Status
- Was lief gut / schlecht / Learnings
- KI-Zusammenfassung

---

### Schritt 10 — Journal Jahr: Planung + Reflexion + Nordstern ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/components/journal/JournalYear.tsx` (NEU)
**Aufwand:** Klein-Mittel

**Was gemacht wird:**
`JournalYear.tsx`

Navigation: 2026 ← →

**Planung:**
- Nordstern anzeigen (readonly, aus Profil — mit Link zu Einstellungen → Profil bearbeiten)
- Jahresziel (frei)
- "Was will ich 2026 erreicht haben?" (Freitext)
- Speichern in `journal_periods` (period_key: '2026') + `goals` (type: 'year')

**Reflexion:**
- Jahresziel — Status
- Was war das Prägendste / Was ändere ich / Learnings
- KI-Zusammenfassung

---

## PAKET 4E — Übersicht

---

### Schritt 11 — Übersicht: Kalender-Monatsansicht ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Overview.tsx`, `src/components/overview/OverviewCalendar.tsx` (NEU)
**Aufwand:** Mittel

**Was gemacht wird:**
Kalender-Monatsansicht (Mo–So-Raster) für den aktuellen Monat.
Navigation: ← April 2026 → + "Heute"-Button

Pro Tag im Kalender:
- Kleiner farbiger Punkt wenn Morgen-Eintrag vorhanden
- Kleiner farbiger Punkt wenn Abend-Eintrag vorhanden
- Klick auf Tag → öffnet Journal → Tag mit diesem Datum

Darunter: Monatsstatistiken-Kacheln:
- NV-Quote (%) · Habit-Rate (%) · Ø Energie · Ø Schlaf (h) · Ø Gewicht (kg)

---

### Schritt 12 — Übersicht: Habit-Grid ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Overview.tsx`, `src/components/overview/HabitGrid.tsx` (NEU)
**Aufwand:** Mittel

**Was gemacht wird:**
Habit-Grid wie in Mentor: Alle Habits des Monats × alle Tage als Tabelle.

```
                1   2   3  ...  30   Rate
Sport (4x/W)    .   .   ✓  ...   .   27%
Schlafen <23h   ✓   .   ✓  ...   ✓   80%
```

- ✓ = erledigt (grün), × = nicht erledigt (heute oder vergangene Tage, rot/grau), . = Zukunft
- Rechts: individuelle Completion-Rate pro Habit
- Oben rechts: "KW: X% · Monat: Y%"
- Horizontal scrollbar auf Mobile

---

### Schritt 13 — Übersicht: Metriken-Visualisierung ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Overview.tsx`, `src/components/overview/MetricChart.tsx` (NEU)
**Aufwand:** Mittel

**Was gemacht wird:**
Drei Kurven-Charts unterhalb des Habit-Grids:
- Energielevel (1–10) über den Monat — orange/rote Punkte
- Gewicht (kg) über den Monat — blaue Punkte
- Schlafscore (0–100) über den Monat — grüne Punkte

Jeder Chart: Durchschnittswert rechts oben angezeigt.
Leere Tage = kein Punkt (nicht null).
Bibliothek: Recharts (bereits im Projekt vorhanden).

---

## PAKET 4F — Aufräumen

---

### Schritt 14 — Ziele-Tab auflösen ⚠️ OFFEN

**Betroffene Dateien:** Navigation (bereits in Schritt 1 entfernt), `src/pages/Goals.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
- Goals.tsx bleibt im Code aber ist nicht mehr navigierbar
- Alle Ziele-Daten (goals-Tabelle) werden weiterhin von Journal-Komponenten genutzt
- Sicherstellen dass JournalMonth/Quarter/Year korrekt in die goals-Tabelle schreiben und lesen
- Test: Bestehendes Monatsziel aus Goals.tsx muss in JournalMonth sichtbar sein

---

### Schritt 15 — Review-Tab auflösen + Profil reparieren ⚠️ OFFEN

**Betroffene Dateien:** `src/pages/Review.tsx`, `src/pages/Settings.tsx`
**Aufwand:** Klein-Mittel

**Was gemacht wird:**

Review-Tab:
- Review.tsx bleibt im Code aber ist nicht mehr navigierbar
- Bestehende coach_sessions (Reviews) sind über Journal-Reflexions-Seiten abrufbar
  (z.B. Woche → Reflexion zeigt vergangene KI-Zusammenfassungen dieser Woche)

Profil reparieren:
- "Onboarding neu starten" löscht KEINE bestehenden Einträge mehr
  (nur Profil-Felder: Nordstern, Werte, Ikigai, Identität werden zurückgesetzt — Journal-Daten bleiben)
- Neue Sektion in Settings: "Mein Profil" mit einzeln bearbeitbaren Bereichen:
  - Nordstern bearbeiten
  - Identität bearbeiten
  - Werte bearbeiten
  - Ikigai bearbeiten
  - Stopp-Liste bearbeiten
  - Nicht-Verhandelbare bearbeiten
- Jeder Bereich ist direkt editierbar ohne Onboarding-Flow neu zu starten
- Bezeichnung "Onboarding" verschwindet aus der UI

---

## Abgeschlossene Pakete (Archiv)

**Paket 1 + 2A + 3A + 3B + 3C (Schritte 1–13) — April 2026 ✅**
Details in LIFE_OS_KONTEXT.md Archiv-Sektion.
