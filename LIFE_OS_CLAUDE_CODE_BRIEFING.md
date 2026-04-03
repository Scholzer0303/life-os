# LIFE OS — Vollständiges Entwickler-Briefing für Claude Code

> Dieses Dokument ist dein einziger Auftrag. Lies es komplett, bevor du eine einzige Zeile Code schreibst. Stelle Rückfragen, wenn etwas unklar ist. Fange erst an zu bauen, wenn du alles verstanden hast.

---

## 1. Was wir bauen

Eine progressive Web-App (PWA) namens **Life OS** — ein persönlicher KI-Mentor und Journal-System. Kein weiteres Produktivitäts-Tool. Ein echter Begleiter, der den Nutzer kennt, seine Muster erkennt, und ihn durch Fragen — nicht durch Befehle — zu seinen echten Zielen führt.

**Kernprinzip:** Die App soll sich anfühlen wie ein ruhiger, ehrlicher Mentor — nicht wie ein To-do-Manager. Jede Interaktion soll Klarheit schaffen, nicht Druck aufbauen.

---

## 2. Tech Stack — Non-negotiable

| Komponente | Technologie | Begründung |
|---|---|---|
| Frontend | React (Vite) + TypeScript | Typsicherheit, Wartbarkeit |
| Styling | Tailwind CSS | Konsistenz, Mobile-first |
| Datenbank | Supabase (PostgreSQL) | Kostenlos, skaliert, Auth inklusive |
| KI | Anthropic Claude API (claude-sonnet-4-20250514) | On-demand Feedback |
| Deployment | Vercel | Kostenlos, automatisch, global CDN |
| PWA | Vite PWA Plugin | Desktop + Mobile, offline-fähig |
| State | Zustand | Einfach, kein Boilerplate |

**Wichtig:** Die App muss auf Desktop (Chrome/Firefox/Safari) und Mobilgerät (iOS Safari, Android Chrome) einwandfrei funktionieren. PWA-Installation muss möglich sein ("Zum Homescreen hinzufügen").

---

## 3. Projektstruktur

```
life-os/
├── public/
│   ├── manifest.json          # PWA Manifest
│   └── icons/                 # App Icons (512x512, 192x192)
├── src/
│   ├── components/
│   │   ├── ui/                # Basiskomponenten (Button, Card, Input, Modal)
│   │   ├── journal/           # Journal-spezifische Komponenten
│   │   ├── goals/             # Ziel-Hierarchie Komponenten
│   │   ├── coach/             # KI-Coach Komponenten
│   │   └── onboarding/        # Ziel-Entdeckungs-Flow
│   ├── pages/
│   │   ├── Onboarding.tsx     # Einmaliger Setup-Flow
│   │   ├── Dashboard.tsx      # Tages-Übersicht
│   │   ├── Journal.tsx        # Journal-Hauptseite
│   │   ├── Goals.tsx          # Ziel-Hierarchie
│   │   ├── Coach.tsx          # KI-Coach Chat
│   │   └── Review.tsx         # Wochen-Review
│   ├── lib/
│   │   ├── supabase.ts        # Supabase Client
│   │   ├── claude.ts          # Claude API Wrapper
│   │   └── utils.ts           # Hilfsfunktionen
│   ├── store/
│   │   └── useStore.ts        # Zustand Global State
│   ├── types/
│   │   └── index.ts           # Alle TypeScript Types
│   └── App.tsx
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 4. Supabase Datenbankschema

Führe diese SQL-Befehle exakt so in Supabase → SQL Editor aus:

```sql
-- Row Level Security aktivieren für alle Tabellen
-- Nutzer sehen NUR ihre eigenen Daten

-- Profil (wird beim Onboarding befüllt)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT,
  north_star TEXT,                    -- Nordstern-Vision (1 Satz)
  values JSONB DEFAULT '[]',          -- Werte-Radar Ergebnisse
  ikigai JSONB DEFAULT '{}',          -- Ikigai Antworten
  stop_list TEXT[] DEFAULT '{}',      -- Anti-Ziel Stopp-Liste
  energy_pattern JSONB DEFAULT '{}',  -- Gelernte Energie-Muster
  onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Ziel-Hierarchie
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('quarterly', 'monthly', 'weekly')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  parent_id UUID REFERENCES goals(id) ON DELETE SET NULL,  -- Verknüpfung nach oben
  quarter INT CHECK (quarter BETWEEN 1 AND 4),
  month INT CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  week INT CHECK (week BETWEEN 1 AND 53),
  progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100)
);

