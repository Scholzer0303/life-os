# CLAUDE.md — Life OS Entwicklungsregeln
# Liegt im Stammverzeichnis von Desktop/life-os/
# Claude Code liest diese Datei automatisch bei jedem Start.
# Zuletzt aktualisiert: 2026-04-09 (Lebensrad-Konzept, Zielstruktur, Datenkonsistenz)

---

## 0. LESEREIHENFOLGE BEIM SESSION-START

**Pflicht — in dieser Reihenfolge:**
1. VISION.md — Warum existiert die App, wie soll sie sich anfühlen
2. LIFE_OS_KONTEXT.md — Wo stehen wir, was ist offen
3. LIFE_OS_FEATURES.md — Was wird heute gebaut

Erst danach: `npm run dev` starten und loslegen.

---

## 1. PROJEKT-ÜBERBLICK

**App:** Life OS — Persönlicher KI-Mentor und Journal-PWA für Lukas
**Dev-Server:** http://localhost:5173 (oder 5174/5175 wenn Port belegt)
**Produktion:** https://life-os-henna-xi.vercel.app
**GitHub:** https://github.com/Scholzer0303/life-os (Branch: master)
**Stack:** React + TypeScript + Vite + Tailwind CSS v4 + Supabase + Anthropic Claude API
**Claude Model:** `claude-sonnet-4-6` — exakt so, kein anderer String

---

## 2. GOLDENE REGELN — NIEMALS BRECHEN

### 2.1 Verification Before Done
**Niemals einen Schritt als "fertig" markieren ohne Beweis dass er funktioniert.**

Nach JEDER Änderung:
1. `npm run build` — muss ohne Fehler durchlaufen
2. Den betroffenen Flow in der laufenden App manuell testen
3. Nur wenn beides passt: "Schritt X abgeschlossen" schreiben

### 2.2 Ein Schritt nach dem anderen
- Immer einen Teilschritt fertigstellen, testen, dann zum nächsten
- Nie mehrere Features gleichzeitig anfassen
- Nach jedem Teilschritt: kurze Beschreibung was gebaut wurde, dann auf "weiter" warten

### 2.3 Minimale Änderungen
- Nur das anfassen was nötig ist
- Keine "während ich hier bin"-Änderungen an anderen Dateien
- Keine ungefragten Refactorings

### 2.4 Fehler beheben, nicht verstecken
- Keine leeren try/catch ohne Fehlerausgabe
- Alle Supabase-Fehler: `console.error('Kontext:', error)` + UI-Fehlermeldung
- KI-Fehler (Anthropic API): NIEMALS rohen JSON anzeigen — immer lesbare Fehlermeldung
- Wenn etwas nicht funktioniert: stoppen und Lukas erklären — nicht weiterbauen

### 2.5 Vision vor Technik
Vor jeder Implementierungsentscheidung prüfen: Passt das zur VISION.md?
Wenn nein: Lukas fragen, nicht einfach umsetzen.

### 2.6 Lukas aktiv korrigieren
Lukas ist kein Entwickler. Wenn seine Anforderungen technisch falsch,
unnötig komplex oder mit besserer Methode lösbar sind:
→ Ansprechen, erklären, Alternative vorschlagen
→ Nicht blind umsetzen

### 2.7 Bestehende Daten schützen
Keine Supabase-Tabellen löschen. Keine bestehenden Daten vernichten.
Nur neue Tabellen/Spalten hinzufügen, bestehende umnutzen.
Code deaktivieren statt löschen.

### 2.8 Begriff: "Vision" nicht "Nordstern"
In der UI heißt es überall "Vision" oder "Meine Vision".
Der DB-Feldname `north_star` in der profiles-Tabelle bleibt unverändert bis Migration.

