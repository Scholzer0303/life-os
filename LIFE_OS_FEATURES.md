# LIFE_OS_FEATURES.md — Paket 2
# Detaillierte Spezifikationen für alle geplanten Schritte.
# Claude Code liest diese Datei beim Start automatisch.
# Nach Abschluss eines Schritts: Status auf ✅ UMGESETZT (Datum) setzen.

Zuletzt aktualisiert: 2026-04-05

---

## Struktur dieses Pakets

**Paket 2A — Fixes, kleine Features, mittlere Features**
Reihenfolge: erst alle kleinen Fixes (1–4), dann mittlere Features (5–8), dann Task-Verknüpfung (9).
Jeder Schritt einzeln — testen — weiter.

**Paket 2B — Habit Tracker**
Startet erst wenn Paket 2A vollständig abgeschlossen und im Produktivbetrieb erprobt.
Spezifikation steht bereits vollständig unten — nichts geht verloren.

---

## PAKET 2A

---

### Fix 1 — ⓘ-Symbol beim "Ich bin raus aus dem Rhythmus"-Link ✅ UMGESETZT (2026-04-05)
**Datei:** `src/pages/Dashboard.tsx`
**Aufwand:** Sehr klein

**Was gemacht wird:**
- Neben dem Text "Ich bin gerade raus aus dem Rhythmus" (ganz unten im Dashboard) ein ⓘ-Icon ergänzen (Lucide `Info`)
- Bei Hover (Desktop) / Tap (Mobile): Tooltip erscheint
- Tooltip-Text: "Wenn du hier tippst, öffnet sich ein kurzer geführter Flow der dir hilft wieder in deinen Rhythmus zu finden."
- Tooltip-Farbe: `color: 'var(--text-primary)'` — passt sich ans Theme an
- Gleiche Implementierung wie die bestehenden InfoTooltips in Settings.tsx

---

### Fix 2 — Fokus-Karte im Dashboard verschieben ✅ UMGESETZT (2026-04-05)
**Datei:** `src/pages/Dashboard.tsx`
**Aufwand:** Sehr klein

**Was gemacht wird:**
- Die Fokus-Karte (🎯 "Dein heutiger Fokus: …") wird aus ihrer aktuellen Position oben entfernt
- Neue Position: direkt oberhalb der "Heute zu erledigen"-Sektion
- Logik und Inhalt bleiben identisch — nur die Reihenfolge im JSX ändert sich

---

### Fix 3 — Tab-Reihenfolge anpassen ✅ UMGESETZT (2026-04-05)
**Datei:** `src/components/layout/Navigation.tsx`
**Aufwand:** Sehr klein

**Neue Reihenfolge:**
1. Dashboard
2. Journal
3. Kalender
4. Coach
5. Ziele
6. Review
7. Einstellungen

**Hinweis:** 7 Tabs können auf sehr kleinen Screens eng werden. Falls nötig: Icons etwas kleiner, Labels weglassen oder nur beim aktiven Tab anzeigen. Claude Code soll das optisch prüfen und bei Bedarf anpassen.

---

### Fix 4 — Supabase-Speicherinfo in Einstellungen ✅ UMGESETZT (2026-04-05)
**Datei:** `src/pages/Settings.tsx`
**Aufwand:** Klein

**Was gemacht wird:**
- Neue kleine Info-Sektion in den Einstellungen (ganz unten, vor Abmelden)
- Titel: "Datenspeicher"
- Inhalt: kurzer Erklärungstext: "Deine Daten werden in Supabase gespeichert. Der kostenlose Plan bietet 500 MB Datenbank-Speicher. Mit normaler Nutzung reicht das für mehrere Jahre."
- Direkter Link: "Speichernutzung im Supabase Dashboard prüfen →" → öffnet `https://supabase.com/dashboard/project/oqmowbctjzoiwtgpoqmo/settings/billing` in neuem Tab
- Kein API-Call nötig — nur statischer Text + Link

---

