# LIFE_OS_KONTEXT.md — Projektgedächtnis
# Wird nach JEDEM abgeschlossenen Schritt von Claude Code aktualisiert.
# Nach jeder Session: diese Datei ins Claude Project hochladen (ersetzt alte Version).
# Zuletzt aktualisiert: 2026-04-18 (Paket 7 + Paket 8 komplett abgeschlossen)

---

## Session-Start Lesereihenfolge
VISION.md → LIFE_OS_KONTEXT.md → LIFE_OS_FEATURES.md

---

## Aktueller App-Stand

Life OS ist eine PWA, live auf https://life-os-henna-xi.vercel.app

**Was die App aktuell kann (Stand nach Paket 7 + 8 komplett):**
- Navigation: Dashboard · Journal · Coach · Übersicht · Einstellungen
- Journal: Tag (Morgen/Abend), Woche, Monat, Quartal, Jahr — Pill-Tabs, großzügiges Layout
- Ziel-Hierarchie: parent_id Dropdown in allen Journal-Komponenten
- KI-Feedback an Zielen: FeedbackPanel mit Markdown, Cache, Rückfrage-Verlauf
- Habits: Tabellen habits + habit_logs, Monatsübergang-Dialog
- Übersicht: Kalender, Habit-Grid, Metriken-Charts — 2-Spalten-Layout auf Desktop
- Coach: 4 Modi, Ton-Auswahl, vergangene Sessions — Chat-Bubbles, 2-Spalten-Layout
- Einstellungen: 11 eingeklappte Sektionen — neue CollapsibleSection, Gefahrenzone-Trenner
- Dashboard: Lebensrad-Miniatur (Placeholder), Identität, Tasks, Wochenziele, Motivationssprüche
- Design-System: CSS-Variablen, Lebensbereiche-Farben in src/lib/lifeAreas.ts
- PC: volle Bildschirmbreite genutzt (dashboard-grid, coach-layout, overview-grid)
- Mobil: App starr, keine Verschiebung beim Tippen

**Bekannte kritische Bugs (aus App-Audit 09.04.2026):**
- ✅ Datenverlust beim Tab-Wechsel — BEHOBEN: onChange schreibt synchron in localStorage; aktiver Journal-Tab + MorningJournal-Schritt werden separat persistiert.
- ✅ Abendjournal leert sich ab Schritt 2 — BEHOBEN: useEffect lädt bestehenden Abend-Eintrag aus Supabase, zeigt Abschluss-Screen; "Eintrag bearbeiten"-Button vorhanden.
- ✅ Habits im Abendjournal nicht sichtbar — BEHOBEN: Als Schritt 2 direkt nach "Geschafft" in EveningJournal-Flow integriert. Vergangene Tage: readonly in JournalDay.
- ✅ Vision bearbeiten Loop — BEHOBEN: Inline-Bearbeitung in Journal → Jahr → Planung und Einstellungen → Vision & Identität. Kein Weiterleiten mehr.
- ✅ KI-Ausgaben rohe Markdown-Formatierung — BEHOBEN: ReactMarkdown in MorningJournal, EveningJournal, JournalWeek/Month/Quarter/Year ergänzt.
- ✅ Zeitperioden-Logik — BEHOBEN: ISO-Woche in utils.ts, Banner-Text kontextabhängig, Reflexion-Hinweis für aktive Perioden, HabitManager Carry-Over nur für aktuellen Monat
- ✅ Tab-Leiste / App verschiebt sich beim Tippen — BEHOBEN: interactive-widget=resizes-visual, height: 100dvh, overflow: hidden in AppLayout
- ✅ Tagesaufgaben → Wochenziel Zuordnung — BEHOBEN: ISO-Woche-Fix in Schritt 8 repariert getWeeklyGoals(); Dashboard zeigt jetzt Wochenziel-Badge an verknüpften Tasks
- PC: nur halbe Bildschirmbreite genutzt (Schritt 7, 7B)
- ✅ KI-Impuls Qualität — BEHOBEN: max_tokens 120→400, 3–5 konkrete Sätze, Datum + Wochenziele + Vision/Identität im Kontext

---

## Konzeptuelle Grundlage (Stand April 2026)

### Lebensrad — 6 Lebensbereiche
Die App ist ab Paket 9/11 um 6 Lebensbereiche strukturiert. Jedes Ziel gehört zu einem Bereich.
Bereiche: Körper & Geist · Soziales · Liebe · Finanzen · Karriere · Sinn
Jeder Bereich bekommt im Design-System eine eigene Farbe (Paket 8).