### 2.9 Design-Regeln (ab Paket 8)
- Orientierung: Modern, ruhig, aufgeräumt — ähnlich Headspace
- Kein Orange, kein Gelb als Hintergrund oder Primärfarbe
- Nicht kahl, nicht überladen — großzügige Abstände
- Texte gut lesbar, nicht zu klein, nicht zu groß
- PC: volle Bildschirmbreite nutzen (kein schmaler zentrierter Streifen)
- Mobile: App starr wie native App — keine Verschiebung beim Tippen
- Lebensbereiche: konsistente Farbkodierung überall (siehe Design-System Paket 8)

### 2.10 Datenkonsistenz — PFLICHT
**Änderungen und Löschungen wirken app-weit sofort.**
Es gibt keine lokalen Kopien von Daten. Alles läuft über Supabase als Single Source of Truth.
Wenn ein Datensatz gelöscht wird (z.B. Coach-Gespräch), verschwindet er überall gleichzeitig.
Bei jeder Implementierung prüfen: Gibt es andere Stellen in der App die diese Daten anzeigen?
Falls ja: sicherstellen dass Änderungen dort ebenfalls ankommen.

---

## 3. ARCHITEKTUR-REGELN

### 3.1 Datei-Verantwortlichkeiten
```
src/lib/db.ts         → ALLE Supabase-Operationen (kein direktes Supabase in Komponenten)
src/lib/claude.ts     → ALLE Claude-API-Aufrufe
src/types/index.ts    → Neue Interfaces und Types
src/store/useStore.ts → Globaler State (Zustand)
```

### 3.2 Seitenstruktur
```
src/pages/
  Dashboard.tsx       → aktiv
  Journal.tsx         → Herzstück, Tab-Navigation Tag/Woche/Monat/Quartal/Jahr
  Coach.tsx           → aktiv, erhält in Paket 6 vollständigen Kontext
  Overview.tsx        → aktiv (Kalender als Tagebuch + Habit-Grid + Metriken)
  Me.tsx              → NEU in Paket 11: Lebensrad + Identität/Affirmationen
  Settings.tsx        → aktiv, wird in Paket 11 bereinigt
  Goals.tsx           → deaktiviert (Code bleibt)
  Review.tsx          → deaktiviert (Code bleibt)

src/components/journal/
  JournalDay.tsx          → Tag: Morgen + Abend
  JournalWeek.tsx         → Woche: Planung (Wochenziele) + Reflexion
  JournalMonth.tsx        → Monat: Planung (Monatsziele + Habits) + Reflexion
  JournalQuarter.tsx      → Quartal: Planung (Quartalsziele) + Reflexion
  JournalYear.tsx         → Jahr: Planung (Ist-Stand + Jahresziele + Schwerpunkt) + Reflexion

src/components/overview/
  OverviewCalendar.tsx    → Kalender-Monatsansicht, Klick öffnet Tages-Archiv
  DayArchive.tsx          → NEU: alle Einträge eines Tages als Archiv-Ansicht
  HabitGrid.tsx           → Habit-Grid
  MetricChart.tsx         → Metriken-Charts

src/components/me/
  LifeWheel.tsx           → NEU in Paket 11: Radar-Diagramm 6 Lebensbereiche
  LifeAreaDetail.tsx      → NEU in Paket 11: aufgeklappter Bereich mit Vision + Jahresziel

src/components/vision/
  VisionFlow.tsx          → NEU in Paket 6: geführter Lebensrad-KI-Flow
```

### 3.3 Navigation (aktuelle Reihenfolge)
```
Aktuell (Pakete 7–10): Dashboard · Journal · Übersicht · Coach · Einstellungen
Ab Paket 11:           Dashboard · Journal · Übersicht · Coach · Ich · Einstellungen
```

### 3.4 Supabase-Calls — Pflichtregeln
```typescript
// IMMER: user_id Filter
const { data, error } = await supabase
  .from('tabelle')
  .select('*')
  .eq('user_id', userId);

// IMMER: Fehlerprüfung
if (error) throw error;

// Journal-Einträge: UPSERT statt INSERT
await supabase
  .from('journal_entries')
  .upsert({ ...data, user_id: userId }, { onConflict: 'user_id,entry_date,type' });
```

