# LIFE_OS_PHASE2_BRIEFING.md
# Vollständiges Entwicklungs-Briefing — Phase 2
# Version 2.0 — erstellt 2026-04-03
# =====================================================
# FÜR CLAUDE CODE: LIES DIESE DATEI KOMPLETT DURCH
# BEVOR DU EINE EINZIGE ZEILE CODE SCHREIBST.
# =====================================================

---

## DEINE AUFGABE

Du vervollständigst die Life OS App. Die Basis (Schritte 1–14) ist fertig und live.
Du baust jetzt Phase 2: 6 Schritte, die die ursprüngliche Vision vervollständigen.

**Bevor du mit Schritt 15 beginnst, tue Folgendes:**
1. Lese `LIFE_OS_KONTEXT.md` — vollständiger Überblick über was bereits gebaut wurde
2. Lese `src/App.tsx` — um die Routing-Struktur und AuthGuard zu verstehen
3. Lese `src/lib/db.ts` — um existierende DB-Funktionen zu kennen (nicht doppelt bauen)
4. Lese `src/lib/claude.ts` — um existierende KI-Funktionen zu kennen
5. Lese `src/pages/Goals.tsx` — für Schritt 17 (Ziel-Hierarchie-Erweiterung)
6. Lese alle Dateien in `src/components/onboarding/` — um die Struktur zu verstehen bevor du neue Steps einfügst
7. Lese `src/pages/Onboarding.tsx` — wie die Steps orchestriert werden (totalSteps, currentStep)

Erst nach diesem Lese-Durchlauf anfangen zu bauen.

**Goldene Regel:** Ein Teilschritt nach dem anderen. Nach jedem Teilschritt (15A, 15B…) sagst du kurz was gebaut wurde und wartest auf "weiter" bevor du zum nächsten gehst. Aktualisiere `LIFE_OS_KONTEXT.md` automatisch nach jedem vollständig abgeschlossenen Hauptschritt.

---

## TECH STACK (bereits installiert — nichts neu installieren)

- React + TypeScript + Vite
- Tailwind CSS v4 (Syntax weicht von v3 ab — nutze existierende Klassen als Referenz, nie raten)
- Supabase PostgreSQL — alle Tabellen existieren
- Anthropic Claude API, Model: `claude-sonnet-4-6` (exakt so, kein anderer Model-String)
- Zustand (State), Framer Motion (Animationen), React Router
- Falls doch ein neues Package nötig: `npm install [package] --legacy-peer-deps`

---

## DATEISTRUKTUR (Stand nach Schritt 14)

```
src/
├── components/
│   ├── ui/                  (Button, Modal, etc.)
│   ├── journal/             MorningJournal.tsx, EveningJournal.tsx, FreeformJournal.tsx, AIFeedbackCard.tsx
│   ├── goals/               GoalCard.tsx, GoalDetailCard.tsx, GoalSheet.tsx
│   └── onboarding/          Step1.tsx bis Step7.tsx (7 Schritte)
│       Step1 = Willkommen + Name
│       Step2 = Lebensrad (Spider-Web SVG)
│       Step3 = Werte-Radar (12 Karten, Top-5)
│       Step4 = 5-Warum-Kette (Claude API)
│       Step5 = Nordstern (KI-Zusammenfassung)
│       Step6 = Stopp-Liste
│       Step7 = Erstes Quartalsziel
├── pages/
│   ├── Login.tsx
│   ├── Onboarding.tsx       (orchestriert Step1–Step7, enthält totalSteps und currentStep State)
│   ├── Dashboard.tsx
│   ├── Journal.tsx
│   ├── Goals.tsx
│   ├── Coach.tsx
│   └── Review.tsx
├── lib/
│   ├── supabase.ts
│   ├── claude.ts            (KI-Wrapper-Funktionen)
│   ├── db.ts                (alle CRUD-Funktionen — lies diese Datei bevor du neue Funktionen ergänzt)
│   └── utils.ts
├── store/
│   └── useStore.ts          (Zustand Global State)
└── types/
    ├── index.ts             (App-Typen — hier neue Interfaces ergänzen)
    └── database.ts          (Supabase-generierte Typen)
```