### Vision
Vision = 10/10-Beschreibung pro Lebensbereich (was wäre in diesem Bereich perfekt?).
Wird mit KI erarbeitet (Paket 6). Ist jahresgebunden — kann zu Jahresbeginn überarbeitet werden,
alte Version wird archiviert. Steht im "Ich"-Tab.

### Jahresstände (Journal → Jahr)
- Jahresbeginn: Ist-Stand pro Bereich (1–10 + Notiz)
- Jahresende: neuer Ist-Stand (1–10 + Notiz)
- Vergleich wird nebeneinander angezeigt
- Jahresziel = Soll-Zustand für das Jahr

### Zielstruktur mit Limits
| Ebene | Max. pro Lebensbereich | Verknüpfung |
|---|---|---|
| Jahr | 1 | — |
| Quartal | 2 | Pflicht → Jahresziel |
| Monat | 2 | Pflicht → Quartalsziel |
| Woche | 3 | Optional → Monatsziel |
| Tag | 4 Aufgaben gesamt | Optional → Wochenziel |

### Schwerpunktbereiche
Zu Jahresbeginn: 2–3 Bereiche als Schwerpunkt wählen.
Änderung jederzeit möglich über Button im Journal → Jahr → Planung.
Pflichtnotiz + Datum bei jeder Änderung → gespeichert in focus_area_changes.

### Datenkonsistenz
Änderungen und Löschungen wirken app-weit sofort (Single Source of Truth = Supabase).
Gilt für alle Daten inkl. Coach-Gespräche, Ziele, Journal-Einträge.

---

## Tech Stack

- React + TypeScript + Vite + Tailwind CSS v4
- Supabase (PostgreSQL) — ID: oqmowbctjzoiwtgpoqmo
- Anthropic Claude API (claude-sonnet-4-6)
- Zustand, Framer Motion, Recharts, PWA
- Deployment: Vercel, Auto-Deploy via GitHub (Branch: master)
- Lokaler Pfad: C:/Users/Anwender/Desktop/life-os

---

## Supabase-Tabellen

| Tabelle | Zweck | Status |
|---|---|---|
| profiles | User-Profil, Vision (north_star → life_areas), Identität | aktiv |
| goals | Ziel-Hierarchie, parent_id, life_area | aktiv — life_area Feld fehlt noch |
| journal_entries | Morgen/Abend-Einträge | aktiv |
| coach_sessions | KI-Coach | aktiv |
| pattern_events | Pattern-Interrupt-Logs | aktiv |
| goal_tasks | Tasks pro Ziel | aktiv |
| habits | Habits pro Monat | aktiv |
| habit_logs | Tägliche Habit-Abhakungen | aktiv |
| recurring_blocks | deaktiviert | inaktiv |
| recurring_block_exceptions | deaktiviert | inaktiv |
| journal_periods | Planung + Reflexion für Perioden | aktiv |
| life_area_snapshots | Jahres-Ist-Stände pro Bereich | NEU — Paket 11 |
| focus_area_changes | Schwerpunktwechsel-Log | NEU — Paket 11 |

**Ausstehende Migrations:**
```sql
-- Paket 9: life_area Feld an goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS life_area TEXT
  CHECK (life_area IN ('body_mind','social','love','finance','career','meaning'));

-- Paket 11: Lebensrad-Vision in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_areas JSONB;
-- north_star bleibt erhalten, wird nicht gelöscht

-- Paket 11: Neue Tabellen
CREATE TABLE IF NOT EXISTS life_area_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INT NOT NULL,
  snapshot_type TEXT CHECK (snapshot_type IN ('start','end')),
  scores JSONB NOT NULL,
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS focus_area_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT now(),
  old_areas JSONB,
  new_areas JSONB,
  reason TEXT NOT NULL
);

-- Paket 6B (sobald gebaut):
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_check TEXT
  CHECK (identity_check IN ('yes', 'partly', 'no'));
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_note TEXT;
```

---

## Navigation

**5 Tabs (Pakete 7–10):**
Dashboard · Journal · Übersicht · Coach · Einstellungen

**6 Tabs (ab Paket 11):**
Dashboard · Journal · Übersicht · Coach · Ich · Einstellungen

**"Ich"-Tab Inhalt:**
- Lebensrad (Radar-Diagramm, 6 Bereiche, Ist-Stand aus aktuellem Jahreseintrag)
- Pro Bereich aufklappbar: 10/10-Vision-Text, aktuelles Jahresziel, Schwerpunkt ja/nein
- Identität/Affirmationen (editierbar)
- Werte, Stopp-Liste, Ikigai: Code bleibt, in UI deaktiviert

