# LIFE_OS_FEATURES.md — Paket 3
# Detaillierte Spezifikationen für alle geplanten Schritte.
# Claude Code liest diese Datei beim Session-Start automatisch.
# Nach Abschluss eines Schritts: Status auf ✅ UMGESETZT (Datum) setzen.
# Zuletzt aktualisiert: 2026-04-07

---

## Struktur dieses Pakets

**Paket 3A — Nutzerreise reparieren (Schritte 1–7)**
Reihenfolge strikt einhalten. Erst wenn alle 7 Schritte stabil: weiter mit 3B.

**Paket 3B — Ziele-System reparieren (Schritte 8–12)**
Startet erst wenn Paket 3A vollständig abgeschlossen und erprobt.

**Paket 3C — Metriken & Habit-Tracker Fundament (Schritte 13–16)**
Startet erst wenn Paket 3B stabil läuft.

**Paket 3D — Visualisierung (Schritte 17–20)**
Startet erst wenn Paket 3C stabil läuft.

---

## PAKET 3A — Nutzerreise reparieren

---

### Schritt 1 — Morgenjournal: Zeitblock-Schritt ersetzen ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/MorningJournal.tsx`
**Aufwand:** Klein

**Problem:** Schritt 4 "Wie sieht dein Tag aus?" mit Zeitblock-Eingabe widerspricht der Vision.
Lukas plant im Google Kalender — nicht in der App.

**Was gemacht wird:**
- Schritt 4 Inhalt komplett ersetzen
- Neuer Inhalt: einfache Ja/Nein-Frage "Hast du deinen Tag im Kalender geplant?"
- Zwei große Toggle-Buttons: ✅ "Ja, bin vorbereitet" / ⏳ "Mache ich gleich"
- Kein Freitextfeld, keine Zeitblöcke, keine Block-Eingabe
- Antwort wird gespeichert (neues Boolean-Feld `calendar_planned` in journal_entries)
- Schritt bleibt überspringbar

**Datenbank-Migration:**
```sql
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS calendar_planned BOOLEAN DEFAULT NULL;
```

**Was NICHT geändert wird:** Schritte 1, 2, 3, 5 identisch.

---

### Schritt 2 — Morgenjournal: Zusammenfassung aufwerten ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/MorningJournal.tsx` (Schritt 5)
**Aufwand:** Klein

**Problem:** Tasks fehlen in der Zusammenfassung. Nach Speichern kein Abschluss-Gefühl.

**Was gemacht wird:**
- Tasks-Sektion in Schritt 5 ergänzen (Liste aller eingetragenen Tagesaufgaben)
- Nach "Journal speichern ✓": Abschluss-Seite statt direktem Dashboard-Sprung:
  ```
  ✅ Guter Start.
  Du weißt was heute zählt. Starte den Tag.
  ```
- Optionaler Button "Mentor-Impuls holen" → lädt KI-Satz (max. 2 Sätze, sachlicher Ton)
- Button "→ Zum Dashboard"

**Was NICHT geändert wird:** Speicher-Logik identisch, andere Schritte unberührt.

---

### Schritt 3 — Abendjournal: Energie-Farbkodierung ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/EveningJournal.tsx` (Schritt 3)
**Aufwand:** Sehr klein

**Was gemacht wird:**
- Zahlen 1–4: roter Hintergrund beim Antippen/Hover
- Zahlen 5–7: gelber/orangener Hintergrund
- Zahlen 8–10: grüner Hintergrund
- Farbe bleibt nach Auswahl sichtbar als Bestätigung

**Was NICHT geändert wird:** Speicher-Logik identisch.

---

### Schritt 4 — Abendjournal: Dankbarkeit ergänzen ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/EveningJournal.tsx` (Schritt 4)
**Aufwand:** Sehr klein

