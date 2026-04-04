# LIFE_OS_FEATURES.md — Detaillierte Feature-Spezifikationen
# Diese Datei beschreibt alle geplanten Änderungen und Features im Detail.
# Claude Code liest sie beim Start automatisch zusammen mit CLAUDE.md und LIFE_OS_KONTEXT.md.
# NICHT löschen — wird nach jeder umgesetzten Funktion aktualisiert.

Zuletzt aktualisiert: 2026-04-04

---

## Wie diese Datei zu verwenden ist

- LIFE_OS_KONTEXT.md = Logbuch (was ist fertig, was ist offen)
- LIFE_OS_FEATURES.md = Spezifikation (wie genau soll es aussehen und funktionieren)
- Vor dem Umsetzen eines Features: beide Dateien lesen
- Nach dem Umsetzen: Status in LIFE_OS_KONTEXT.md auf ✅ setzen, hier den Abschnitt als "Umgesetzt" markieren

---

## 🐛 BUGS (1–6)

### Bug 1 — Onboarding-Fortschritt bei Tab-Wechsel ✅ UMGESETZT (2026-04-04)
**Datei:** `src/pages/Onboarding.tsx`
**Symptom:** Tab wechseln (ohne Reload) setzt Onboarding auf Schritt 1 zurück.
**Ursache:** useState für den aktuellen Schritt wird beim Unmount/Remount zurückgesetzt. localStorage-Fix soll laut altem Kontext existieren — tut es aber nicht korrekt.
**Gewünschtes Verhalten:**
- Beim Mount: aktuellen Schritt aus `localStorage.getItem('onboarding_step')` lesen
- Bei jeder Schrittänderung: `localStorage.setItem('onboarding_step', currentStep)` aufrufen
- Nach erfolgreichem Abschluss des Onboardings: `localStorage.removeItem('onboarding_step')` aufrufen

---

### Bug 2 — Markdown wird als Rohtext angezeigt ✅ UMGESETZT (2026-04-04)
**Betrifft:** Onboarding Schritt 5 (Nordstern-Zusammenfassung), Coach-Chat
**Symptom:** KI-Antworten zeigen `##`, `**fett**`, `- Liste` als Rohtext statt als formatiertes HTML.
**Fix:** `react-markdown` installieren und für alle KI-Ausgaben verwenden.
```bash
npm install react-markdown --legacy-peer-deps
```
**Stellen wo react-markdown eingebaut werden muss:**
- Onboarding Step5: KI-Zusammenfassung des Nordsterns
- Coach.tsx: alle Nachrichten mit `role: 'assistant'`
- AIFeedbackCard.tsx: das KI-Feedback nach dem Journal

---

### Bug 3 — Coach-Session bei Tab-Wechsel verloren ✅ UMGESETZT (2026-04-04)
**Datei:** `src/pages/Coach.tsx`
**Symptom:** Nach Tab-Wechsel ist die Unterhaltung weg, zurück zur Kategorie-Auswahl.
**Fix:** Session-State (Nachrichten + gewählter Modus) in localStorage persistieren.
- Key: `coach_session_messages` und `coach_session_mode`
- Beim Mount: aus localStorage laden falls vorhanden
- Bei "Neue Session"-Button: localStorage leeren
- Beim Abmelden: localStorage leeren

---

### Bug 4 — Grammatikfehler Morgenjournal ✅ UMGESETZT (2026-04-04)
**Datei:** `src/components/journal/MorningStep2Goal.tsx` (oder ähnlicher Name)
**Symptom:** Text lautet "Was ist dein einen Ziel für heute?"
**Fix:** Ändern zu "Was ist dein Ziel für heute?"
**Aufwand:** Winzig — eine Zeile.

---

### Bug 5 — Morgenjournal zeigt leeres Formular ✅ UMGESETZT (2026-04-04)
**Datei:** `src/components/journal/MorningJournal.tsx`
**Symptom:** Wenn heute bereits ein Morgen-Journal-Eintrag vorhanden ist und man das Journal erneut öffnet, ist das Formular leer.
**Gewünschtes Verhalten:**
- Beim Öffnen: prüfen ob für heute (`entry_date = heute`, `type = 'morning'`) bereits ein Eintrag existiert
- Falls ja: Eintrag laden und alle Felder vorausfüllen
- User kann Änderungen vornehmen und erneut speichern (UPSERT, kein Duplikat)
- Falls nein: leeres Formular wie bisher

---