**Übersichts-Tab:**
- Kalender: Klick auf Tag → Tages-Archiv (alle Einträge dieses Tages)
- Datenkonsistenz: alles live aus Supabase, keine lokalen Kopien
- Habit-Grid + Metriken-Charts bleiben

---

## Ausstehend — Pakete 7–11 + 6

| Nr | Name | Paket | Status |
|----|------|-------|--------|
| 7-1 | Tab-Wechsel: Datenverlust beheben | 7A | ✅ ERLEDIGT 2026-04-09 |
| 7-2 | Abendjournal: Daten bleiben erhalten beim erneuten Öffnen | 7A | ✅ ERLEDIGT 2026-04-09 |
| 7-3 | Habits im Abendjournal wiederherstellen | 7A | ✅ ERLEDIGT 2026-04-09 |
| 7-4 | Vision bearbeiten: Loop beheben (temporär, wird in P11 neu gebaut) | 7A | ✅ ERLEDIGT 2026-04-09 |
| 7-5 | KI-Markdown-Rendering überall fixen | 7A | ✅ ERLEDIGT 2026-04-09 |
| 7-6 | Handy: Tab-Leiste starr, App verschiebt sich nicht | 7B | ✅ ERLEDIGT 2026-04-09 |
| 7-7 | PC: Volle Bildschirmbreite nutzen | 7B | ✅ ERLEDIGT 2026-04-18 |
| 7-8 | Zeitperioden-Logik: Woche/Monat/Quartal/Jahr korrekt | 7C | ✅ ERLEDIGT 2026-04-18 |
| 7-9 | Tagesaufgaben → Wochenziel Zuordnung im Morgenjournal | 7C | ✅ ERLEDIGT 2026-04-18 |
| 7-10 | KI-Impuls: Qualität verbessern (länger, konkreter) | 7C | ✅ ERLEDIGT 2026-04-18 |
| 8-1 | Design-System + Lebensbereich-Farben definieren | 8A | ✅ ERLEDIGT 2026-04-18 |
| 8-2 | Dashboard visuell neu gestalten + Motivationssprüche-Button | 8B | ✅ ERLEDIGT 2026-04-18 |
| 8-3 | Journal visuell neu gestalten | 8B | ✅ ERLEDIGT 2026-04-18 |
| 8-4 | Coach visuell neu gestalten | 8B | ✅ ERLEDIGT 2026-04-18 |
| 8-5 | Übersicht visuell neu gestalten | 8B | ✅ ERLEDIGT 2026-04-18 |
| 8-6 | Einstellungen visuell neu gestalten | 8B | ✅ ERLEDIGT 2026-04-18 |
| 9-1 | Abendjournal: Tagesaufgaben für morgen vorplanen | 9A | ⬜ OFFEN |
| 9-2 | Morgenjournal: vorbereitete Tasks aus Abend laden | 9A | ⬜ OFFEN |
| 9-3 | Ziele: life_area Feld + Limit-Logik (1/2/2/3/4 Regel) | 9B | ⬜ OFFEN |
| 9-4 | Zielkaskade visuell pro Lebensbereich (verbundene Hierarchie) | 9B | ⬜ OFFEN |
| 9-5 | Pflichtverknüpfung Quartal→Jahr, Monat→Quartal in UI durchsetzen | 9B | ⬜ OFFEN |
| 9-6 | Kalender-Klick öffnet Tages-Archiv (alle Einträge des Tages) | 9C | ⬜ OFFEN |
| 9-7 | Morgenjournal: überflüssige Felder deaktivieren | 9D | ⬜ OFFEN |
| 9-8 | Journal: weitere überflüssige Felder bereinigen | 9D | ⬜ OFFEN |
| 10-1 | Login: Magic Link ersetzen durch PIN/Code oder Auto-Login | 10A | ⬜ OFFEN |
| 11-1 | Neuer Tab "Ich": Lebensrad + Identität/Affirmationen | 11A | ⬜ OFFEN |
| 11-2 | Lebensrad: Radar-Diagramm + aufklappbare Bereiche | 11A | ⬜ OFFEN |
| 11-3 | Neue DB-Tabellen: life_area_snapshots + focus_area_changes | 11A | ⬜ OFFEN |
| 11-4 | Journal → Jahr: Ist-Stand + Schwerpunkt + Jahresvergleich | 11B | ⬜ OFFEN |
| 11-5 | Schwerpunktwechsel: Button + Pflichtnotiz + Speicherung | 11B | ⬜ OFFEN |
| 11-6 | Einstellungen bereinigen | 11C | ⬜ OFFEN |
| 6-1 | Lebensrad KI-Flow: 10/10-Vision pro Bereich erarbeiten | 6A | ⬜ OFFEN |
| 6-2 | Identität: KI leitet Affirmationen aus Lebensrad ab | 6B | ⬜ OFFEN |
| 6-3 | Jahresstart-Flow: Ist-Stand + Schwerpunkt mit KI-Unterstützung | 6B | ⬜ OFFEN |
| 6-4 | Identität täglich im Morgen/Abend | 6C | ⬜ OFFEN |
| 6-5 | Habit-KI: Bewertung + Vorschläge | 6D | ⬜ OFFEN |
| 6-6 | Coach: vollständiger Kontext (Vision, Ziele, Habits, Journal, Schwerpunkt) | 6E | ⬜ OFFEN |

