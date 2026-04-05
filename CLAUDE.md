# CLAUDE.md — Life OS Entwicklungsregeln
# Diese Datei liegt im Stammverzeichnis von Desktop/life-os/
# Claude Code liest sie automatisch bei jedem Start.

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
1. `npm run build` ausführen — muss ohne Fehler durchlaufen
2. Den betroffenen Flow in der laufenden App manuell testen
3. Nur wenn beides passt: "Schritt X abgeschlossen" schreiben

### 2.2 Ein Schritt nach dem anderen
- Immer einen Teilschritt fertigstellen, testen, dann zum nächsten
- Nie mehrere Features gleichzeitig anfassen
- Nach jedem Teilschritt kurz beschreiben was gebaut wurde und auf "weiter" warten

### 2.3 Minimale Änderungen
- Nur das anfassen was nötig ist
- Keine "während ich hier bin"-Änderungen an anderen Dateien
- Keine ungefragten Refactorings

### 2.4 Fehler beheben, nicht verstecken
- Keine leeren try/catch ohne Fehlerausgabe
- Alle Supabase-Fehler: `console.error('Kontext:', error)` + UI-Fehlermeldung
- Wenn etwas nicht funktioniert: stoppen und dem User erklären — nicht weiterbauen

---

## 3. ARCHITEKTUR-REGELN

### 3.1 Datei-Verantwortlichkeiten
```
src/lib/db.ts        → ALLE Supabase-Operationen (kein direktes Supabase in Komponenten)
src/lib/claude.ts    → ALLE Claude-API-Aufrufe
src/types/index.ts   → Neue Interfaces und Types
src/store/useStore.ts → Globaler State (Zustand)
```

### 3.2 Supabase-Calls — Pflichtregeln
```typescript
// IMMER: user_id Filter
const { data, error } = await supabase
  .from('tabelle')
  .select('*')
  .eq('user_id', userId);  // NIEMALS vergessen

// IMMER: Fehlerprüfung
if (error) throw error;

// Journal-Einträge: UPSERT statt INSERT
// (ein Eintrag pro Tag und Typ — kein Duplikat-Fehler 409)
await supabase
  .from('journal_entries')
  .upsert({ ...data, user_id: userId }, { onConflict: 'user_id,entry_date,type' });
```

### 3.3 Wichtige Feldnamen (Fallstricke — falsche Namen = 400 Bad Request)
```
journal_entries:
  ✅ main_goal_today     (NICHT morning_goal)
  ✅ what_blocked        (NICHT blockers)
  ✅ entry_date          (NICHT created_at für das Datum)
  ✅ feeling_score       (1-10, NICHT 1-5)

goals:
  ✅ type-Werte: 'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'
  ✅ parent_id           (UUID, nullable)

profiles:
  ✅ ai_profile          (jsonb)
  ✅ identity_statement  (text)
  ✅ ikigai              (jsonb: {loves, good_at, paid_for, world_needs, synthesis})
```

---

## 4. TAILWIND CSS v4 REGELN

Tailwind v4 hat eine andere Syntax als v3. Vor dem Schreiben neuer Klassen:
- Immer eine existierende Komponente als Vorlage nehmen
- Nie Klassen raten — im Zweifel inline style verwenden
- `@apply` funktioniert anders — nicht verwenden

---

## 5. SUPABASE-BESONDERHEITEN

### 5.1 goal_type Enum
Neue Werte müssen explizit hinzugefügt werden:
```sql
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'year';
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'three_year';
```
Wenn `400 Bad Request` beim Ziele-Speichern → zuerst diese Migration prüfen.

### 5.2 journal_entries Unique Constraint
Für UPSERT muss dieser Constraint existieren (bereits angelegt):
```sql
ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_user_date_type_unique
  UNIQUE (user_id, entry_date, type);
```

### 5.3 Bestehende Supabase-Tabellen
`profiles`, `goals`, `journal_entries`, `coach_sessions`, `pattern_events`, `goal_tasks`, `recurring_blocks`, `recurring_block_exceptions`
Row Level Security ist auf allen Tabellen aktiv.

---

## 6. DEPLOYMENT

