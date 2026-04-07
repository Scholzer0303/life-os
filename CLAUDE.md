# CLAUDE.md — Life OS Entwicklungsregeln
# Liegt im Stammverzeichnis von Desktop/life-os/
# Claude Code liest diese Datei automatisch bei jedem Start.
# Zuletzt aktualisiert: 2026-04-07

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

---

## 3. ARCHITEKTUR-REGELN

### 3.1 Datei-Verantwortlichkeiten
```
src/lib/db.ts         → ALLE Supabase-Operationen (kein direktes Supabase in Komponenten)
src/lib/claude.ts     → ALLE Claude-API-Aufrufe
src/types/index.ts    → Neue Interfaces und Types
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
await supabase
  .from('journal_entries')
  .upsert({ ...data, user_id: userId }, { onConflict: 'user_id,entry_date,type' });
```

### 3.3 Wichtige Feldnamen (falsche Namen = 400 Bad Request)
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

Tailwind v4 hat eine andere Syntax als v3:
- Immer eine existierende Komponente als Vorlage nehmen
- Nie Klassen raten — im Zweifel inline style verwenden
- `@apply` nicht verwenden

---

## 5. SUPABASE-BESONDERHEITEN

### 5.1 goal_type Enum
```sql
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'year';
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'three_year';
```
Bei `400 Bad Request` beim Ziele-Speichern → zuerst diese Migration prüfen.

### 5.2 journal_entries Unique Constraint
```sql
ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_user_date_type_unique
  UNIQUE (user_id, entry_date, type);
```

### 5.3 Bestehende Tabellen
`profiles`, `goals`, `journal_entries`, `coach_sessions`, `pattern_events`,
`goal_tasks`, `recurring_blocks`, `recurring_block_exceptions`
Row Level Security aktiv auf allen Tabellen.

---

## 6. DEPLOYMENT

```bash
# Lokal testen BEVOR push
npm run build   # muss fehlerfrei sein

# Nur wenn build erfolgreich — und erst am SESSION-ENDE:
git add -A
git commit -m "feat: [was wurde gebaut]"
git push origin master
# → Vercel deployed automatisch
```

**Niemals pushen wenn `npm run build` Fehler wirft.**
**Niemals mitten in einer Session pushen — immer erst am Ende.**

---

## 7. NPM BESONDERHEITEN

```bash
npm install [paket] --legacy-peer-deps   # IMMER diesen Flag verwenden
```

---

## 8. KOMMUNIKATION MIT LUKAS

- Lukas ist kein Entwickler — alles auf Deutsch erklären
- Nach jedem Teilschritt: kurze Beschreibung was gebaut wurde, dann warten
- Bei Fehlern: erklären WAS der Fehler bedeutet, nicht nur technische Details
- Nie mehr als einen Teilschritt auf einmal bauen
- "Fertig" = gebaut UND getestet UND funktioniert
- Wenn Lukas eine Anforderung stellt die besser lösbar ist: sagen und erklären

---

## 9. KONTEXT-LOGBUCH — AUTOMATISCHE PFLICHT

LIFE_OS_KONTEXT.md ist das Gedächtnis des Projekts.
**Wird nach JEDEM abgeschlossenen Schritt aktualisiert — ohne dass Lukas danach fragt.**

"Abgeschlossen" bedeutet: Code ✓ + Build fehlerfrei ✓ + App getestet ✓

Nach jedem Schritt:
- LIFE_OS_KONTEXT.md: Schritt als ✅ + Datum eintragen, geänderte Dateien notieren
- LIFE_OS_FEATURES.md: Erledigten Punkt als `✅ UMGESETZT (Datum)` markieren

**Verschlankungs-Regel:**
Nach Abschluss eines Pakets: alle ✅ aus "Ausstehend" entfernen, nur Einzeiler ins Archiv.
Ziel: aktiver Bereich bleibt kompakt — nur was für die aktuelle Session relevant ist.

---

## 10. SESSION-START CHECKLISTE

1. VISION.md lesen
2. LIFE_OS_KONTEXT.md lesen — aktuellen Stand verstehen
3. LIFE_OS_FEATURES.md lesen — Spezifikation für aktuellen Schritt
4. PowerShell-Befehl an Lukas ausgeben:
   ```powershell
   cd Desktop/life-os
   npm run dev
   ```
5. Aktuellen Status im Browser prüfen
6. Erst dann mit dem ersten Schritt anfangen

---

## 11. DATEI-ÜBERSICHT

| Datei | Zweck | Wer aktualisiert |
|---|---|---|
| `VISION.md` | Warum + für wen + wie es sich anfühlen soll | Lukas manuell (selten) |
| `CLAUDE.md` | Regeln, Architektur, Feldnamen | Lukas manuell (selten) |
| `LIFE_OS_KONTEXT.md` | Aktiver Stand + Ausstehend + Archiv | Claude Code nach jedem Schritt |
| `LIFE_OS_FEATURES.md` | Genaue Spezifikation aller Schritte | Claude Code markiert erledigte als ✅ |