**Was gemacht wird:**
- Unterhalb des bestehenden Freitextfeldes in Schritt 4:
  ```
  🙏 WOFÜR BIN ICH HEUTE DANKBAR? (optional)
  [Placeholder: "Mindestens eine Sache..."]
  ```
- Speichern in journal_entries (neues Feld `gratitude`)

**Datenbank-Migration:**
```sql
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS gratitude TEXT DEFAULT NULL;
```

---

### Schritt 5 — Abendjournal: Abschluss-Seite ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/EveningJournal.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
Nach erfolgreichem Speichern: Abschluss-Screen:
```
🌙 Tag abgeschlossen.
Energie heute: [Zahl in Farbe]
Aufgaben erledigt: X von Y
Kopf ist frei.

[Button: "Mentor-Feedback holen" → optionaler KI-Satz]
[Button: "→ Zum Dashboard"]
```

---

### Schritt 6 — Morgenjournal: Tasks auf max. 4 begrenzen ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/MorningJournal.tsx`
**Aufwand:** Sehr klein

**Was gemacht wird:**
- Maximum 5 → 4
- Label: "WICHTIGSTE AUFGABEN HEUTE (optional, max. 4)"
- "+ Aufgabe hinzufügen" verschwindet bei 4 eingetragenen Tasks

---

### Schritt 7 — Kalender-Tab entfernen ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/layout/Navigation.tsx`, Router
**Aufwand:** Klein

**Was gemacht wird:**
- Kalender-Tab aus Navigation entfernen
- Kalender-Route deaktivieren (Code bleibt erhalten, nur nicht erreichbar)
- Alle Links zum Kalender im Code entfernen
- Navigation: 6 Tabs — Dashboard | Journal | Coach | Ziele | Review | Einstellungen

**Was NICHT geändert wird:** Kalender-Komponenten bleiben im Code (können reaktiviert werden).

---

## PAKET 3B — Ziele-System reparieren

**⛔ ERST STARTEN wenn Paket 3A vollständig abgeschlossen und 2–3 Tage erprobt.**

---

### Schritt 8 — Ziele: Datum-Logik dynamisch ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/pages/Goals.tsx`, `src/lib/utils.ts`
**Aufwand:** Mittel

**Was gemacht wird:**
Neue Hilfsfunktionen in utils.ts:
```typescript
getCurrentWeekLabel()    // → "KW 15 · 7.–13. April 2026"
getCurrentMonthLabel()   // → "April 2026"
getCurrentQuarterLabel() // → "Q2 2026 · Apr–Jun"
getCurrentYearLabel()    // → "2026"
```
- Alle statischen Perioden-Strings im Ziele-Tab durch diese Funktionen ersetzen
- Banner bei Wochenwechsel (Montag): "Neue Woche — KW 16 startet. Wochenziel setzen →"
- Banner bei Monatswechsel: "April endet — Monatsreview ausstehend →"

---

### Schritt 9 — Ziele: Periodenübergang-Flow ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/pages/Goals.tsx`
**Aufwand:** Mittel

**Was gemacht wird:**
Beim ersten Öffnen des Ziele-Tabs nach Periodenende: Modal:
```
📅 KW 15 ist vorbei.
Wochenziel war: "App richtig aufsetzen"
Erreicht? [Ja ✓] [Teilweise ~] [Nein ✗]
→ Zum Wochenreview     → Neue Woche planen
```
- Gilt analog für Monat, Quartal, Jahr
- Modal erfordert eine Entscheidung — nicht dauerhaft überspringbar

---

### Schritt 10 — Ziele: Hierarchie visuell ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/pages/Goals.tsx`, `src/components/goals/GoalDetailCard.tsx`
**Aufwand:** Mittel

**Was gemacht wird:**
- Im "Alle"-Filter: Unterziele eingerückt unter Elternziel (16px + Verbindungslinie)
- Aufklapp-Pfeil pro Ziel (▶/▼)
- Standard: oberste 2 Ebenen aufgeklappt
- Fortschritt des Elternziels = Durchschnitt der Unterziele