---

## DATENBANK — BEREITS VORHANDENE TABELLEN

```
profiles:        id, user_id, name, north_star, values[], stop_list[], onboarding_completed
goals:           id, user_id, title, description, type, parent_id, progress, status, period_start, period_end
journal_entries: id, user_id, type, feeling_score, morning_goal, blockers, timeblocks(jsonb),
                 accomplished, energy_level, free_text, ai_feedback, goal_id, created_at
coach_sessions:  id, user_id, messages(jsonb), trigger, created_at
pattern_events:  id, user_id, event_type, notes, created_at
```

### SQL das du VOR dem Bauen in Supabase ausführen musst

Zeige dem User dieses SQL und bitte ihn, es in Supabase → SQL Editor auszuführen, bevor du anfängst:

```sql
-- Neue Spalten für profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_profile jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ikigai jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_statement text DEFAULT '';

-- Neue Spalte für journal_entries (Identitäts-Anker)
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_action text DEFAULT '';

-- Falls goals.type ein ENUM ist, neue Werte hinzufügen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_type') THEN
    ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'year';
    ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'three_year';
  END IF;
END$$;
```

---

## WAS GEBAUT WIRD — 6 SCHRITTE

---

### SCHRITT 15 — Einstellungen-Tab + Profil bearbeiten + Daten löschen

**Ziel:** User kann Profil bearbeiten, Onboarding wiederholen und Testdaten löschen.

#### 15A — Neue DB-Funktionen in src/lib/db.ts

Ergänze folgende Funktionen (prüfe vorher ob ähnliche schon existieren):

```typescript
export async function countJournalEntries(userId: string): Promise<number>
export async function countGoals(userId: string): Promise<number>
export async function deleteAllJournalEntries(userId: string): Promise<void>
export async function deleteAllGoals(userId: string): Promise<void>

// Löscht: journal_entries, goals, coach_sessions, pattern_events
// Setzt in profiles: onboarding_completed=false, north_star=null, values=[], stop_list=[],
//                    ai_profile={}, ikigai={}, identity_statement=''  (name bleibt)
export async function deleteAllUserData(userId: string): Promise<void>
```

#### 15B — Settings-Seite (src/pages/Settings.tsx)

Sektion 1 — Mein Profil:
- Name: editierbares Textfeld
- E-Mail: nur anzeigen (aus supabase.auth.getUser())
- Nordstern: editierbares Textarea
- Werte: Tags, einzeln entfernbar + "Wert hinzufügen" Button
- Stopp-Liste: Liste mit einzeln löschbaren Items + "Eintrag hinzufügen" Button
- Speichern-Button → updateProfile(), zeigt "Gespeichert ✓" Feedback

Sektion 2 — Ikigai (Platzhalter — wird in Schritt 19 befüllt):
- Falls ikigai.synthesis vorhanden: Text anzeigen + "Bearbeiten" Button
- Falls nicht: "Noch nicht ausgefüllt" + "Ikigai ausfüllen" Button

Sektion 3 — Dein KI-Profil (Platzhalter — wird in Schritt 20 befüllt):
- Falls ai_profile vorhanden: Muster-Felder anzeigen
- Falls nicht: "Schreibe 14 Journal-Einträge — dann erkenne ich deine Muster."

Sektion 4 — Onboarding:
- Button: "Onboarding neu starten"
- Bestätigungs-Dialog: "Dein Name und E-Mail bleiben erhalten."
- Bei Bestätigung: updateProfile({ onboarding_completed: false }) → navigate('/onboarding')

Sektion 5 — Gefahrenzone (roter Hintergrund, klare Warnung):

Button A: "Journal-Einträge löschen" (orange)
- Modal: "Du hast [count] Einträge. Alle werden dauerhaft gelöscht."
- Zweistufige Bestätigung: "Abbrechen" | "Ja, endgültig löschen"

Button B: "Ziele löschen" (orange) — gleiche Struktur