```bash
# Lokal testen BEVOR push
npm run build   # muss fehlerfrei sein

# Nur wenn build erfolgreich:
git add -A
git commit -m "fix: [was wurde geändert]"
git push origin master
# → Vercel deployed automatisch
```

**Niemals pushen wenn `npm run build` Fehler wirft.**

---

## 7. NPM BESONDERHEITEN

```bash
npm install [paket] --legacy-peer-deps   # IMMER diesen Flag verwenden
```

---

## 8. KOMMUNIKATION MIT DEM USER

- Lukas ist kein Entwickler — alles auf Deutsch erklären
- Nach jedem Teilschritt: kurze Beschreibung was gebaut wurde
- Bei Fehlern: erklären WAS der Fehler bedeutet, nicht nur technische Details
- Niemals mehr als einen Teilschritt auf einmal bauen
- "Fertig" bedeutet: gebaut UND getestet UND funktioniert

---

## 9. DEPLOYMENT-HINWEIS

Auto-Deploy: Jeder Push auf `master` → Vercel baut und deployed automatisch.
Supabase Redirect URLs: localhost:5173 und https://life-os-henna-xi.vercel.app sind eingetragen.

---

## 10. KONTEXT-LOGBUCH — AUTOMATISCHE PFLICHT

**LIFE_OS_KONTEXT.md ist das Gedächtnis des Projekts. Es wird nach JEDEM abgeschlossenen Schritt aktualisiert — ohne dass Lukas danach fragen muss.**

### Was "abgeschlossen" bedeutet:
- Code geschrieben ✓
- `npm run build` fehlerfrei ✓
- Funktion in der App getestet und funktioniert ✓

### Was in die Aktualisierung gehört:
Nach jedem Schritt wird in LIFE_OS_KONTEXT.md eingetragen:
- Welcher Schritt abgeschlossen wurde (✅ + Datum)
- Welche Dateien geändert wurden
- Ob es offene Punkte gibt

In LIFE_OS_FEATURES.md wird der erledigte Punkt als `✅ UMGESETZT (Datum)` markiert.

### Verschlankungs-Regel (WICHTIG):
LIFE_OS_KONTEXT.md darf den aktiven Bereich ("Ausstehend") nie zu groß werden lassen.
Nach Abschluss eines Pakets gilt:
- Alle ✅ erledigten Schritte aus dem "Ausstehend"-Bereich entfernen
- Stattdessen nur eine einzeilige Zusammenfassung in den "Archiv"-Block unten eintragen
- Oben im Dokument steht immer nur: aktueller App-Stand + was als nächstes kommt
- Ziel: Der aktive Bereich (alles außer Archiv) bleibt kompakt — nur was Claude Code für die aktuelle Session wirklich braucht

### Warum das wichtig ist:
Lukas lädt LIFE_OS_KONTEXT.md nach jeder Session ins Claude Project hoch.
Ein zu langes Dokument kostet Token und erhöht Fehlerrisiko.
Ein nicht aktualisiertes Logbuch = die nächste Session fängt blind an.

---

## 11. SESSION-START CHECKLISTE

Beim Start jeder neuen Claude Code Session:
1. `LIFE_OS_KONTEXT.md` lesen — aktuellen Stand + offene Punkte verstehen
2. `LIFE_OS_FEATURES.md` lesen — genaue Spezifikation für den aktuellen Schritt
3. `npm run dev` — Dev-Server starten falls nicht läuft
4. Aktuellen Status im Browser prüfen
5. Erst dann mit dem ersten Schritt anfangen

---

## 12. DATEI-ÜBERSICHT

| Datei | Zweck | Wer aktualisiert sie |
|---|---|---|
| `CLAUDE.md` | Regeln, Architektur, Feldnamen — ändert sich selten | Lukas manuell |
| `LIFE_OS_KONTEXT.md` | Aktiver Stand + Ausstehend + kompaktes Archiv | Claude Code nach jedem Schritt |
| `LIFE_OS_FEATURES.md` | Genaue Spezifikation aller Schritte im aktuellen Paket | Claude Code markiert erledigte als ✅ |