---

### Schritt 11 — Ziele: Tasks nur auf sinnvollen Ebenen ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/goals/GoalDetailCard.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
- Tasks-Sektion nur bei goal.type = 'monthly' | 'weekly'
- Bei 'three_year', 'year', 'quarterly': Tasks-Sektion ausblenden
- "Als erledigt markieren" nur bei Monat + Woche — nicht bei höheren Ebenen

---

### Schritt 12 — Coach: Ton-Auswahl ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/pages/Coach.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
Oberhalb der 4 Modi-Karten: Ton-Auswahl:
```
Wie soll ich heute mit dir reden?
[💡 Sachlich]  [🔥 Arschtritt]  [🙌 Anerkennend]
```
- Standard: Sachlich vorausgewählt
- Ton wird als System-Prompt-Parameter übergeben
- Auswahl wird in localStorage für aktuelle Session gespeichert

---

## PAKET 3C — Metriken & Habit-Tracker Fundament

**⛔ ERST STARTEN wenn Paket 3B vollständig abgeschlossen und erprobt.**

---

### Schritt 13 — Morgenjournal: Metriken-Felder ✅ UMGESETZT (2026-04-07)

**Betroffene Dateien:** `src/components/journal/MorningJournal.tsx`, `src/pages/Settings.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
In Schritt 1, unterhalb des Gefühl-Selektors — neue optionale Sektion:
```
HEUTIGE METRIKEN (optional)
⚖️ Gewicht: [___] kg
😴 Schlafscore: [___] /100
```
- Felder erscheinen nur wenn in Einstellungen aktiviert (Toggle "Morgenmetriken" — Standard: AN)
- Speichern in journal_entries (weight + sleep_score)

**Datenbank-Migration (falls noch nicht vorhanden):**
```sql
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sleep_score INT DEFAULT NULL;
```

---

### Schritt 14 — Habit-Tracker: Datenbank & Grundstruktur ⚠️ OFFEN

**Betroffene Dateien:** `src/lib/db.ts`, `src/types/index.ts`, Supabase
**Aufwand:** Mittel

**Datenbank-Migration:**
```sql
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#863bff',
  month INT NOT NULL,
  year INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  UNIQUE(habit_id, log_date)
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_own" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_own" ON habit_logs FOR ALL USING (auth.uid() = user_id);
```

**Neue DB-Funktionen in db.ts:**
```typescript
getHabitsForMonth(userId, month, year)
createHabit(userId, habitData)
updateHabit(habitId, updates)
deleteHabit(habitId)
logHabit(habitId, userId, date, completed)   // upsert
getHabitLogs(userId, month, year)
```

Kein UI in diesem Schritt — nur Datenbank + Funktionen + Types.

---

### Schritt 15 — Habit-Tracker: Habits beim Monatsziel definieren ⚠️ OFFEN

**Betroffene Dateien:** `src/components/goals/GoalDetailCard.tsx`
**Aufwand:** Mittel

**Was gemacht wird:**
Beim Monatsziel (goal.type === 'monthly') neue Sektion unterhalb Tasks:
```
HABITS DIESEN MONAT
● Sport (grün)         [✏️] [🗑️]
● Kein Alkohol (blau)  [✏️] [🗑️]
[+ Habit hinzufügen]
```

Habit hinzufügen/bearbeiten → kleines Modal: Titel, Beschreibung (optional), Farbe (6 Optionen)

**Monatsübergang-Dialog** (wenn neues Monatsziel erstellt wird und Vormonat Habits hatte):
```
Habits aus März weiterführen?
☑ Sport   ☑ Kein Alkohol   ☐ Lesen
[Ausgewählte übernehmen]
```

**Was NICHT geändert wird:** Nur 'monthly' Goals bekommen diese Sektion.

---

### Schritt 16 — Habit-Tracker: Abendjournal-Integration ⚠️ OFFEN

**Betroffene Dateien:** `src/components/journal/EveningJournal.tsx`
**Aufwand:** Mittel

**Was gemacht wird:**
Neuer optionaler Schritt zwischen Schritt 1 und 2 im Abendjournal:
```
DEINE HABITS HEUTE (April 2026)
☐ Sport
☐ Kein Alkohol
☑ Lesen
[Weiter →]  [Überspringen →]
```
- Erscheint nur wenn Habits für aktuellen Monat definiert sind
- Abhaken speichert habit_log Einträge (upsert für heute)
- Bereits abgehakte Habits des Tages vorausgefüllt

---

## PAKET 3D — Visualisierung

**⛔ ERST STARTEN wenn Paket 3C vollständig abgeschlossen und erprobt.**

---

### Schritt 17 — Metriken-Visualisierung im Ziele-Tab Monatsansicht ⚠️ OFFEN

**Betroffene Dateien:** `src/pages/Goals.tsx`
**Aufwand:** Groß

**Was gemacht wird:**
Im Ziele-Tab Monatsansicht, unterhalb Habit-Liste: Sektion "KÖRPERDATEN & METRIKEN"

Monatstabelle:
```
            1   2   3   4   5  ...  30   Ø
