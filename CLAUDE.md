# CLAUDE.md — Life OS Entwicklungsregeln
# Liegt im Stammverzeichnis von Desktop/life-os/
# Claude Code liest diese Datei automatisch bei jedem Start.
# Zuletzt aktualisiert: 2026-04-07 (Paket 4 — Journal als Herzstück)

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
Beim großen Umbau (Paket 4): Keine Supabase-Tabellen löschen.
Keine bestehenden Daten vernichten. Nur neue Tabellen/Spalten hinzufügen,
bestehende umnutzen. Code deaktivieren statt löschen.

---

## 3. ARCHITEKTUR-REGELN

### 3.1 Datei-Verantwortlichkeiten
```
src/lib/db.ts         → ALLE Supabase-Operationen (kein direktes Supabase in Komponenten)
src/lib/claude.ts     → ALLE Claude-API-Aufrufe
src/types/index.ts    → Neue Interfaces und Types
src/store/useStore.ts → Globaler State (Zustand)
```

### 3.2 Neue Seitenstruktur (Paket 4)
```
src/pages/
  Dashboard.tsx       → bleibt weitgehend wie jetzt
  Journal.tsx         → NEU: Herzstück, Tab-Navigation Tag/Woche/Monat/Quartal/Jahr
  Coach.tsx           → bleibt, erhält mehr Kontext
  Overview.tsx        → NEU: Kalender + Habit-Grid + Metriken-Visualisierung
  Settings.tsx        → bleibt, Profil-Bereiche einzeln bearbeitbar

src/components/journal/
  JournalDay.tsx          → Tag: Morgen + Abend (Inhalt aus altem MorningJournal/EveningJournal)
  JournalWeek.tsx         → Woche: Planung + Reflexion
  JournalMonth.tsx        → Monat: Planung (Ziele + Habits) + Reflexion
  JournalQuarter.tsx      → Quartal: Planung + Reflexion
  JournalYear.tsx         → Jahr: Planung (Nordstern + Jahresziel) + Reflexion

src/components/habits/
  HabitManager.tsx        → Habits anlegen/bearbeiten/löschen
  HabitChecklist.tsx      → Abendjournal: Habits abhaken
  HabitGrid.tsx           → Monatsübersicht: Grid aller Habits × Tage

src/components/overview/
  OverviewCalendar.tsx    → Kalender-Monatsansicht
  OverviewStats.tsx       → Monatsstatistiken-Kacheln
  MetricChart.tsx         → Kurven: Energie / Gewicht / Schlaf
```

### 3.3 Supabase-Calls — Pflichtregeln
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

### 3.4 Wichtige Feldnamen (falsche Namen = 400 Bad Request)
```
journal_entries:
  ✅ main_goal_today     ✅ what_blocked       ✅ entry_date
  ✅ feeling_score       ✅ calendar_planned   ✅ gratitude
  ✅ weight              ✅ sleep_score

goals:
  ✅ type: 'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'
  ✅ parent_id (UUID, nullable)

habits:
  ✅ frequency_type: 'daily' | 'weekly'
  ✅ frequency_value: INT (1–7, relevant bei 'weekly')
  ✅ month, year (INT)

profiles:
  ✅ ai_profile (jsonb)
  ✅ identity_statement (text)
  ✅ ikigai (jsonb)
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
`habits`, `habit_logs`

### 5.2 Neue Tabellen in Paket 4
```
journal_periods   → Planung + Reflexion für Woche/Monat/Quartal/Jahr
                    (period_type: 'week'|'month'|'quarter'|'year', period_key: z.B. '2026-W15')
```

### 5.3 SQL-Migration Workflow
Claude Code identifiziert → Lukas führt manuell im Supabase SQL Editor aus → bestätigt → Claude Code testet

### 5.4 journal_entries Unique Constraint
```sql
UNIQUE (user_id, entry_date, type)
```

---

## 6. DEPLOYMENT

```bash
npm run build   # lokal testen — muss fehlerfrei sein
# Nur am SESSION-ENDE:
git add -A && git commit -m "feat: [was]" && git push origin master
```

**Niemals pushen wenn Build Fehler wirft. Niemals mitten in einer Session pushen.**

---

## 7. NPM BESONDERHEITEN

```bash
npm install [paket] --legacy-peer-deps   # IMMER diesen Flag
```

---

## 8. KOMMUNIKATION MIT LUKAS

- Alles auf Deutsch erklären
- Nach jedem Teilschritt: kurze Beschreibung, dann warten
- Bei Fehlern: erklären WAS der Fehler bedeutet
- "Fertig" = gebaut UND getestet UND funktioniert
- Aktiv korrigieren wenn Anforderungen besser lösbar sind

---

## 9. KONTEXT-LOGBUCH — AUTOMATISCHE PFLICHT

LIFE_OS_KONTEXT.md wird nach JEDEM abgeschlossenen Schritt aktualisiert.
"Abgeschlossen" = Code ✓ + Build fehlerfrei ✓ + App getestet ✓

---

## 10. SESSION-START CHECKLISTE

1. VISION.md lesen
2. LIFE_OS_KONTEXT.md lesen
3. LIFE_OS_FEATURES.md lesen
4. PowerShell-Befehl ausgeben: `cd Desktop/life-os && npm run dev`
5. Status im Browser prüfen
6. Erst dann mit erstem Schritt anfangen

---

## 11. DATEI-ÜBERSICHT

| Datei | Zweck | Wer aktualisiert |
|---|---|---|
| `VISION.md` | Warum + für wen + wie es sich anfühlen soll | Lukas manuell (selten) |
| `CLAUDE.md` | Regeln, Architektur, Feldnamen | Lukas manuell (selten) |
| `LIFE_OS_KONTEXT.md` | Aktiver Stand + Ausstehend + Archiv | Claude Code nach jedem Schritt |
| `LIFE_OS_FEATURES.md` | Genaue Spezifikation aller Schritte | Claude Code markiert erledigte als ✅ |