-- Journal-Einträge
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('morning', 'evening', 'freeform')) NOT NULL,
  -- Morgen-Felder
  feeling_score INT CHECK (feeling_score BETWEEN 1 AND 10),
  main_goal_today TEXT,
  potential_blockers TEXT,
  -- Abend-Felder
  accomplished TEXT,
  what_blocked TEXT,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
  -- Freitext (für freeform und zusätzliche Notizen)
  free_text TEXT,
  -- Timeboxing
  timeblocks JSONB DEFAULT '[]',      -- Array von {title, duration_min, buffer_min, completed}
  -- KI
  ai_feedback TEXT,                   -- Gespeichertes KI-Feedback
  ai_feedback_requested_at TIMESTAMPTZ,
  -- Verknüpfung mit Tageszielen
  linked_goal_ids UUID[] DEFAULT '{}'
);

-- Coach-Gespräche
CREATE TABLE coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trigger TEXT CHECK (trigger IN ('on_demand', 'pattern_interrupt', 'weekly_review', 'entry_feedback')),
  messages JSONB NOT NULL DEFAULT '[]',  -- Array von {role, content, timestamp}
  summary TEXT                           -- KI-generierte Zusammenfassung
);

-- Pattern Interrupt Log
CREATE TABLE pattern_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT,   -- z.B. 'missed_journal_3days', 'goal_abandoned', 'reset_ritual'
  context JSONB DEFAULT '{}'
);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own sessions" ON coach_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own patterns" ON pattern_events FOR ALL USING (auth.uid() = user_id);

-- Automatisch updated_at aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER journal_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. Umgebungsvariablen (.env)

```env
VITE_SUPABASE_URL=deine_supabase_url
VITE_SUPABASE_ANON_KEY=dein_supabase_anon_key
VITE_ANTHROPIC_API_KEY=dein_anthropic_api_key
```

**Sicherheitshinweis:** Der Anthropic API Key wird client-seitig verwendet (VITE_). Das ist für eine persönliche App akzeptabel. Wenn die App jemals öffentlich wird, muss ein Backend-Proxy (Supabase Edge Function) zwischengeschaltet werden. Baue den Claude-Aufruf so, dass er einfach auf eine Edge Function umgeleitet werden kann.

---

## 6. App-Architektur & Flows

### 6.1 Onboarding (einmalig, beim ersten Start)

Mehrstufiger Flow — jeder Schritt ist eine eigene Seite mit sanften Übergängen:

**Schritt 1 — Willkommen**
- Name abfragen
- Erklären was Life OS ist (kein Tool, ein Mentor)

**Schritt 2 — Lebensrad**
- 8 Lebensbereiche (Gesundheit, Finanzen, Karriere, Beziehungen, Persönlichkeit, Freizeit, Umfeld, Sinn)
- Jeder Bereich mit Schieberegler 1–10 (Wo bin ich gerade?)
- Visualisierung als Spinnennetz-Diagramm (SVG, animiert)

**Schritt 3 — Werte-Radar**
- 12 Karten mit Werten (Freiheit, Sicherheit, Einfluss, Familie, Wachstum, Abenteuer, Kreativität, Gerechtigkeit, Wohlstand, Verbindung, Gesundheit, Wirkung)
- Nutzer wählt seine Top 5 aus
- App zeigt Konflikte zwischen gewählten Werten auf (z.B. "Freiheit + Sicherheit können sich widersprechen — wie gehst du damit um?")

**Schritt 4 — 5-Warum-Kette**
- Startfrage: "Was willst du in deinem Leben wirklich verändern?"
- KI stellt automatisch bis zu 5 Warum-Folgefragen (Claude API)
- Ziel: Das echte Motiv hinter dem Oberflächenwunsch freilegen

**Schritt 5 — Nordstern-Vision**
- KI fasst die 5-Warum-Erkenntnisse zusammen
- Nutzer formuliert seinen Nordstern-Satz: "In 3 Jahren bin ich [X], erkennbar daran, dass [Y]"
- KI gibt Feedback: Ist das Vision oder Wunsch? Ist es messbar?

**Schritt 6 — Stopp-Liste**
- "Was hörst du ab heute auf zu tun, um deinen Nordstern zu erreichen?"
- Freies Eingabefeld + KI-Vorschläge basierend auf Onboarding-Antworten
- Mindestens 3 Einträge

