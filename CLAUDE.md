# CLAUDE.md — Life OS Entwicklungsregeln
# Diese Datei liegt im Stammverzeichnis von Desktop/life-os/
# Claude Code liest sie automatisch bei jedem Start.

---

## 1. PROJEKT-ÜBERBLICK

**App:** Life OS — Persönlicher KI-Mentor und Journal-PWA für Lukas
**Dev-Server:** http://localhost:5174
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

## 5. BEKANNTE BUGS (Stand: April 2026)

Diese Bugs existieren und müssen behoben werden bevor neue Features gebaut werden:

| Bug | Fehler | Ursache | Fix |
|-----|--------|---------|-----|
| Journal speichern | 409 Conflict | INSERT statt UPSERT | `upsert()` mit onConflict |
| Ziele speichern | 400 Bad Request | goal.type Enum-Mismatch | SQL-Migration prüfen |
| Coach startet nicht | Kein Fehler, keine Reaktion | onClick-Handler defekt | Handler debuggen |
| Vercel Deployment | Build failed | TypeScript-Fehler im Build | `npm run build` lokal testen |

---

## 6. SUPABASE-BESONDERHEITEN

### 6.1 goal_type Enum
Die Datenbank hat möglicherweise `goal_type` als Enum — neue Werte müssen explizit hinzugefügt werden:
```sql
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'year';
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'three_year';
```
Wenn `400 Bad Request` beim Ziele-Speichern → zuerst diese Migration in Supabase SQL Editor prüfen.

### 6.2 journal_entries Unique Constraint
Für UPSERT muss ein Unique Constraint existieren:
```sql
ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_user_date_type_unique
  UNIQUE (user_id, entry_date, type);
```
Wenn dieser fehlt → 409-Fehler ist nicht behebbar ohne diesen Constraint.

---

## 7. DEPLOYMENT

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

## 8. NPM BESONDERHEITEN

```bash
npm install [paket] --legacy-peer-deps   # IMMER diesen Flag verwenden
```

---

## 9. KOMMUNIKATION MIT DEM USER

- Lukas ist kein Entwickler — alles auf Deutsch erklären
- Nach jedem Teilschritt: kurze Beschreibung was gebaut wurde
- Bei Fehlern: erklären WAS der Fehler bedeutet, nicht nur technische Details
- Niemals mehr als einen Teilschritt auf einmal bauen
- "Fertig" bedeutet: gebaut UND getestet UND funktioniert

---

## 10. KONTEXT-LOGBUCH — AUTOMATISCHE PFLICHT

**LIFE_OS_KONTEXT.md ist das Gedächtnis des Projekts. Es wird nach JEDEM abgeschlossenen Schritt aktualisiert — ohne dass Lukas danach fragen muss.**

### Was "abgeschlossen" bedeutet:
- Code geschrieben ✓
- `npm run build` fehlerfrei ✓
- Funktion in der App getestet und funktioniert ✓

### Was in die Aktualisierung gehört:

```
### ✅ [Schrittname] — [Datum]
**Was gebaut wurde:**
- [konkrete Beschreibung der Änderung]
- [welche Dateien wurden geändert]
- [welche Bugs wurden behoben]

**Getestet:**
- [was wurde getestet und hat funktioniert]

**Offene Punkte / Bekannte Einschränkungen:**
- [falls vorhanden]
```

### Format für Bug-Fixes:
```
**Bug behoben:** [Bug-Name]
- Fehler war: [Fehlermeldung]
- Ursache: [was war kaputt]
- Fix: [was wurde geändert, in welcher Datei]
- Getestet: [wie bestätigt]
```

### Wo eintragen:
- Unter dem Abschnitt "Fertige Schritte" — neueste Einträge oben
- Den "Zuletzt aktualisiert"-Timestamp am Anfang der Datei updaten
- Offene Bugs aus Abschnitt 5 (CLAUDE.md) als erledigt markieren wenn behoben

### Warum das wichtig ist:
Lukas lädt LIFE_OS_KONTEXT.md nach jeder Session in sein Claude Project hoch.
So weiß die nächste Session exakt wo wir aufgehört haben — ohne dass etwas verloren geht.
Ein nicht aktualisiertes Logbuch = die nächste Session fängt blind an = Fehler wiederholen sich.

---

## 11. SESSION-START CHECKLISTE

Beim Start jeder neuen Claude Code Session:
1. `LIFE_OS_KONTEXT.md` lesen — aktuellen Stand verstehen
2. `npm run dev` — Dev-Server starten falls nicht läuft
3. Aktuellen Status im Browser prüfen: http://localhost:5174
4. Erst dann mit dem gewünschten Schritt anfangen