### Bug 6 — "KI hilft mir formulieren"-Button inaktiv ✅ UMGESETZT (2026-04-04)
**Datei:** `src/components/onboarding/Step6_Identity.tsx`
**Symptom:** Button ist inaktiv (ausgegraut) solange kein eigener Text eingegeben wurde.
**Gewünschtes Verhalten:**
- Button ist immer klickbar — auch ohne eigenen Text
- Wenn kein Text vorhanden: KI generiert Vorschlag auf Basis aller bisherigen Onboarding-Eingaben (Nordstern, Werte, Ikigai, 5-Warum-Kette)
- Wenn Text vorhanden: KI nimmt den Text als Ausgangspunkt und reformuliert/verbessert ihn
- Fix: `disabled`-Bedingung am Button entfernen, `reformulateIdentity()` so anpassen dass sie auch ohne Input-Text funktioniert

---

## ✏️ ÄNDERUNGEN (7–11)

### Änderung 7 — Pattern-Interrupt Banner: Logik-Fix + ⓘ-Symbol ✅ UMGESETZT (2026-04-04)
**Betrifft:** Dashboard.tsx, PatternInterrupt-Banner-Komponente
**Problem 1 — Falsche Logik:**
- Aktuell: Banner erscheint wenn letzter Eintrag > 3 Tage her
- Problem: direkt nach dem Onboarding gibt es noch keinen Eintrag → Banner erscheint sofort
- Fix: Basis für die 3-Tage-Logik = `profiles.created_at` (Accounterstellungsdatum), nicht Datum des letzten Eintrags. Erst wenn Account > 3 Tage alt UND kein Eintrag in den letzten 3 Tagen → Banner zeigen.

**Problem 2 — Logik nicht transparent:**
- Fix: Kleines ⓘ-Symbol in der Banner-Kachel
- Bei Hover (Desktop) oder Tap (Mobile): Tooltip erscheint mit Text "Dieser Hinweis erscheint wenn du 3 oder mehr Tage keinen Eintrag gemacht hast."

---

### Änderung 8 — Review umbenennen + manueller Startbutton ✅ UMGESETZT (2026-04-04)
**Datei:** `src/pages/Review.tsx` + Navigation + Tab-Bar
**Änderung 1:** "Review" überall umbenennen zu "Wochenreview"
- Tab-Bar Label
- Seitentitel
- Alle Buttons und Überschriften in Review.tsx

**Änderung 2:** KI-Zusammenfassung nicht automatisch starten
- Aktuell: beim Laden der Seite startet sofort die KI-Analyse (teuer + ungewollt)
- Neu: Seite zeigt zunächst nur einen Button "Wochenreview starten"
- Erst nach Klick auf diesen Button beginnt der Flow mit Schritt 1 (KI-Zusammenfassung)

---

### Änderung 9 — Einstellungen: ⓘ-Symbole bei Buttons ✅ UMGESETZT (2026-04-04)
**Datei:** `src/pages/Settings.tsx`
**Änderung:** Jeder Button in den Einstellungen bekommt ein kleines ⓘ-Symbol daneben.
**Bei Hover/Tap erscheint ein Tooltip** der erklärt:
- Was der Button tut
- Welche Daten betroffen sind
- Ob die Aktion rückgängig gemacht werden kann

**Beispiele:**
- "Onboarding neu starten" → "Setzt deinen Onboarding-Status zurück. Dein Name und alle Journal-Einträge bleiben erhalten."
- "Journal-Einträge löschen" → "Löscht alle deine Morgen-, Abend- und Freeform-Einträge unwiderruflich. Ziele und Profil bleiben erhalten."
- "Alle Daten löschen" → "Löscht alle Einträge, Ziele, Coach-Sessions und setzt dein Profil zurück. Nur dein Name bleibt. Nicht rückgängig zu machen."

---

### Änderung 10 — Review: Zeitraum-Auswahl ✅ UMGESETZT (2026-04-04)
**Datei:** `src/pages/Review.tsx`
**Konzept:** Vor dem Start des Reviews wählt der User welchen Zeitraum er reviewen möchte.

**UI-Flow:**
1. Seite öffnet mit Zeitraum-Auswahl: `Woche | Monat | Quartal | Jahr`
2. Darunter Button "Wochenreview starten" (Label passt sich an gewählten Zeitraum an)
3. Nach Klick: KI-Zusammenfassung lädt die passenden Daten für den gewählten Zeitraum

**Daten je Zeitraum:**
- Woche: Journal-Einträge der letzten 7 Tage + aktuelle Wochenziele
- Monat: Journal-Einträge der letzten 30 Tage + Monatsziele + Wochenziele des Monats
- Quartal: Alle Einträge im aktuellen Quartal + Quartalsziel + Pattern-Analyse
- Jahr: Alle Einträge des aktuellen Jahres + Jahresziel + alle Quartalsziele

