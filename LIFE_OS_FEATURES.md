# LIFE_OS_FEATURES.md — Aktive Pakete
# Claude Code liest diese Datei beim Session-Start automatisch.
# Nach Abschluss eines Schritts: Status auf ✅ UMGESETZT (Datum) setzen.
# Zuletzt aktualisiert: 2026-04-09 (Lebensrad-Konzept, Zielstruktur, Datenkonsistenz integriert)

---

## ÜBERSICHT — Pakete und Reihenfolge

| Paket | Thema | Priorität |
|---|---|---|
| Paket 7 | Bugs & Stabilität | JETZT — Blocker |
| Paket 8 | Design-Overhaul + Lebensbereiche-Farben + Motivationssprüche | DANACH |
| Paket 9 | Journal-Logik, Zielstruktur mit Lebensbereich + Limits, Kaskade visuell | DANACH |
| Paket 10 | Login vereinfachen | DANACH |
| Paket 11 | "Ich"-Tab (Lebensrad), Übersicht als Tagebuch, neue DB-Tabellen | DANACH |
| Paket 6 | Vision/Identität KI-Flows, Coach vollständiger Kontext | ZULETZT |

**Reihenfolge ist kritisch. Niemals Paket 8 vor Paket 7. Niemals Paket 6 vor Paket 11.**

---

## PAKET 7 — Bugs & Stabilität

### Paket 7A — Datenverlust (Kritisch)

---

### Schritt 1 — Tab-Wechsel: Datenverlust beheben ⬜ OFFEN

**Problem:** Wenn der Nutzer einen Tab wechselt während er etwas einträgt, gehen die
nicht gespeicherten Eingaben verloren.

**Lösung:**
- Formulardaten bei jedem Tab-Wechsel automatisch als Draft speichern (localStorage oder Zustand-Store)
- Beim Zurückkehren: Draft automatisch wiederherstellen
- Draft wird gelöscht wenn der Nutzer explizit speichert

**Betrifft:** Alle Journal-Komponenten (JournalDay, JournalWeek, JournalMonth, JournalQuarter, JournalYear)

**Bisherige Versuche (Stand 2026-04-09):**
1. Erster Fix: localStorage + useEffect-basiertes Speichern → Race Condition (useEffect läuft nach Paint, Nutzer kann davor navigieren)
2. Zweiter Fix: Synchrones Speichern in Event-Handlern (next/back/patchData) → Build OK, aber Problem beim Testen noch vorhanden

**Nächster Debugschritt:**
- console.log in saveDraft() einbauen: prüfen ob Drafts überhaupt in localStorage geschrieben werden
- console.log beim Lesen (useState Lazy Initializer): prüfen ob validDraft korrekt gelesen wird
- Ziel: herausfinden ob es ein Speicher-Problem oder ein Lade-Problem ist

---

### Schritt 2 — Abendjournal: Daten bleiben erhalten beim erneuten Öffnen ⬜ OFFEN

**Problem:** Bereits gespeicherte Daten im Abendjournal sind ab Schritt 2 leer wenn
der Nutzer erneut öffnet.

**Erwartetes Verhalten:** Bereits gespeicherte Daten werden vollständig geladen — editierbar.

**Betrifft:** JournalDay.tsx (Abend-Bereich), EveningJournal.tsx

---

### Schritt 3 — Habits im Abendjournal wiederherstellen ⬜ OFFEN

**Problem:** Habits sind im Abendjournal komplett nicht mehr sichtbar/abhakbar.

**Lösung:**
- Habits des aktuellen Monats im Abendjournal anzeigen
- Tägliches Abhaken wiederherstellen
- Frequenz-Logik beachten (täglich vs. X mal pro Woche)
- Bereits abgehakte Habits als abgehakt anzeigen

---

### Schritt 4 — Vision bearbeiten: Loop beheben ⬜ OFFEN

**Problem:** Bearbeiten-Button führt im Kreis statt zu einem editierbaren Feld.

**Lösung:** Direktes Textfeld in Einstellungen → Vision zum Bearbeiten.
Hinweis: In Paket 11 wird die Vision komplett neu als Lebensrad gebaut —
dieser Fix ist nur eine temporäre Lösung damit der Nutzer nicht blockiert ist.

---

### Schritt 5 — KI-Markdown-Rendering überall fixen ⬜ OFFEN