**Schritt 7 — Erstes Quartalsziel**
- "Was ist dein wichtigstes Ziel für die nächsten 3 Monate?"
- Direkt abgeleitet vom Nordstern
- Wird als erstes `goals`-Objekt gespeichert

---

### 6.2 Dashboard (Haupt-Bildschirm)

Der Dashboard ist die Startseite nach dem Onboarding. Er zeigt:

- **Tages-Greeting** mit aktuellem Datum und Wochentag
- **Nordstern** (immer sichtbar, klein, oben)
- **Heutiger Status:** Hat der Nutzer heute schon einen Morgen-Eintrag? → CTA-Button
- **Aktuelle Wochenziele** (3 max) mit Fortschrittsbalken
- **Streak-Anzeige** (wie viele Tage in Folge Journal geschrieben)
- **Heatmap** (letzten 60 Tage — ähnlich GitHub Contribution Graph)
- **Pattern Interrupt Banner** — wenn 3+ Tage kein Eintrag: sanfte, nicht beschämende Nachricht + "Reset starten" Button
- **Quick-Access Buttons:** Morgen-Journal starten / Abend-Journal starten / Coach fragen

---

### 6.3 Journal-Modul

#### Morgen-Journal (5 Min)

Geführter Flow, eine Frage pro Bildschirm (nicht alles auf einmal):

1. "Wie fühlst du dich gerade?" → Emoji-Skala 1–5 + optionaler Text
2. "Was ist dein einen Ziel für heute?" → Freitext + Verknüpfung mit Wochenziel wählbar
3. "Was könnte dich heute aufhalten?" → Freitext
4. **Flex-Timeboxing:** "Wie sieht dein Tag aus?" → Blöcke hinzufügen mit Titel + ungefähre Dauer + automatisch 15 Min Puffer zwischen Blöcken eingebaut. Max 6 Blöcke. Blöcke sind Themen, keine starren Zeiten.
5. Zusammenfassung + "Journal speichern" Button

#### Abend-Journal (5 Min)

1. "Was hast du heute geschafft?" → Freitext
2. "Was hat dich aufgehalten?" → Freitext
3. "Wie ist dein Energie-Level?" → Skala 1–10
4. "Freitext — was liegt dir noch auf der Seele?" → optional
5. **KI-Feedback Button:** "Coach um Feedback bitten" → Claude analysiert den Abend-Eintrag + Kontext und antwortet mit einer Beobachtung oder Frage (kein Lob, kein Vorwurf — nur Klarheit)

#### Freeform-Eintrag

- Jederzeit abrufbar
- Freies Schreiben ohne Struktur
- Optional: KI-Feedback anfordern
- Optional: Mit Ziel verknüpfen

#### Journal-Übersicht

- Kalender-Ansicht: Welche Tage haben Einträge? (Morgen = blau, Abend = grün, beide = lila, Pattern Interrupt = orange)
- Tap auf Tag → Eintrag öffnen
- Such-Funktion (Volltext)

---

### 6.4 Ziel-Hierarchie

Drei Ebenen, immer sichtbar verknüpft:

```
Quartalsziel (3 max)
  └── Monatsziel (3 max pro Quartal)
        └── Wochenziel (3 max pro Monat)
              └── Tages-Intention (aus Morgen-Journal)
```

**Ziel-Karte zeigt:**
- Titel + Beschreibung
- Übergeordnetes Ziel (Breadcrumb)
- Fortschritt (manuell update-bar, 0–100%)
- Verknüpfte Journal-Einträge (Anzahl)
- Status (aktiv / abgeschlossen / pausiert)
- "KI-Check" Button → Coach bewertet: Ist dieses Ziel noch auf Kurs? Stimmt es mit dem Nordstern überein?

---

### 6.5 KI-Coach (On-Demand)

Chat-Interface, immer aufrufbar. Kein permanenter Chat-Verlauf — jedes Gespräch ist eine Session.

**Der Coach hat immer Kontext über:**
- Nordstern-Vision des Nutzers
- Aktuelle Quartal/Monat/Wochenziele
- Letzten 7 Journal-Einträge (Zusammenfassung)
- Stopp-Liste
- Werte
- Erkannte Muster (energy_pattern aus Profil)

**Coach-Typen (auswählbar):**
- 🔍 "Ich stecke fest" → Coach stellt Fragen um den Block zu lösen
- 🎯 "Bin ich auf Kurs?" → Coach analysiert Fortschritt
- 🔥 "Ich brauche Klarheit" → Coach führt durch Mini-5-Warum
- 💬 "Einfach reden" → Freies Gespräch