### 3.5 Wichtige Feldnamen (falsche Namen = 400 Bad Request)
```
journal_entries:
  ✅ main_goal_today     ✅ what_blocked       ✅ entry_date
  ✅ feeling_score       ✅ calendar_planned   ✅ gratitude
  ✅ weight              ✅ sleep_score
  ✅ identity_check      ✅ identity_note      (NEU in Paket 6B)
  ✅ next_day_tasks      (JSON-Array, NEU in Paket 9A)

goals:
  ✅ type: 'year' | 'quarterly' | 'monthly' | 'weekly'
  ✅ parent_id (UUID, nullable) — Pflicht für quarterly/monthly, optional für weekly
  ✅ life_area: 'body_mind' | 'social' | 'love' | 'finance' | 'career' | 'meaning'
  ✅ max_count_rule: Jahr=1, Quartal=2, Monat=2, Woche=3 pro life_area

habits:
  ✅ frequency_type: 'daily' | 'weekly'
  ✅ frequency_value: INT (1–7, relevant bei 'weekly')
  ✅ month, year (INT)

profiles:
  ✅ north_star (text) — UI-Label: "Vision" (NICHT "Nordstern") — wird zu life_areas migriert
  ✅ life_areas (jsonb) — NEU in Paket 11: Vision pro Lebensbereich
  ✅ identity_statement (text)
  ✅ ai_profile (jsonb)
  ✅ ikigai (jsonb) — deaktiviert in UI, Daten bleiben

journal_periods:
  ✅ period_type: 'week' | 'month' | 'quarter' | 'year'
  ✅ period_key: z.B. '2026-W15', '2026-04', '2026-Q2', '2026'

life_area_snapshots (NEU in Paket 11):
  ✅ user_id, year (INT), scores (jsonb), notes (jsonb), created_at
  — speichert Jahresbeginn- und Jahresende-Ist-Stand pro Jahr

focus_area_changes (NEU in Paket 11):
  ✅ user_id, changed_at, old_areas (jsonb), new_areas (jsonb), reason (text)
  — speichert jeden Schwerpunktwechsel mit Begründung
```

---

## 4. TAILWIND CSS v4 REGELN

- Immer eine existierende Komponente als Vorlage nehmen
- Nie Klassen raten — im Zweifel inline style verwenden
- `@apply` nicht verwenden

---

## 5. SUPABASE-BESONDERHEITEN

### 5.1 Bestehende Tabellen (nicht löschen!)
`profiles`, `goals`, `journal_entries`, `coach_sessions`, `pattern_events`,
`goal_tasks`, `recurring_blocks`, `recurring_block_exceptions`,
`habits`, `habit_logs`, `journal_periods`

### 5.2 Neue Tabellen (ab Paket 11)
`life_area_snapshots` — Jahres-Ist-Stände pro Bereich
`focus_area_changes` — Schwerpunktwechsel-Log

### 5.3 SQL-Migration Workflow
Claude Code identifiziert → SQL ausgeben → auf Lukas' "weiter" warten →
Lukas führt manuell im Supabase SQL Editor aus → bestätigt → Claude Code testet

### 5.4 journal_entries Unique Constraint
```sql
UNIQUE (user_id, entry_date, type)
```

---

## 6. ZIELSTRUKTUR-REGELN — PFLICHT

```
Pro Lebensbereich (life_area) gelten folgende Limits:
  Jahr:    max. 1 Ziel
  Quartal: max. 2 Ziele (müssen einem Jahresziel zugeordnet sein — Pflicht)
  Monat:   max. 2 Ziele (müssen einem Quartalsziel zugeordnet sein — Pflicht)
  Woche:   max. 3 Ziele (können einem Monatsziel zugeordnet sein — optional)
  Tag:     max. 4 Aufgaben gesamt (können einem Wochenziel zugeordnet sein — optional)
```