**Problem:** KI-Antworten zeigen rohe Markdown-Formatierung.

**Betrifft:** KI-Feedback an Zielen, KI-Impuls Morgenjournal, KI-Zusammenfassungen,
Abend-KI-Feedback, Coach-Antworten.

**Lösung:** react-markdown ist bereits in FeedbackPanel.tsx. Alle anderen Komponenten
die KI-Text anzeigen ebenfalls damit ausstatten.

---

### Paket 7B — Mobile & PC Layout

---

### Schritt 6 — Handy: App-Layout starr machen ⬜ OFFEN

**Problem:** Tab-Leiste schiebt sich über Tastatur. App verschiebt sich beim Tippen.
Inhalte am Rand abgeschnitten.

**Lösung:**
- Tab-Leiste: `position: fixed; bottom: 0` mit `env(safe-area-inset-bottom)`
- Viewport: `height: 100dvh` statt `100vh`
- `interactive-widget=resizes-content` im meta-Tag prüfen
- Horizontales Overflow beheben

---

### Schritt 7 — PC: Volle Bildschirmbreite nutzen ⬜ OFFEN

**Problem:** Nur schmaler zentrierter Streifen auf dem PC.

**Lösung:**
- Ab ~1024px volle Breite
- Zwei-Spalten-Layout wo sinnvoll (Dashboard, Journal)
- Coach und Übersicht: volle Breite
- Mobile-First bleibt erhalten

---

### Paket 7C — Logik & Qualität

---

### Schritt 8 — Zeitperioden-Logik korrekt implementieren ⬜ OFFEN

**Problem:** Perioden-Abschluss-Dialoge erscheinen zum falschen Zeitpunkt.

**Erwartetes Verhalten:**
- Woche = Mo–So (Kalenderwochen)
- Monat = 1.–letzter des Monats
- Perioden-Abschluss-Dialog erst NACH Ende der Periode
- Neue Planung erst nach Abschluss der alten Periode möglich

**Betrifft:** journal_periods, utils.ts, alle Journal-Komponenten

---

### Schritt 9 — Tagesaufgaben → Wochenziel Zuordnung im Morgenjournal ⬜ OFFEN

**Problem:** Tagesaufgaben können keinem Wochenziel zugeordnet werden.

**Lösung:**
- Bei jeder Tagesaufgabe: optionales Dropdown "Gehört zu Wochenziel"
- Zeigt alle aktiven Wochenziele der aktuellen KW
- Zuordnung optional
- Dashboard: Tagesaufgabe zeigt zugeordnetes Wochenziel als Badge

---

### Schritt 10 — KI-Impuls: Qualität verbessern ⬜ OFFEN

**Problem:** KI-Impuls oft leer, zu kurz oder unbrauchbar.

**Erwartetes Verhalten:**
- Immer vorhanden, 3–5 Sätze, konkret und personalisiert
- Bezieht sich auf heutige Tasks, aktuelle Wochenziele, Datum
- Ton entspricht dem gewählten Coach-Ton
- Prompt verbessern: mehr Kontext mitgeben

---

## PAKET 8 — Design-Overhaul

### Paket 8A — Design-System

---

### Schritt 1 — Design-System + Lebensbereiche-Farben definieren ⬜ OFFEN

**Was gebaut wird:** Einheitliches Design-System für die gesamte App.