---

## Wichtige Designentscheidungen

1. **Design-Richtung:** Modern, ruhig, aufgeräumt — Headspace-Stil. Keine grellen Farben, kein Orange/Gelb.
2. **PC-Layout:** Volle Breite nutzen.
3. **Handy-Layout:** Starr wie native App.
4. **Lebensbereiche:** 6 Bereiche mit je eigener Farbe, überall konsistent.
5. **Tab-Reihenfolge:** Dashboard · Journal · Übersicht · Coach · [Ich ab P11] · Einstellungen
6. **"Ich"-Tab:** Nur Lebensrad + Identität — Werte/Stopp-Liste/Ikigai deaktiviert.
7. **Übersicht:** Wird zum Tagebuch/Datenbankarchiv — Klick auf Tag öffnet alle Einträge.
8. **Ziele setzen:** Immer im Journal unter Planung — nicht im "Ich"-Tab.
9. **Habits:** Bleiben monatlich (nicht wöchentlich) — 4–6 Wochen Mindesteinheit.
10. **Login:** Magic Link vereinfachen oder durch PIN ersetzen.

---

## Archiv

**Paket 1–4 (alle Schritte) — April 2026 ✅**
Grundaufbau, Journal-System, Habit-Tracker, Übersicht, Ziele, Review.

**Paket 5 (alle 6 Schritte) — April 2026 ✅**
5A: Bug-Fixes + PWA Session.
5B: Ziel-Hierarchie UI.
5C: Vision-Umbenennung + Einstellungen neu strukturiert.
5D: KI-Ziel-Feedback mit FeedbackPanel, Cache, Rückfrage-Verlauf.

**Paket 7A + 7B + 7C (Schritte 1–10) — April 2026 ✅**
7-1: Tab-Wechsel Datenverlust — synchrones Schreiben in onChange-Handlern.
7-2: Abendjournal Datenverlust — Supabase-Eintrag beim Mount laden, Bearbeiten-Button.
7-3: Habits im Abendjournal — als Schritt 2 in EveningJournal-Flow integriert.
7-4: Vision-Bearbeiten-Loop — Inline-Textarea in Journal → Jahr und Einstellungen.
7-5: KI-Markdown-Rendering — ReactMarkdown in 6 Journal-Komponenten ergänzt.
7-6: Handy-Layout starr — interactive-widget=resizes-visual, height: 100dvh, overflow: hidden.
7-7: PC-Vollbreite — CSS Grid-Klassen in index.css, 2-Spalten-Layouts ab 1024px.
7-8: Zeitperioden-Logik — ISO-Woche, korrekte Perioden-Abschluss-Logik.
7-9: Tagesaufgaben → Wochenziel — Dropdown + Dashboard-Badge.
7-10: KI-Impuls Qualität — max_tokens 400, Vision/Identität/Wochenziele im Kontext.

**Paket 8A + 8B (Schritte 1–6) — April 2026 ✅**
8-1: Design-System + lifeAreas.ts — CSS-Variablen, 6 Lebensbereich-Farben.
8-2: Dashboard neu — Lebensrad-Miniatur (Placeholder), Motivationssprüche, 2-Spalten.
8-3: Journal neu — Pill-Tabs, Schlafscore-Slider, Energie-Labels.
8-4: Coach neu — Chat-Blasen, Modus-/Ton-Karten, 2-Spalten.
8-5: Übersicht neu — Card-Wrapper, 2-Spalten, Statistik-Kacheln 3-spaltig.
8-6: Einstellungen neu — CollapsibleSection mit Chevron-Box, Gefahrenzone-Trenner.