**KI-Prompt:** Je nach Zeitraum wird ein angepasster Prompt an `generateWeeklySummary()` übergeben — oder eine neue Funktion `generateReviewSummary(zeitraum, daten)` in claude.ts.

---

### Änderung 11 — Review: Intelligente Datenaggregation je Zeitraum ⚠️ OFFEN
**Datei:** `src/pages/Review.tsx`, `src/lib/claude.ts`

**Problem:** Bei Quartal und Jahr werden aktuell zu viele rohe Tageseinträge an die KI übergeben. Das riskiert Token-Limit-Fehler und schlechte Antwortqualität.

**Fix — Zusammenfassungs-Hierarchie:**
- **Woche:** Tageseinträge der letzten 7 Tage + Wochenziele
- **Monat:** Wochenreviews des Monats (gespeicherte Coach-Sessions mit `trigger = 'weekly_review'`) + Monatsziel + Wochenziele des Monats
- **Quartal:** Monatsreviews des Quartals + Quartalsziel + Monatsziele
- **Jahr:** Quartalsreviews + Jahresziel + Quartalsziele

**Fallback:** Falls kein Review der höheren Ebene existiert → eine Ebene tiefer gehen (z.B. keine Monatsreviews → direkt Wocheneinträge verwenden).

**Technisch:**
- `coach_sessions` Tabelle existiert bereits mit `trigger` und `summary`-Feld
- Neue DB-Funktion `getReviewSessions(userId, trigger, seit)` in `db.ts` zum Laden vergangener Reviews
- In `generateReviewSummary()`: statt roher Einträge → komprimierte Review-Summaries als Kontext übergeben
- Dadurch drastisch weniger Token, bessere Qualität bei langen Zeiträumen

---

## 💡 FEATURES (12–15)

### Feature 12 — Kalender-Tab mit wiederkehrenden Zeitblöcken ⚠️ OFFEN
**Aufwand: Sehr Groß — eigene Session**

**Übersicht:**
Eigener Kalender-Tab in der Navigation der alle Zeitblöcke als Tagesansicht zeigt. Zeitblöcke können als wiederkehrende Serien angelegt werden. Vollständiger Sync mit Morgenjournal Schritt 4.

**Navigation:**
- Neuer Tab "Kalender" in der Bottom Tab Bar (Icon: Calendar)
- Route: `/calendar`
- Neue Seite: `src/pages/Calendar.tsx`

**Tagesansicht:**
- Zeitachse von z.B. 06:00 bis 22:00 in 30-Minuten-Schritten
- Zeitblöcke werden als farbige Balken dargestellt
- Heute ist standardmäßig ausgewählt, Datum-Navigation (Pfeil links/rechts)
- Tap auf Zeitblock → öffnet Detail/Bearbeitungs-Sheet

**Wiederkehrende Serien:**
- Beim Erstellen eines Zeitblocks: Option "Wiederholen" mit Auswahl:
  - Täglich
  - Mo–Fr (Werktage)
  - Wöchentlich (gleicher Wochentag)
  - Nicht wiederholen (einmaliger Termin)
- Enddatum der Serie optional festlegbar

**Bearbeiten einer Serie — die klassische Auswahl:**
Beim Bearbeiten oder Löschen eines Serientermins erscheint immer die Auswahl:
- "Nur diesen Termin" → ändert nur dieses eine Datum
- "Diesen und alle folgenden Termine" → ändert ab diesem Datum
- "Alle Termine der Serie" → ändert die gesamte Serie

**Technisch — neue Supabase-Tabelle `recurring_blocks`:**
```sql
CREATE TABLE recurring_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIME NOT NULL,         -- z.B. 08:00
  end_time TIME NOT NULL,           -- z.B. 10:00
  recurrence_type TEXT NOT NULL,    -- 'none' | 'daily' | 'weekdays' | 'weekly'
  recurrence_day INT,               -- 0=So, 1=Mo ... 6=Sa (nur bei 'weekly')
  start_date DATE NOT NULL,
  end_date DATE,                    -- null = läuft unbegrenzt
  color TEXT DEFAULT '#863bff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recurring_block_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES recurring_blocks(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,     -- welches Datum ist betroffen
  modified_title TEXT,              -- wenn nur Titel geändert
  modified_start_time TIME,
  modified_end_time TIME,
  is_deleted BOOLEAN DEFAULT FALSE  -- true = dieser Termin wurde gelöscht
);
```