### Feature 5 — Review-Archiv ✅ UMGESETZT (2026-04-05)
**Datei:** `src/pages/Review.tsx`, `src/lib/db.ts`
**Aufwand:** Klein-Mittel

**Problem:** Reviews verschwinden nach Tab-Wechsel. Die Daten sind in `coach_sessions` gespeichert (trigger: weekly_review / monthly_review / quarterly_review / yearly_review) — aber es gibt keine Anzeige.

**Was gemacht wird:**
- Auf dem Review-Landing-Screen (Zeitraum-Auswahl) neuer Button "Vergangene Reviews" oben rechts (analog zum Coach-Archiv)
- Öffnet eine Liste aller gespeicherten Reviews aus `coach_sessions`, gefiltert nach Review-Triggern
- Sortiert nach Datum, neueste zuerst
- Jeder Eintrag zeigt: Zeitraum-Label (Wochenreview / Monatsreview etc.), Datum, erste 100 Zeichen der Zusammenfassung als Vorschau
- Tap öffnet vollständige Review-Zusammenfassung (read-only, mit Markdown-Rendering)
- Zurück-Button zum Landing-Screen

**DB:** Nur lesender Zugriff auf bestehende `coach_sessions` — keine Schema-Änderung nötig.
**Neue DB-Funktion:** `getReviewArchive(userId)` in `db.ts` — lädt alle Sessions mit Review-Triggern, sortiert nach created_at DESC.

---

### Feature 6 — Task-Kaskade für alle Ziel-Ebenen ✅ UMGESETZT (2026-04-05)
**Dateien:** `src/components/goals/GoalDetailCard.tsx`, `src/components/dashboard/GoalCard.tsx`, `src/pages/Goals.tsx`
**Aufwand:** Mittel

**Konzept:**
Die goal_tasks Logik existiert bereits für Wochenziele. Sie soll jetzt für ALLE Ziel-Ebenen gelten: Monatsziel, Quartalsziel, Jahresziel, 3-Jahres-Ziel.

**Was gemacht wird:**
- GoalDetailCard zeigt Tasks-Sektion für alle goal.type-Werte (nicht nur 'weekly')
- Fortschrittsberechnung aus Tasks gilt für alle Ebenen identisch
- Dashboard: Wenn ein Monatsziel oder Quartalsziel als "aktives Ziel" auf dem Dashboard erscheint, werden Tasks dort ebenfalls mit Checkboxen angezeigt (max. 3, "Alle anzeigen")
- Goals.tsx: Tasks laden und anzeigen für alle Ebenen, nicht nur weekly

**Was NICHT geändert wird:**
- Das Datenbankschema bleibt identisch — goal_tasks hat goal_id ohne Typ-Einschränkung, funktioniert bereits für alle Ebenen
- Nur die UI-Bedingungen (if goal.type === 'weekly') müssen entfernt/erweitert werden

---

### Feature 7 — Kalender: Wochen- und Monatsansicht ✅ UMGESETZT (2026-04-05)
**Datei:** `src/pages/Calendar.tsx`
**Aufwand:** Mittel

**Was gemacht wird:**
- Oben im Kalender-Tab: Ansichts-Umschalter `Tag | Woche | Monat`
- Tagesansicht: bereits vorhanden, bleibt wie sie ist
- Wochenansicht: 7-Spalten-Grid (Mo–So), jede Spalte zeigt die Zeitblöcke des Tages als kompakte farbige Balken. Tap auf einen Balken → öffnet den Block-Detail-Sheet.
- Monatsansicht: klassisches Kalender-Grid (5–6 Wochen), jeder Tag zeigt farbige Punkte für vorhandene Blöcke. Tap auf Tag → wechselt zur Tagesansicht für diesen Tag.
- Datum-Navigation (Pfeil links/rechts) passt sich an die Ansicht an: bei Woche springt es 7 Tage, bei Monat einen Monat.

---