Button C: "Alle Daten löschen & neu starten" (rot, größer)
- Modal Stufe 1: Was alles gelöscht wird erklären + "Abbrechen" | "Weiter"
- Modal Stufe 2: Textfeld "Tippe LÖSCHEN zur Bestätigung" — Button "Endgültig löschen" nur aktiv wenn exakt "LÖSCHEN" eingegeben
- Nach Löschen: deleteAllUserData() → navigate('/onboarding')

Sektion 6 — Account:
- Button "Abmelden" → supabase.auth.signOut() → navigate('/login')

#### 15C — Navigation erweitern

Lese die existierende Tab-Bar-Komponente. Füge Settings-Tab hinzu:
- Icon: `Settings` aus lucide-react, Label: "Einstellungen", Route: /settings
- Route /settings in App.tsx innerhalb AuthGuard eintragen

---

### SCHRITT 16 — Ziel-Kaskade sichtbar machen

**Ziel:** User sieht im Journal immer den Zusammenhang zwischen Tages-Handlung und großem Ziel.

#### 16A — Neue DB-Funktion

```typescript
// Gibt aktive Ziele zurück — "aktiv" = period_start <= today <= period_end
// Falls kein period gesetzt: nimm das neueste Ziel dieses Typs
export async function getActiveGoalHierarchy(userId: string): Promise<{
  week: Goal | null;
  month: Goal | null;
  quarter: Goal | null;
  year: Goal | null;
  three_year: Goal | null;
}>
```

#### 16B — Kontext-Banner im Morgen-Journal

In MorningJournal.tsx, Schritt 2 (Tages-Ziel):
- Oberhalb des Eingabefelds: Kontext-Banner mit Wochenziel → Monatsziel → Quartalsziel
- Lade mit getActiveGoalHierarchy() beim Mount
- Falls kein Wochenziel: "Noch kein Wochenziel gesetzt" + Link zu /goals
- Design: dezent, lila/grau, collapsible mit Chevron

#### 16C — Tages-Ziel-Referenz im Abend-Journal

In EveningJournal.tsx, ganz oben:
- Lade heutigen Morgen-Eintrag. Falls morning_goal vorhanden:
  `Dein heutiges Ziel war: "[morning_goal]"` — grau, klein, nur zur Erinnerung

#### 16D — Fokus-Banner auf dem Dashboard

In Dashboard.tsx, unter dem Greeting:
- Falls heute Morgen-Journal + morning_goal: `🎯 Dein Fokus heute: "[morning_goal]"` (lila Card)
- Falls kein Morgen-Journal: CTA "Starte deinen Tag — Ziel setzen" → Link zu Journal

#### 16E — Breadcrumb im Journal Entry-Detail

In Journal.tsx Entry-Detail Bottom Sheet:
- Falls Eintrag hat goal_id: lade Ziel-Breadcrumb und zeige an
  `Quartalsziel → Monatsziel → Wochenziel`

---

### SCHRITT 17 — 3-Jahres-Horizont in der Ziel-Hierarchie

**Ziel:** Neue Hierarchie: 3 Jahre → Jahr → Quartal → Monat → Woche

#### 17A — TypeScript Types

In src/types/index.ts: GoalType um 'year' | 'three_year' erweitern falls noch nicht vorhanden.

#### 17B — Goals.tsx erweitern

Lese Goals.tsx vollständig bevor du anfängst.

Tab-Bar erweitern: `3 Jahre | Jahr | Quartal | Monat | Woche | Alle`

Baum-Darstellung: three_year → year → quarter → month → week (Expand/Collapse wie bisher)

"Neues Ziel" Typ-Auswahl:
- three_year: kein parent (Root)
- year: parent = three_year (Picker)
- quarter: parent = year ODER kein parent (Abwärtskompatibilität für bestehende Ziele)
- month/week: unverändert

#### 17C — Onboarding Step7 erweitern

Lese Step7.tsx vollständig.

Erweitere um zwei vorgelagerte Sub-Steps (vor dem Quartalsziel):

Sub-Step 1: 3-Jahres-Ziel
- "Wo stehst du in 3 Jahren? Beschreibe es konkret und messbar."
- Speichert: goals INSERT { type: 'three_year', title: eingabe }

Sub-Step 2: Jahres-Ziel (überspringbar)
- "Was muss in den nächsten 12 Monaten passieren?"
- Speichert: goals INSERT { type: 'year', title: eingabe, parent_id: three_year_id }