**Wichtige KI-Verhaltensregeln (im System Prompt):**
- Stellt maximal eine Frage pro Antwort
- Gibt keine ungebetenen Ratschläge
- Spricht direkt, nicht beschönigend
- Erkennt Selbstsabotage und benennt sie sanft
- Endet Sessions immer mit einer konkreten Micro-Aktion ("Was ist der kleinste nächste Schritt?")

---

### 6.6 Wochen-Review (Sonntag)

Strukturierter 15-Minuten-Flow, der automatisch vorgeschlagen wird:

1. KI-generierte Zusammenfassung der Woche (aus Journal-Einträgen)
2. "Was lief gut?" → Freitext
3. "Was würdest du ändern?" → Freitext
4. Wochenziele abhaken / Fortschritt aktualisieren
5. Neue Wochenziele für nächste Woche setzen (abgeleitet aus Monatsziel)
6. KI-Feedback auf die Woche

---

### 6.7 Pattern Interrupt

Wird ausgelöst wenn:
- 3+ Tage kein Journal-Eintrag
- 2+ Wochen kein Wochen-Review
- Nutzer manuell "Ich bin raus aus dem Rhythmus" drückt

**Flow:**
1. Keine Beschämung: "Hey — Leben passiert. Was ist gerade los?"
2. Freitext-Antwort → KI analysiert und antwortet mitfühlend + direkt
3. Reset-Ritual: Eine einzige kleine Aufgabe für heute (kein ganzes System neu aufsetzen)
4. Pattern wird geloggt (für Muster-Erkennung)

---

## 7. Claude API — System Prompt

Verwende diesen System Prompt für alle KI-Aufrufe. Befülle die Variablen dynamisch:

```typescript
const buildSystemPrompt = (profile: Profile, recentEntries: JournalEntry[], goals: Goal[]) => `
Du bist Life OS Coach — ein direkter, ehrlicher, mitfühlender Mentor für ${profile.name}.

ÜBER ${profile.name}:
- Nordstern-Vision: "${profile.north_star}"
- Wichtigste Werte: ${profile.values.slice(0, 5).join(', ')}
- Stopp-Liste (was er/sie explizit nicht mehr tut): ${profile.stop_list.join(', ')}

AKTUELLE ZIELE:
${goals.filter(g => g.status === 'active').map(g => `- [${g.type}] ${g.title} (${g.progress}%)`).join('\n')}

LETZTE 7 TAGE (Journal-Zusammenfassung):
${summarizeEntries(recentEntries)}

ERKANNTE MUSTER:
${JSON.stringify(profile.energy_pattern)}

DEINE VERHALTENSREGELN:
1. Stelle maximal eine Frage pro Antwort
2. Gib keine ungebetenen Ratschläge — stelle Fragen
3. Sprich direkt und klar — kein Motivations-Bullshit
4. Erkenne Selbstsabotage, benenne sie sanft aber direkt
5. Beende jede Session mit einer Micro-Aktion ("Was ist der kleinste nächste Schritt?")
6. Antworte auf Deutsch
7. Halte Antworten unter 150 Wörtern — Qualität über Quantität
8. Du kennst ${profile.name} — du erinnerst dich an Muster, Rückschläge und Erfolge

VERBOTEN:
- Generische Motivation ("Du schaffst das!")
- Lange Aufzählungen mit Ratschlägen
- Mehr als eine Frage stellen
- Beschämen oder Vorwürfe
`;
```

---

## 8. Design-Richtlinien

**Ästhetik:** Refined Minimalism — warm, ruhig, professionell. Wie ein hochwertiges Notizbuch, nicht wie eine App.

**Farbpalette:**
```css
:root {
  --bg-primary: #FAFAF8;       /* Warmes Off-White */
  --bg-secondary: #F2F0EB;     /* Leichtes Beige */
  --bg-card: #FFFFFF;
  --accent: #2D5BE3;           /* Tiefes Blau — Haupt-CTA */
  --accent-warm: #E8593C;      /* Koralle — Energie, Pattern Interrupt */
  --accent-green: #1D9E75;     /* Teal — Erfolg, Abschluss */
  --text-primary: #1A1A18;     /* Fast-Schwarz */
  --text-secondary: #6B6B62;   /* Warm-Grau */
  --text-muted: #9E9E94;
  --border: #E5E3DC;
  --streak: #F2A623;           /* Amber — Streak/Heatmap */
}
```