### Feature 8 — Kalender: Spezifische Wochentage als Wiederholung ✅ UMGESETZT (2026-04-05)
**Dateien:** `src/pages/Calendar.tsx`, `src/components/calendar/BlockSheet.tsx`, `src/lib/db.ts`, `src/types/index.ts`
**Aufwand:** Mittel

**Problem:** Aktuell gibt es nur 'none' | 'daily' | 'weekdays' | 'weekly' als Wiederholungstypen. Das reicht nicht für individuelle Kombinationen wie Mo+Mi+Fr.

**Was gemacht wird:**

**Datenbank-Migration:**
```sql
ALTER TABLE recurring_blocks ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] DEFAULT NULL;
```
`recurrence_days` ist ein Array von Wochentagen: [1,3,5] = Mo, Mi, Fr (0=So, 1=Mo, ..., 6=Sa)

**Neuer recurrence_type:** `'custom'` — wird genutzt wenn recurrence_days gesetzt ist.
Bestehende Typen bleiben erhalten:
- `'none'` = einmalig
- `'daily'` = jeden Tag
- `'weekdays'` = Mo–Fr (Kurzform, kein recurrence_days nötig)
- `'weekly'` = wöchentlich gleicher Tag (nutzt recurrence_day wie bisher)
- `'custom'` = beliebige Kombination (nutzt recurrence_days Array)

**UI im BlockSheet:**
- Wiederholung-Auswahl: Nicht wiederholen / Täglich / Mo–Fr / Wöchentlich / Benutzerdefiniert
- Bei "Benutzerdefiniert": 7 Toggle-Buttons (Mo Di Mi Do Fr Sa So), beliebige Kombination wählbar, mindestens 1 Tag muss gewählt sein

**Auflösungslogik in Calendar.tsx:**
- `resolveBlocksForDate(date, blocks, exceptions)` muss `'custom'`-Typ berücksichtigen: Block erscheint wenn `recurrence_days.includes(date.getDay())`

---

### Feature 9 — Tages-Tasks ↔ Wochenziel-Tasks vollständig verknüpfen ⚠️ OFFEN
**Dateien:** `src/components/journal/MorningStep2Goal.tsx`, `src/components/journal/MorningJournal.tsx`, `src/components/journal/EveningJournal.tsx`, `src/pages/Dashboard.tsx`, `src/lib/db.ts`
**Aufwand:** Groß — eigene Session

**Voraussetzung:** Fix 1–4 und Feature 5–8 müssen stabil laufen.

**Teil 1 — Einheitliche Tasks (ein Datensatz, drei Ansichten):**

Aktuell gibt es zwei getrennte Task-Systeme:
- `daily_tasks` (JSONB in journal_entries) — Tages-Tasks aus dem Morgenjournal
- `goal_tasks` (eigene Tabelle) — Tasks die direkt am Ziel hängen

Diese sollen zusammengeführt werden: Wenn im Morgenjournal ein Task mit einem Wochenziel verknüpft wird, wird er als `goal_task` gespeichert (nicht als daily_task). Damit ist er automatisch sichtbar und abhakbar an drei Stellen:
1. Dashboard "Heute zu erledigen"
2. Abendjournal Schritt 1
3. Ziele-Tab unter dem verknüpften Wochenziel

Abhaken an einer Stelle aktualisiert alle anderen sofort (gleiche goal_task ID, gleicher Status).

Tasks ohne Ziel-Verknüpfung bleiben weiterhin als `daily_tasks` in journal_entries — sie erscheinen nur im Dashboard und Abendjournal, nicht im Ziele-Tab.

**Teil 2 — Übertrag-Dialog am nächsten Morgen:**

Beim ersten Öffnen des Morgenjournals an einem neuen Tag (nicht bei erneutem Öffnen am selben Tag — prüfen via `entry_date < heute`) erscheint vor Schritt 1 ein Dialog:

"Diese Aufgaben von gestern wurden nicht erledigt:"
[Liste der offenen Tasks von gestern]