Beim Erstellen eines Ziels:
- Lebensbereich (life_area) ist Pflichtfeld
- Für quarterly/monthly: parent_id Pflicht — UI zeigt nur passende übergeordnete Ziele an
- Limit-Prüfung vor dem Speichern: wenn Limit erreicht → klare UI-Meldung, kein Speichern
- Hinweisbanner beim Ziel-Erstellen: "Formuliere dein Ziel konkret und messbar"

Schwerpunktbereiche:
- Werden in profiles.ai_profile oder separatem Feld gespeichert
- Änderung nur über dedizierten Button im Journal → Jahr → Planung
- Bei Änderung: Pflichtnotiz + Datum → in focus_area_changes speichern

---

## 7. KI-FEHLERBEHANDLUNG — PFLICHT

Jeder Claude-API-Aufruf muss Fehler sauber abfangen:
```typescript
try {
  const response = await callClaude(prompt);
  // ...
} catch (error) {
  // NIEMALS rohen JSON/Error-Objekt anzeigen
  setErrorMessage('KI momentan nicht verfügbar — bitte erneut versuchen.');
  console.error('Claude API Fehler:', error);
}
```

KI-Antworten IMMER mit react-markdown rendern — niemals rohen Text mit ** oder # anzeigen.
Gilt für: Mentor-Impuls, KI-Zusammenfassungen, Ziel-Feedback, Vision-Flow,
Identitäts-Flow, Habit-Vorschläge, Coach.

---

## 8. DEPLOYMENT

```bash
npm run build   # lokal testen — muss fehlerfrei sein
# Nur am SESSION-ENDE:
git add -A && git commit -m "feat: [was]" && git push origin master
```

**Niemals pushen wenn Build Fehler wirft. Niemals mitten in einer Session pushen.**

---

## 9. NPM BESONDERHEITEN

```bash
npm install [paket] --legacy-peer-deps   # IMMER diesen Flag
```

---

## 10. KOMMUNIKATION MIT LUKAS

- Alles auf Deutsch erklären
- Nach jedem Teilschritt: kurze Beschreibung, dann warten
- Bei Fehlern: erklären WAS der Fehler bedeutet
- "Fertig" = gebaut UND getestet UND funktioniert
- Aktiv korrigieren wenn Anforderungen besser lösbar sind

---

## 11. KONTEXT-LOGBUCH — AUTOMATISCHE PFLICHT

LIFE_OS_KONTEXT.md wird nach JEDEM abgeschlossenen Schritt aktualisiert.
"Abgeschlossen" = Code ✓ + Build fehlerfrei ✓ + App getestet ✓

---

## 12. SESSION-START CHECKLISTE

1. VISION.md lesen
2. LIFE_OS_KONTEXT.md lesen
3. LIFE_OS_FEATURES.md lesen
4. Dev-Server selbst starten: `npm run dev` im Projektverzeichnis ausführen (Bash-Tool)
   → Den genutzten Port ausgeben (5173 / 5174 / 5175 je nach Verfügbarkeit)
   → Lukas braucht keinen separaten PowerShell-Tab mehr
5. Erst dann mit erstem Schritt anfangen

---

## 13. DATEI-ÜBERSICHT

| Datei | Zweck | Wer aktualisiert |
|---|---|---|
| `VISION.md` | Warum + für wen + wie es sich anfühlen soll | Lukas manuell (selten) |
| `CLAUDE.md` | Regeln, Architektur, Feldnamen | Lukas manuell (selten) |
| `LIFE_OS_KONTEXT.md` | Aktiver Stand + Ausstehend + Archiv | Claude Code nach jedem Schritt |
| `LIFE_OS_FEATURES.md` | Genaue Spezifikation aller Schritte | Claude Code markiert erledigte als ✅ |