Sub-Step 3: Quartalsziel (wie bisher, mit parent_id Verknüpfung)

Fortschrittsbalken innerhalb des Steps: 1/3, 2/3, 3/3

---

### SCHRITT 18 — Identitäts-Modul

**Ziel:** "Wer will ich sein?" als täglicher Anker — die stärkste Motivationsquelle.

#### 18A — Neuer Onboarding-Schritt: Identität

Erstelle `src/components/onboarding/Step6_Identity.tsx`

Position: zwischen Step5 (Nordstern) und Step6 (Stopp-Liste).

WICHTIG zur Datei-Benennung: Benenne bestehende Dateien NICHT um.
Erstelle neue Datei Step6_Identity.tsx und passe Onboarding.tsx an, sodass der Fluss ist:
Step1 → Step2 → Step3 → Step4 → Step5 → Step6_Identity → Step6 → Step7
(Step6 und Step7 behalten ihre Namen, Step6_Identity wird dazwischen eingeschoben)
Passe totalSteps in Onboarding.tsx auf 8 an.

Inhalt:
- Überschrift: "Dein zukünftiges Ich"
- Text: "Stell dir vor, es ist [Jahr + 3]. Du hast alles erreicht. Wer bist du jetzt?"
- Textarea (min-height 120px)
- Placeholder: "Ich bin ein Unternehmer der ortsunabhängig arbeitet..."
- Optionaler Button: "KI hilft mir formulieren"
  - Prompt: "Der User beschreibt sein zukünftiges Ich: [text]. Forme es um in kraftvolle Gegenwartsform ('Ich bin...', 'Ich habe...', 'Ich lebe...'). Max. 4 Sätze. Deutsch. Nah am Original."
  - Ergebnis in Textarea zum Bearbeiten
- "Überspringen" Link
- Speichert: profiles.identity_statement = textarea_value

#### 18B — Morgen-Journal: Identitäts-Anker

In MorningJournal.tsx, Schritt 2, nach dem Tages-Ziel-Feld:

Nur anzeigen wenn profile.identity_statement nicht leer:
- Label: "Welche Handlung heute beweist wer du bist?" *(optional)*
- Kleines Textfeld
- Placeholder: "Ich werde heute ... tun, weil ich jemand bin der ..."
- "Überspringen" Link
- Speichert in: journal_entries.identity_action (neue Spalte aus SQL-Block)

#### 18C — Dashboard: Identitäts-Reminder

Zeige Reminder-Card NUR wenn:
1. profile.identity_statement vorhanden
2. localStorage('identity_reminder_dismissed') ist älter als 3 Tage oder nicht gesetzt

Card-Inhalt:
```
💫 "[erste 60 Zeichen]..."   [Vollständig lesen]  [✕]
```
- ✕: setzt localStorage mit heutigem Datum
- "Vollständig lesen": Modal mit vollständigem identity_statement

---

### SCHRITT 19 — Ikigai als Onboarding-Schritt

**Ziel:** Ikigai als Fundament — Schnittpunkt aus Liebe, Können, Bezahlung, Weltbedarf.

#### 19A — Neuer Onboarding-Schritt: Ikigai

Erstelle `src/components/onboarding/Step3_Ikigai.tsx`

Position: nach Step2 (Lebensrad), vor Step3 (Werte-Radar).

WICHTIG zur Benennung: Benenne Step3.tsx NICHT um.
Passe Onboarding.tsx an: Step1 → Step2 → Step3_Ikigai → Step3 → Step4 → Step5 → Step6_Identity → Step6 → Step7
Passe totalSteps auf 9 an.

Inhalt:
- Überschrift: "Dein Ikigai"
- Erklärung (2 Sätze): Was Ikigai ist
- 4 Fragen, eine nach der anderen (Fortschrittsbalken 1/4 bis 4/4):
  1. "Was liebst du zu tun — auch wenn du nicht dafür bezahlt wirst?"
  2. "Worin bist du gut — besser als die meisten?"
  3. "Wofür würden Menschen dir Geld zahlen?"
  4. "Was braucht die Welt — womit kannst du einen Unterschied machen?"