**Typografie:**
- Überschriften: `'Lora'` (Google Fonts — serif, warm, leserlich)
- Body: `'DM Sans'` (Google Fonts — modern, klar)
- Monospace (Daten): `'JetBrains Mono'`

**Mobile First:** Alle Layouts funktionieren auf 375px Breite. Navigation unten (Tab Bar) auf Mobile, Sidebar auf Desktop.

**Animationen:** Sanft, zweckvoll. Page transitions mit `framer-motion` (fade + slight-up). Keine unnötigen Animationen.

**Keine leeren Zustände ohne Kontext:** Jeder leere State hat eine ermutigende, kurze Nachricht + klaren CTA.

---

## 9. PWA-Konfiguration

```json
// public/manifest.json
{
  "name": "Life OS",
  "short_name": "Life OS",
  "description": "Dein persönlicher KI-Mentor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF8",
  "theme_color": "#2D5BE3",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

```typescript
// vite.config.ts — PWA Plugin
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50 } }
        }]
      }
    })
  ]
}
```

---

## 10. Qualitäts- und Sicherheitsstandards

- **TypeScript strict mode** — keine `any` Types
- **Zod** für alle API-Response-Validierungen
- **Error Boundaries** auf allen Seiten
- **Loading States** für alle async Operationen
- **Optimistic Updates** für Journal-Einträge (sofort sichtbar, dann sync)
- **Offline Support** — Journal schreiben auch ohne Internet (Service Worker cached, sync wenn online)
- **Rate Limiting:** Claude API max 1 Request alle 10 Sekunden pro Nutzer (client-seitig)
- **Input Sanitization** auf allen Freitextfeldern
- **Keine sensitiven Daten im localStorage** — nur Supabase Session Token
- **WCAG 2.1 AA** Accessibility (Kontrast, Keyboard-Navigation, Screen Reader Labels)
- **Core Web Vitals:** LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## 11. Entwicklungs-Reihenfolge (für Claude Code)

Baue in genau dieser Reihenfolge — teste jeden Schritt bevor du weitergehst:

1. **Setup:** Vite + React + TypeScript + Tailwind + Supabase initialisieren
2. **Auth:** Supabase Auth (Email/Magic Link) — Login, Logout, Session
3. **Datenbankschema:** SQL aus Kapitel 4 ausführen, Types generieren
4. **Onboarding-Flow:** Alle 7 Schritte (ohne KI zuerst, dann KI integrieren)
5. **Dashboard:** Basis-Layout mit Greeting, Nordstern, CTA-Buttons
6. **Morgen-Journal:** Geführter Flow + Timeboxing
7. **Abend-Journal:** Flow + KI-Feedback Integration
8. **Ziel-Hierarchie:** CRUD für Quartal/Monat/Woche-Ziele
9. **KI-Coach:** Chat-Interface + System Prompt
10. **Wochen-Review:** Flow + KI-Zusammenfassung
11. **Pattern Interrupt:** Trigger-Logik + Reset-Flow
12. **PWA:** Manifest + Service Worker + Icons
13. **Heatmap & Streak:** Visualisierungen auf Dashboard
14. **Vercel Deployment:** `.env` in Vercel, automatisches Deployment

---

## 12. Startbefehl für Claude Code

Wenn du Claude Code öffnest, gib exakt diesen Befehl ein:

```
Lies das Briefing in LIFE_OS_CLAUDE_CODE_BRIEFING.md komplett durch. 
Dann starte mit Schritt 1 der Entwicklungs-Reihenfolge (Kapitel 11). 
Stelle alle Fragen, die du hast, bevor du anfängst. 
Baue einen Schritt nach dem anderen — zeige mir das Ergebnis, bevor du zum nächsten gehst.
```

---

## 13. Deine Zugangsdaten (vor dem Start ausfüllen)

Bevor du anfängst, brauchst du drei Dinge:

1. **Supabase Account** → https://supabase.com → Neues Projekt erstellen → URL + Anon Key kopieren
2. **Anthropic API Key** → https://console.anthropic.com → API Keys → Neuer Key
3. **Vercel Account** → https://vercel.com → mit GitHub verknüpfen (für Deployment)

Alle drei sind kostenlos für den persönlichen Gebrauch.

---

*Erstellt mit Life OS Design System v1.0 — Vollständige App-Spezifikation*