Pro Task zwei Buttons:
- "Noch relevant → übernehmen" — Task bleibt im Wochenziel + wird in heutigen Tagesbereich übernommen
- "Nicht mehr relevant → löschen" — Task wird aus goal_tasks gelöscht (bewusste Entscheidung)

Dialog kann nicht übersprungen werden wenn offene gestrige Tasks vorhanden sind. Nach Entscheidung für alle Tasks: normaler Morgenjournal-Flow startet.

**Warum kein "Überspringen":** Die bewusste tägliche Entscheidung ist der Kern des Features — unbewusstes Aufstauen von Tasks wird verhindert.

---

## PAKET 2B — Habit Tracker

**⛔ NOCH NICHT STARTEN — erst wenn Paket 2A vollständig abgeschlossen und erprobt.**

---

### Feature 10 — Habit Tracker ⚠️ OFFEN (Paket 2B)
**Aufwand: Sehr Groß — eigene Planung + Session**

**Konzept:**
Monatliche Habits anlegen, täglich tracken, Daten visualisieren. Integriert in den bestehenden Ziele-Tab (kein neuer Tab). Körperdaten (Gewicht, Schlaf, Energie) fließen automatisch aus dem Journal.

**Wo anzeigen:**
- Ziele-Tab bekommt einen neuen Unter-Reiter: `3J | Jahr | Quartal | Monat | Woche | Habits`
- Habits sind monatlich — sie leben im Kontext des aktuellen Monats
- Oberhalb der Habit-Liste: aktueller Monat als Titel (z.B. "April 2026")

**Habits anlegen und verwalten:**
- Am Anfang jedes Monats (oder jederzeit): neue Habits anlegen
- Habit hat: Titel, optionale Beschreibung, Farbe
- Habits können während des Monats pausiert werden (nicht gelöscht) — bisherige Einträge bleiben erhalten
- Ein neuer Habit startet ab dem aktuellen Tag (kein rückwirkendes Tracking)
- Bestehende Habits können in den nächsten Monat übernommen werden (Dialog am Monatsanfang: "Diese Habits weiterführen?")

**Tägliches Tracking:**
- Habits werden täglich im Morgenjournal abgehakt (neuer optionaler Schritt "Habits heute" nach Schritt 1)
- Alternativ: direktes Abhaken im Ziele-Tab unter "Habits" für den heutigen Tag
- Abhaken speichert einen `habit_log`-Eintrag für dieses Datum

**Körperdaten-Tracking:**
Unterhalb der Habit-Liste: eigene Sektion "Körperdaten"
- Gewicht (kg) — Eingabe im Morgenjournal neuer optionaler Schritt
- Schlafscore (1–100, Oura-Ring-Format) — Eingabe im Morgenjournal
- Energie/Feeling (1–10) — kommt automatisch aus dem Abendjournal (bereits vorhanden als `energy_level`)
- Anzeige: Tabelle mit Tagen des Monats als Spalten, je Kennzahl eine Zeile — ähnlich einer Heatmap
- Durchschnittswert pro Kennzahl wird am Ende der Zeile angezeigt

**Monatsübersicht-Ansicht:**
Jeder Monat hat eine klare Ansicht mit:
- Aktive Habits + Streak/Erfüllungsrate
- Körperdaten-Tabelle
- Monatsziel (verknüpft aus Ziel-Hierarchie)
- Wochenziele des Monats (aufklappbar)

**Neue Supabase-Tabellen:**
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#863bff',
  month INT NOT NULL,        -- 1–12
  year INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  UNIQUE(habit_id, log_date)
);
```

`journal_entries` bekommt zwei neue Felder (Migration):
```sql
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sleep_score INT DEFAULT NULL;
```

**Abhängigkeiten:**
- Baut auf Feature 9 (Task-Verknüpfung) auf — Morgenjournal-Schritte müssen stabil sein bevor neue Schritte hinzukommen
- Separate Planungs-Session mit Lukas vor dem Start empfohlen

---

## Abgeschlossene Schritte dieses Pakets

*(wird von Claude Code nach jedem Schritt ergänzt)*