Nach Frage 4:
- Button: "Meinen Ikigai-Kern finden" 
  Prompt: "Basierend auf: Liebe=[a1], Können=[a2], Bezahlung=[a3], Weltbedarf=[a4] — formuliere den Ikigai-Kern in 1-2 prägnanten Sätzen auf Deutsch. Direkt und kraftvoll, keine Floskeln."
  Ergebnis als editierbare lila Card
- "Manuell eingeben" Alternative
- "Schritt überspringen" Link

Speichert: profiles.ikigai = { loves, good_at, paid_for, world_needs, synthesis }

#### 19B — Ikigai in Settings bearbeitbar

In Settings.tsx, Sektion 2 (Platzhalter aus Schritt 15 ersetzen):
- Alle 4 Felder + synthesis als editierbare Felder
- Speichern → updateProfile({ ikigai: {...} })

#### 19C — Ikigai im KI-Coach-Kontext

In claude.ts, in der Kontext-Aufbau-Funktion:
```typescript
${profile.ikigai?.synthesis ? `IKIGAI-KERN: ${profile.ikigai.synthesis}\n` : ''}
```

---

### SCHRITT 20 — KI Muster-Erkennung

**Ziel:** Nach 14 Einträgen erkennt die KI Energie-Muster, Sabotage-Trigger und Fortschritt.

#### 20A — Neuer Type in src/types/index.ts

```typescript
export interface PatternAnalysis {
  energyPatterns: string;       // "Montags energielos (Ø 3.1/10), mittwochs am stärksten (Ø 7.8/10)"
  focusPatterns: string;        // "Produktivste Zeit: morgens 9–11 Uhr"
  sabotagePatterns: string;     // "Häufige Blocker: Trading-Themen (4x), Energiemangel (3x)"
  progressObservation: string;  // Fortschritt in Richtung Nordstern
  coachQuestion: string;        // Eine offene Frage basierend auf den Mustern
  generatedAt: string;          // ISO timestamp
}
```

#### 20B — Neue Funktion in src/lib/claude.ts

```typescript
export async function generatePatternAnalysis(
  profile: Profile,
  entries: JournalEntry[],
  goals: Goal[]
): Promise<PatternAnalysis>
```

Prompt:
```
Du analysierst Journal-Einträge als Verhaltenspsychologe.

NORDSTERN: [north_star]
WERTE: [values.join(', ')]
IKIGAI-KERN: [ikigai?.synthesis oder 'nicht angegeben']
IDENTITÄT: [identity_statement oder 'nicht angegeben']
AKTIVE ZIELE: [goals.map(g => g.title).join(', ')]

EINTRÄGE ([n] Stück, älteste zuerst):
[entries.map(e => `Datum: ${e.created_at} | Typ: ${e.type} | Feeling: ${e.feeling_score}/5 | Ziel: ${e.morning_goal||'-'} | Blocker: ${e.blockers||'-'} | Energie: ${e.energy_level||'-'}/10 | Geschafft: ${e.accomplished||'-'}`).join('\n')]

Antworte AUSSCHLIESSLICH als valides JSON ohne Markdown-Backticks:
{"energyPatterns":"...","focusPatterns":"...","sabotagePatterns":"...","progressObservation":"...","coachQuestion":"..."}

Konkret, direkt, nicht wertend. Echte Zahlen aus den Daten verwenden.
```

JSON-Parsing: Backticks und "json" entfernen vor JSON.parse(). Try/catch.

#### 20C — Automatische Analyse im Dashboard

In Dashboard.tsx:

```typescript
useEffect(() => {
  if (!profile || !entries || entries.length < 14) return;
  const lastAnalysis = profile.ai_profile?.generatedAt;
  const daysSince = lastAnalysis
    ? Math.floor((Date.now() - new Date(lastAnalysis).getTime()) / 86400000)
    : 999;
  if (daysSince >= 14) {
    generatePatternAnalysis(profile, entries, goals)
      .then(analysis => updateProfile({ ai_profile: { ...analysis, generatedAt: new Date().toISOString() } }))
      .catch(err => console.error('Pattern analysis (silent):', err));
  }
}, [entries?.length]);
```