**Sync mit Morgenjournal:**
- Morgenjournal Schritt 4 (Timeboxing): zeigt die Serien-Zeitblöcke des heutigen Tages als Vorlage
- Änderungen im Morgenjournal werden als `recurring_block_exceptions` für dieses Datum gespeichert
- Kalender-Tab liest diese Ausnahmen und zeigt sie korrekt an
- Beide Ansichten nutzen dieselbe Datenbasis — kein separater State

---

### Feature 13 — Ziel-Kaskade mit abhakbaren Tasks ⚠️ OFFEN
**Aufwand: Groß — eigene Session**

**Konzept:**
Jedes Ziel (auf jeder Ebene) kann optionale Sub-Tasks bekommen. Tasks haben Checkboxen. Der Fortschrittsbalken eines Ziels berechnet sich automatisch aus dem Verhältnis erledigter Tasks.

**Technisch — neue Supabase-Tabelle `goal_tasks`:**
```sql
CREATE TABLE goal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI-Änderungen:**
- GoalCard: kleiner "Tasks hinzufügen"-Button unter dem Fortschrittsbalken
- Tasks erscheinen als Liste mit Checkboxen direkt in der GoalCard (collapsible)
- Checkbox abhaken → `completed = true` in DB → Fortschrittsbalken aktualisiert sich
- Fortschritt = erledigte Tasks / Gesamtzahl Tasks × 100 (falls Tasks vorhanden, sonst manueller Slider wie bisher)
- Tasks können umbenannt, gelöscht und per Drag & Drop umsortiert werden

**Dashboard:**
- Wochenziel-Karte zeigt Tasks inline mit Checkboxen
- Max. 3 Tasks sichtbar, "Alle anzeigen" blendet Rest ein

---

### Feature 14 — Tasks im Tagesjournal mit Dashboard-Sync ⚠️ OFFEN
**Aufwand: Groß — eigene Session nach Feature 13**
**Voraussetzung: Feature 13 muss fertig sein**

**Konzept:**
Im Morgenjournal können konkrete Tages-Tasks eingetragen werden. Diese erscheinen im Dashboard und im Abendjournal zum Abhaken.

**Morgenjournal Schritt 2 — Erweiterung:**
- Nach dem Tages-Fokus-Feld: Abschnitt "Was sind deine 3 wichtigsten Aufgaben heute?"
- 3 Textfelder (dynamisch, min. 1, max. 5)
- Optional mit einem Wochenziel verknüpfbar (Dropdown)
- Werden als `goal_tasks` mit `date = heute` gespeichert (oder eigenes Feld in journal_entries)

**Dashboard:**
- Neue Karte "Heute zu erledigen" mit den Tages-Tasks als Checkboxen
- Abhaken aktualisiert Status sofort
- Karte erscheint nur wenn Morgenjournal ausgefüllt wurde

**Abendjournal:**
- Schritt 1 zeigt die Tages-Tasks aus dem Morgenjournal mit Status (erledigt/offen)
- User kann direkt dort noch Tasks abhaken
- "Was hast du heute erreicht?"-Feld wird mit erledigten Tasks vorausgefüllt (editierbar)

---

### Feature 15 — Coach-Archiv ⚠️ OFFEN
**Aufwand: Mittel — eigene Session**

**Konzept:**
Vergangene Coach-Sessions sind abrufbar und durchsuchbar. Aktuell gehen alle Sessions nach Tab-Wechsel verloren (Bug 3) oder sind nur in der DB gespeichert aber nirgends sichtbar.

**UI:**
- Im Coach-Tab: neuer Button "Vergangene Sessions" oben rechts (neben "Neue Session")
- Öffnet eine Liste aller gespeicherten Sessions (aus `coach_sessions` Tabelle)
- Sortiert nach Datum, neueste zuerst
- Jeder Eintrag zeigt: Datum, Modus/Trigger, erste Nachricht als Vorschau
- Tap öffnet die vollständige Unterhaltung (read-only)
- Sessions können einzeln gelöscht werden

**DB:**
- `coach_sessions` Tabelle existiert bereits mit `messages`, `trigger`, `summary`
- Nur lesender Zugriff nötig — keine Schema-Änderung erforderlich

---

## ✅ Umgesetzte Features

*(Wird nach jeder Session hier eingetragen)*

---

## Reihenfolge der Umsetzung

1. ✅ Bugs 1–6 (erledigt 2026-04-04)
2. ✅ Änderungen 7–10 (erledigt 2026-04-04)
3. Änderung 11 — Intelligente Datenaggregation (Review)
4. Feature 13 — Ziel-Kaskade mit Tasks
5. Feature 14 — Tasks im Tagesjournal (baut auf 13 auf)
5. Feature 11 — Kalender (sehr groß, eigene Session)
6. Feature 14 — Coach-Archiv