Gewicht     —   —  82   —  82  ...  81  81.7
Schlaf      —   —  74  78   —  ...  79  77.2
Energie     7   —   8   6   9  ...   7   7.4
```
- Energie farbkodiert (rot/gelb/grün)
- Leere Felder = grau
- Horizontal scrollbar auf Mobile
- Durchschnitt am Ende jeder Zeile

---

### Schritt 18 — Habit-Tracker: Monatsübersicht vollständig ⚠️ OFFEN

**Betroffene Dateien:** `src/pages/Goals.tsx`
**Aufwand:** Groß

**Was gemacht wird:**
Vollständige Monatsansicht im Ziele-Tab:
```
APRIL 2026
Monatsziel: "Klarheit schaffen"  Fortschritt: ████░░ 60%

HABITS
● Sport         ████████░░░░░░░░░░  8/30  27%
● Kein Alkohol  ██████████████████ 30/30 100% 🔥
● Lesen         █████████░░░░░░░░░ 16/30  53%

KÖRPERDATEN & METRIKEN
[Tabelle aus Schritt 17]

WOCHENZIELE DIESES MONATS
▶ KW 14: "Grundstruktur" ✅
▶ KW 15: "App richtig aufsetzen" (laufend)
▶ KW 16: (noch nicht definiert)
```

---

### Schritt 19 — Review-Seite aufwerten ⚠️ OFFEN

**Betroffene Dateien:** `src/pages/Review.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
Unterhalb der Zeitraum-Auswahl:
```
Letzter Wochenreview: vor 7 Tagen (KW 14)
Analysierte Einträge: 6 Journal-Einträge, 3 erledigte Tasks
```
- Dynamisch geladen aus coach_sessions + journal_entries
- Wenn noch kein Review: "Noch kein Review — starte jetzt deinen ersten"

---

### Schritt 20 — Subtile Animationen ⚠️ OFFEN

**Betroffene Dateien:** Diverse
**Aufwand:** Mittel

**Was gemacht wird:**
Gezielte Animationen — max. 300ms, nie blockierend:
- Streak-Badge: kurzes Pulsieren wenn erhöht
- Journal speichern: Checkmark-Animation
- Ziel abhaken: Fade-out + Strikethrough
- Habit abhaken: kurze Bestätigungs-Animation
- Seitenübergänge: sanftes Slide-in (Framer Motion bereits vorhanden)

---

## Abgeschlossene Pakete (Archiv)

**Paket 1 + 2A — April 2026 ✅**
Alle Bugs, Fixes und Features aus Paket 1 und 2A abgeschlossen. Details in LIFE_OS_KONTEXT.md.