#### 20D — Muster in Coach.tsx anzeigen

Auf der Modus-Auswahlseite, falls ai_profile vorhanden und < 30 Tage alt:
```
🔍 Deine Muster
Energie: [energyPatterns]
Fokus: [focusPatterns]  
Achtung: [sabotagePatterns]
[Muster mit Coach besprechen →]
```
Button startet Chat mit coachQuestion als Starter.

#### 20E — Muster in Wochen-Review

In Review.tsx, Schritt 1 (KI-Zusammenfassung):
Falls ai_profile vorhanden: sabotagePatterns + coachQuestion an Zusammenfassung anhängen.

#### 20F — KI-Profil in Settings.tsx (Platzhalter aus Schritt 15 ersetzen)

```
🧠 Dein KI-Profil
[Falls vorhanden:]
  Energie-Muster: [energyPatterns]
  Fokus-Muster: [focusPatterns]
  Sabotage-Trigger: [sabotagePatterns]
  Zuletzt analysiert: [generatedAt als lesbares Datum]
  [Button: "Jetzt neu analysieren"] — nur aktiv wenn entries >= 14

[Falls nicht vorhanden:]
  "Schreibe noch [14 - count] Journal-Einträge — dann erkenne ich deine Muster."
```

---

## NACH ALLEN 6 SCHRITTEN: DEPLOYMENT

```bash
git add -A
git commit -m "feat: Phase 2 — Settings, Ziel-Kaskade, 3-Jahres-Horizont, Identitaet, Ikigai, KI-Muster"
git push origin master
```

Vercel deployed automatisch. URL: https://life-os-henna-xi.vercel.app

---

## QUALITÄTS-STANDARDS — NICHT VERHANDELBAR

**TypeScript:**
- Keine `any` Types — wenn unklar, lies database.ts und types/index.ts
- Alle neuen Komponenten: explizite Props-Interfaces
- Neue Interfaces in src/types/index.ts

**Fehlerbehandlung:**
- Jeder Supabase-Call: try/catch mit Error-State in der UI
- KI-Calls: try/catch, Fehler dem User anzeigen
- Alle Loading-States: Spinner oder Skeleton

**Architektur:**
- Alle DB-Operationen in src/lib/db.ts
- Alle KI-Operationen in src/lib/claude.ts
- Keine direkten Supabase-Calls in Komponenten/Pages

**UX:**
- Mobile-first (PWA, primär Handy)
- Destruktive Aktionen: min. 2-stufig, "Alle Daten löschen" 3-stufig mit Texteingabe
- Framer Motion für Übergänge, konsistent mit bestehendem Code
- Primary: #863bff

**Supabase:**
- IMMER WHERE user_id = currentUser.id

---

## EIGENHEITEN DIESES PROJEKTS

| Sache | Details |
|-------|---------|
| Tailwind | v4 — andere Syntax als v3. Immer existierende Klassen als Vorlage nutzen. |
| Claude Model | `claude-sonnet-4-6` — exakt so. |
| Dev Port | 5174 |
| Windows Git | LF/CRLF Warnings → normal, ignorieren |
| npm install | immer mit `--legacy-peer-deps` |
| Onboarding-Dateien | Bestehende NIE umbenennen — neue Steps bekommen sprechende Namen (Step3_Ikigai.tsx etc.) |

---

## STARTBEFEHL FÜR MORGEN

Claude Code öffnen → `cd Desktop/life-os` → `claude` → exakt das eingeben:

```
Lies LIFE_OS_PHASE2_BRIEFING.md komplett.
Lies dann: LIFE_OS_KONTEXT.md, src/App.tsx, src/lib/db.ts, src/lib/claude.ts, src/pages/Goals.tsx, src/pages/Onboarding.tsx, und alle Dateien in src/components/onboarding/.
Zeige mir danach das SQL aus dem Briefing damit ich es in Supabase ausführen kann.
Warte auf meine Bestätigung dass das SQL ausgeführt wurde.
Dann starten wir mit Schritt 15A.
Warte nach jedem Teilschritt auf mein "weiter" bevor du zum nächsten gehst.
```