**Farbpalette:**
- Primärfarbe: Tiefes Blau-Grau (#1a1f2e)
- Akzentfarbe: Weiches Blau-Grün (#4f8a8b oder ähnlich)
- Hintergrund: Sehr helles Grau (#f8f9fb)
- Karten: Weiß mit subtilем Schatten
- Text: Dunkelgrau (#1a1f2e)
- Muted Text: Mittelgrau (#6b7280)
- Kein Orange, kein Gelb

**Lebensbereiche-Farben (konsistent überall in der App):**
- Körper & Geist: Blau (#3b82f6)
- Soziales: Grün (#22c55e)
- Liebe: Pink (#ec4899)
- Finanzen: Gelb-Gold (#eab308) — nur als Akzent, nie als Hintergrund
- Karriere: Orange-Amber (#f97316) — nur als Akzent, nie als Hintergrund
- Sinn: Lila (#a855f7)

**Typografie:** Inter oder System-Font, klar gestuft, großzügige Zeilenhöhe

**Komponenten:** Buttons abgerundet (10–12px), Karten mit Box-Shadow, großzügige Abstände

**Umsetzung:** CSS-Variablen global definieren, Tailwind-Config anpassen

---

### Paket 8B — Screens neu gestalten

---

### Schritt 2 — Dashboard visuell neu gestalten + Motivationssprüche ⬜ OFFEN

**Desktop (2 Spalten):**

Linke Spalte:
- Lebensrad-Miniatur (kleines Radar-Diagramm, Übersicht auf einen Blick)
- Identitäts-Affirmation (kurz, prominent)
- Tages-Tasks: abhakbar, mit Wochenziel-Badge
- Wochenziele mit Fortschrittsbalken

Rechte Spalte:
- Streak + aktuelle Periode
- Zielkaskade: heutige Tasks → Wochenziel → Monatsziel visuell verbunden
- Quick-Links: "Morgenjournal", "Abendjournal", "Coach"
- Motivationssprüche-Button: zufälliger Spruch aus der Liste (Button "Brauch ich heute")

**Motivationssprüche-Liste (zufällig ausgespielt):**
1. "Erfolgreiche Menschen sind nicht immer motiviert, sie sind diszipliniert. Motivation ist ein flüchtiges Gefühl — wer darauf wartet, fängt nie an."
2. "Alles was gut für dich ist, fühlt sich kurzfristig unangenehm an. Alles Schädliche fühlt sich kurzfristig gut an. Das ist kein Zufall — es ist ein Muster."
3. "Nach 4–6 Wochen wird eine neue Gewohnheit automatisch. Vorher ist es harte Arbeit. Das ist normal — kein Zeichen von Schwäche."
4. "Du wählst sowieso zwischen zwei Schmerzen: dem Schmerz der Disziplin oder dem Schmerz des Bedauerns. Der erste wiegt weniger."
5. "Der Weg ist das Ziel. Wer aufhört, verliert alles was er aufgebaut hat — fang klein an, aber fang an."
6. "Du kannst nicht noch 50 Silvester feiern und gleichzeitig so leben als hättest du unendlich Zeit."
7. "Klein anfangen. Einen Bereich wählen. Vier Wochen durchhalten. Der Hunger kommt von selbst."
8. "Nicht überladen. Nicht tausend Bälle jonglieren. Was sind deine wichtigsten Bälle — und hältst du sie wirklich?"

**Was entfernt wird:**
- "Letzte 60 Tage" Heatmap → raus
- Vision-Banner (Textblock) → wird zu Lebensrad-Miniatur

**Mobile:** Alles untereinander, gleiche Reihenfolge

---

### Schritt 3 — Journal visuell neu gestalten ⬜ OFFEN

- Tab-Navigation oben: klare aktive/inaktive Zustände
- Formularfelder: großzügige Abstände, gut lesbare Labels
- Speichern-Button: immer sichtbar
- Morgenjournal: Metriken als schöne Slider oder Zahl-Picker
- Tasks: gut sichtbare Checkbox + Textfeld
- Abendjournal: Energie-Farbkodierung schöner
- Habits: übersichtliche Liste, gut abhakbar

---

### Schritt 4 — Coach visuell neu gestalten ⬜ OFFEN

- Chat-Blasen: klar unterscheidbar (Nutzer vs. KI)
- Ton-Auswahl: prominent sichtbar
- Volle Breite auf Desktop
- Eingabefeld: unten fixiert

---

### Schritt 5 — Übersicht visuell neu gestalten ⬜ OFFEN

- Kalender: Lebensbereiche-Farbpunkte an Tagen mit Zielen
- Habit-Grid: konsistente Farben, gut lesbar
- Charts: Design-System-Farben

---

### Schritt 6 — Einstellungen visuell neu gestalten ⬜ OFFEN

- Sektionen: klarer Header, schöner Pfeil
- Gefahrenzone: visuell klar abgetrennt, rotes Design

---

## PAKET 9 — Journal-Logik, Zielstruktur & Bereinigung

### Paket 9A — Tagesaufgaben Vor-/Nachplanung

---

### Schritt 1 — Abendjournal: Tagesaufgaben für morgen vorplanen ⬜ OFFEN

**Was gebaut wird:** Am Ende des Abend-Eintrags optionaler Bereich "Aufgaben für morgen" (0–4).

**Synchronisation:**
- Aufgaben erscheinen am nächsten Morgen im Morgenjournal vorausgefüllt
- Im Morgenjournal: änderbar, löschbar, ergänzbar
- Abend-Eintrag bleibt als Snapshot — Morgen-Änderungen überschreiben ihn nicht

**DB:** `next_day_tasks` (JSON-Array) in journal_entries für Abend-Typ

---

### Schritt 2 — Morgenjournal: vorbereitete Tasks aus Abend laden ⬜ OFFEN

Technische Gegenseite zu Schritt 1 — Tasks vom Vorabend automatisch laden.

---

### Paket 9B — Zielstruktur mit Lebensbereichen

---

### Schritt 3 — Ziele: life_area Feld + Limit-Logik einbauen ⬜ OFFEN

**Was gebaut wird:**

DB-Migration: `life_area` Feld an goals-Tabelle hinzufügen.

UI-Änderungen:
- Beim Ziel erstellen/bearbeiten: Lebensbereich Pflichtfeld (Dropdown mit 6 Bereichen + Farbe)
- Limit-Prüfung vor Speichern: wenn Limit erreicht → klare Meldung, kein Speichern
  - Jahr: max. 1 pro Lebensbereich
  - Quartal: max. 2 pro Lebensbereich
  - Monat: max. 2 pro Lebensbereich
  - Woche: max. 3 pro Lebensbereich
- Hinweisbanner: "Formuliere dein Ziel konkret und messbar" beim Erstellen
- Lebensbereiche-Farbe überall an Zielen sichtbar (Badge, Punkt, Linie)

---

### Schritt 4 — Pflichtverknüpfung Quartal→Jahr und Monat→Quartal ⬜ OFFEN

**Was gebaut wird:**

- Quartalsziel erstellen: parent_id Pflichtfeld, zeigt nur Jahresziele des gleichen Lebensbereichs
- Monatsziel erstellen: parent_id Pflichtfeld, zeigt nur Quartalsziele des gleichen Lebensbereichs
- Wochenziel: parent_id optional, zeigt Monatsziele des gleichen Lebensbereichs
- Tagesaufgabe: Wochenziel optional, zeigt Wochenziele

---

### Schritt 5 — Zielkaskade visuell pro Lebensbereich ⬜ OFFEN

**Was gebaut wird:**

Pro Lebensbereich eine verbundene Hierarchie-Ansicht:
```
[Lebensbereich: Körper & Geist] ●
  └── Jahresziel: "..."
        └── Q2-Ziel: "..."
              └── April-Ziel: "..."
                    └── KW15-Ziel: "..."
                          └── Aufgabe: "..."
```

Zugänglich über:
- Journal → Jahr → Planung: alle 6 Bereiche als aufklappbare Kaskaden
- "Ich"-Tab (Paket 11): gleiche Ansicht als Übersicht (readonly)
- Dashboard: kompakte Version für aktuell relevante Ebene

Lebensbereiche-Farben konsistent in der Kaskade.

---

### Paket 9C — Übersicht als Tagebuch

---

### Schritt 6 — Kalender-Klick öffnet Tages-Archiv ⬜ OFFEN

**Was gebaut wird:**

Klick auf einen Tag im Kalender → Panel öffnet sich darunter (kein Seitenwechsel).

Angezeigt werden alle Daten dieses Tages:
- Morgenjournal (Metriken, Tasks, KI-Impuls)
- Abendjournal (Reflexion, Habits, Energie)
- Falls Wochenstart/-ende: Wochenplanung/-reflexion
- Falls Monatsstart/-ende: Monatsplanung/-reflexion
- Falls Quartal-/Jahreswechsel: entsprechende Einträge
- KI-Feedback das an diesem Tag generiert wurde
- Coach-Gespräche dieses Tages

**Datenkonsistenz:** Alles direkt aus Supabase — keine lokalen Kopien.
Gelöschte Einträge erscheinen hier nicht mehr.

---

### Paket 9D — Journal bereinigen

---

### Schritt 7 — Morgenjournal: überflüssige Felder deaktivieren ⬜ OFFEN

**Was deaktiviert wird (Code bleibt):**
- "Dein Ziel Kontext"
- "Mein Ziel für heute" (redundant zu Tasks)
- "Welche Handlung heute beweist wer du bist?"

---

### Schritt 8 — Journal: weitere überflüssige Felder bereinigen ⬜ OFFEN

**Was deaktiviert wird (Code bleibt):**
- Woche: "Wofür steht diese Woche?"
- Monat: "Wofür steht dieser Monat?"
- Jahr: "Was will ich 2026 erreicht haben?" (redundant zu Jahreszielen)
- Abendjournal: "Heute habe ich..." Textfeld (redundant zu abgehakten Tasks)

---

## PAKET 10 — Login vereinfachen

---

### Schritt 1 — Magic Link ersetzen oder vereinfachen ⬜ OFFEN

**Problem:** Magic Link per E-Mail ist umständlich auf dem Handy.

**Optionen:**
- Option A: Auto-Login — Session läuft sehr lange (1 Jahr), kein erneuter Login
- Option B: PIN-Login — nach Magic Link einmalig 4–6-stelligen PIN setzen
- Option C: Magic Link UX verbessern

**Hinweis:** Nur ein Nutzer (Lukas), kein Fremdzugriff-Risiko. Bequemlichkeit hat Vorrang.
Claude Code soll beste Option empfehlen und begründen.

---

## PAKET 11 — "Ich"-Tab + Übersicht als Tagebuch + neue DB-Struktur

### Paket 11A — Neue DB-Tabellen + "Ich"-Tab Grundstruktur

---

### Schritt 1 — DB-Migration: neue Tabellen und Felder ⬜ OFFEN

**SQL-Migrationen (Lukas führt im Supabase SQL Editor aus):**

```sql
-- life_area Feld an profiles für Lebensrad-Vision
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_areas JSONB;

-- Jahres-Ist-Stände
CREATE TABLE IF NOT EXISTS life_area_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INT NOT NULL,
  snapshot_type TEXT CHECK (snapshot_type IN ('start','end')),
  scores JSONB NOT NULL,
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Schwerpunktwechsel-Log
CREATE TABLE IF NOT EXISTS focus_area_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT now(),
  old_areas JSONB,
  new_areas JSONB,
  reason TEXT NOT NULL
);
```

---

### Schritt 2 — Neuer Tab "Ich" erstellen ⬜ OFFEN

**Navigation:** Zwischen Coach und Einstellungen einfügen.

**Inhalt:**

1. **Lebensrad** — Radar/Spinnen-Diagramm mit 6 Bereichen
   - Werte kommen aus dem aktuellsten life_area_snapshot (Jahresbeginn)
   - Lebensbereiche-Farben aus Design-System
   - Klick auf Bereich → klappt Detail auf

2. **Pro Bereich aufgeklappt:**
   - 10/10-Vision-Text (aus profiles.life_areas, editierbar)
   - Aktuelles Jahresziel (readonly, Link zu Journal → Jahr)
   - Schwerpunkt-Badge (ja/nein)

3. **Identität/Affirmationen** — editierbar, Speichern-Button

4. **Werte, Stopp-Liste, Ikigai** — Code bleibt, in UI deaktiviert (ausgeblendet)

---

### Paket 11B — Journal → Jahr erweitern

---

### Schritt 3 — Journal → Jahr: Ist-Stand pro Lebensbereich ⬜ OFFEN

**Was gebaut wird:**

Im Journal → Jahr → Planung:
- Jahresbeginn-Sektion: Ist-Stand pro Lebensbereich (1–10 Slider + kurze Notiz)
- Schwerpunktbereiche wählen (2–3 Bereiche markieren)
- Speichern → in life_area_snapshots (snapshot_type: 'start')

Im Journal → Jahr → Reflexion:
- Jahresende-Sektion: neuer Ist-Stand pro Lebensbereich (1–10 + Notiz)
- Speichern → in life_area_snapshots (snapshot_type: 'end')
- Vergleich: Start-Stand und End-Stand nebeneinander angezeigt
- Jahresziel pro Bereich als Soll-Wert daneben

---

### Schritt 4 — Schwerpunktwechsel: Button + Pflichtnotiz + Speicherung ⬜ OFFEN

**Was gebaut wird:**

Im Journal → Jahr → Planung: Button "Schwerpunktbereiche ändern"

Beim Klick:
- Aktuelle Schwerpunkte angezeigt
- Neue Auswahl (2–3 Bereiche)
- Pflicht-Textfeld: "Warum änderst du den Schwerpunkt?"
- Speichern → in focus_area_changes (old_areas, new_areas, reason, changed_at)

KI bekommt diese Information als Kontext.

---

### Paket 11C — Einstellungen bereinigen

---

### Schritt 5 — Einstellungen bereinigen ⬜ OFFEN

**Was bleibt:**
- Mein Profil (Name, E-Mail)
- Habits & Journal (Metriken-Toggle)
- Datenspeicher (Supabase-Link + Anthropic Console Link)
- Profil einrichten (Onboarding neu starten)
- Gefahrenzone
- Account (Abmelden)

**Was rausfliegt (Code bleibt, deaktiviert):**
- Vision & Identität → im "Ich"-Tab
- Werte → deaktiviert
- Stopp-Liste → deaktiviert
- Ikigai → deaktiviert

**Neue Links in Datenspeicher:**
- Supabase Dashboard
- Anthropic Console (https://console.anthropic.com)

---

## PAKET 6 — Vision & Identität KI-Flows (zuletzt)

Paket 6 wird erst angegangen wenn Pakete 7–11 vollständig abgeschlossen sind.

### Schritt 1 — Lebensrad KI-Flow: 10/10-Vision erarbeiten ⬜ OFFEN

**Zugänglich über:** "Ich"-Tab → Lebensrad → "Mit KI erarbeiten"

**Ablauf:**
- KI führt durch alle 6 Lebensbereiche einzeln
- Pro Bereich: KI stellt Fragen, hilft beim Formulieren der 10/10-Beschreibung
- Nutzer kann KI-Vorschlag annehmen, anpassen oder neu generieren
- Am Ende: alle 6 Bereiche gespeichert in profiles.life_areas
- Vision wird archiviert wenn sie geändert wird (altes Jahr als Snapshot)

---

### Schritt 2 — Identität: KI leitet Affirmationen aus Lebensrad ab ⬜ OFFEN

**Ablauf:**
- KI analysiert die 6 Lebensbereiche-Visionen
- Generiert 5–8 Identitäts-Affirmationen ("Ich bin jemand der...")
- Nutzer kann annehmen, einzeln bearbeiten, neue generieren lassen
- Gespeichert in profiles.identity_statement (als JSON-Array)

---

### Schritt 3 — Jahresstart-Flow mit KI-Unterstützung ⬜ OFFEN

**Ablauf:**
- KI begleitet den Jahresstart im Journal → Jahr → Planung
- KI analysiert Vision + letztjährige Einträge (falls vorhanden)
- Schlägt Ist-Stand-Bewertungen vor, begründet sie
- Empfiehlt Schwerpunktbereiche basierend auf Ist-Stand und Vision
- Schlägt Jahresziele vor die realistisch und zur Vision passend sind

---

### Schritt 4 — Identität täglich im Morgen/Abend ⬜ OFFEN

- Morgens: Identitäts-Affirmationen anzeigen (readonly, 1–2 Affirmationen rotierend)
- Abends: Identitäts-Abgleich Ja/Teilweise/Nein + kurze Notiz

**DB:** identity_check + identity_note in journal_entries (Migration ausstehend)

---

### Schritt 5 — Habit-KI: Bewertung + Vorschläge ⬜ OFFEN

- KI bewertet aktuelle Habits gegen Vision und Identität
- Schlägt neue Habits vor die zur Vision passen
- Ein-Klick-Übernahme als neuer Habit

---

### Schritt 6 — Coach: vollständiger Kontext ⬜ OFFEN

**Kontext den der Coach bekommt:**
- Vision (alle 6 Lebensbereiche, 10/10-Beschreibungen)
- Identität/Affirmationen
- Alle Ziele (alle Ebenen, alle Bereiche) + Completion-Status
- Aktuelle Habits + Completion-Rate letzte 30 Tage
- Letzte 7 Tage Journal-Einträge (Morgen + Abend)
- Letzte Identitäts-Checks
- Aktueller Schwerpunktbereich + Begründung letzter Wechsel
- Jahresbeginn-Ist-Stand vs. aktueller berechneter Stand

---

## Abgeschlossene Pakete (Archiv)

**Paket 1 + 2A + 3A + 3B + 3C + 4 (alle 15 Schritte) — April 2026 ✅**
**Paket 5 (alle 6 Schritte) — April 2026 ✅**
Details in Archiv-Sektion der LIFE_OS_KONTEXT.md.
