# LIFE_OS_FEATURES.md — Aktive Pakete
# Claude Code liest diese Datei beim Session-Start automatisch.
# Nach Abschluss eines Schritts: Status auf ✅ UMGESETZT (Datum) setzen.
# Zuletzt aktualisiert: 2026-04-08 (Paket 5 + 6 geplant)

---

## PAKET 5 — Stabilität & Ziel-Hierarchie

Paket 5 behebt alle bekannten Bugs, stabilisiert die PWA-Session und baut die
vollständige Ziel-Hierarchie-Verknüpfung in der UI. Außerdem wird "Nordstern"
überall durch "Vision" ersetzt und die Einstellungen werden aufgeräumt.

**Reihenfolge ist kritisch. Niemals zwei Schritte gleichzeitig.**

### Pakete
- **5A — Bugs & PWA** (Schritte 1–2): Alle bekannten Bugs + Session Persistence
- **5B — Ziel-Hierarchie** (Schritt 3): Verknüpfung Woche→Monat→Quartal→Jahr in der UI
- **5C — Umbenennung & Aufräumen** (Schritte 4–5): Vision-Begriff + Einstellungen neu strukturieren
- **5D — KI an Zielen** (Schritt 6): Kontextuelles KI-Feedback direkt an jedem Ziel

---

## PAKET 5A — Bugs & PWA

---

### Schritt 1 — Bugs beheben (3 Bugs) ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/pages/Dashboard.tsx`, `src/pages/Settings.tsx`, diverse KI-Aufrufe
**Aufwand:** Klein-Mittel

**Bug A — Abhak-Synchronisation:**
Task im Dashboard abhaken → Wochenziel-Status aktualisiert sich sofort (kein Reload nötig).
Wochenziel-Status ändern → Dashboard-Tasks aktualisieren sich sofort.
Lösung: Gemeinsamer State oder Echtzeit-Listener statt separater Lade-Calls.

**Bug B — Supabase-Link 404:**
In Einstellungen → Datenspeicher: "Speichernutzung im Supabase Dashboard prüfen →"
wirft 404. Link entfernen — kein Ersatz nötig, die Info-Box kann ohne den Link stehen bleiben.

**Bug C — KI-Fehler als roher JSON:**
Wenn die Anthropic API einen Fehler zurückgibt (z.B. 529 Overloaded), wird der rohe
JSON-String direkt in der UI angezeigt. Überall wo KI aufgerufen wird: saubere
Fehlermeldung anzeigen: "KI momentan nicht verfügbar — bitte erneut versuchen."
Betrifft: Mentor-Impuls im Morgenjournal, KI-Zusammenfassungen, Coach.

Nach diesem Schritt: alle drei Bugs in der laufenden App testen.

---

### Schritt 2 — PWA Session Persistence ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/lib/supabase.ts` oder Auth-Initialisierung, ggf. `src/App.tsx`
**Aufwand:** Klein

**Problem:** Wenn die App als PWA-Icon auf dem Homescreen liegt und geöffnet wird,
ist die Supabase-Session abgelaufen → Nutzer muss sich erneut per Magic Link anmelden.
Das passiert auf dem Handy regelmäßig und ist inakzeptabel für tägliche Nutzung.

**Lösung:**
- Supabase Auth mit `persistSession: true` und `autoRefreshToken: true` konfigurieren
- Session wird in localStorage persistent gespeichert
- Token wird automatisch erneuert bevor er abläuft
- PWA-Manifest prüfen: `display: standalone` muss gesetzt sein

Test: App auf Handy als PWA installieren, einen Tag warten, dann öffnen → kein Login-Screen.

---

## PAKET 5B — Ziel-Hierarchie

---

### Schritt 3 — Ziel-Hierarchie: Verknüpfung in der UI ✅ UMGESETZT (2026-04-08)

**Betroffene Dateien:** `src/components/journal/JournalWeek.tsx`, `src/components/journal/JournalMonth.tsx`,
`src/components/journal/JournalQuarter.tsx`, `src/components/journal/JournalYear.tsx`, `src/lib/db.ts`
**Aufwand:** Groß

**Hintergrund:** Die `parent_id`-Spalte in der `goals`-Tabelle existiert bereits in der DB.
Bisher wird sie nicht genutzt. Jetzt wird die UI gebaut die diese Verknüpfung ermöglicht.

**Was gebaut wird:**

Beim Erstellen ODER Bearbeiten eines Ziels erscheint ein optionales Dropdown:
"Gehört zu [übergeordneter Ebene]..." — zeigt alle Ziele der nächsthöheren Ebene.
Die Verknüpfung ist OPTIONAL — kein Zwang, kein Pflichtfeld.

Konkrete Verknüpfungen:
- Wochenziel → kann einem Monatsziel zugeordnet werden
- Monatsziel → kann einem Quartalsziel zugeordnet werden
- Quartalsziel → kann einem Jahresziel zugeordnet werden
- Jahresziel → Vision (wird in Paket 6 gebaut — Feld vorerst ausblenden)

**Anzeige nach Verknüpfung:**
- Bei übergeordnetem Ziel: untergeordnete Ziele werden darunter eingerückt angezeigt
- Kleine Badge/Label zeigt die Verbindung: "Teil von: [Monatsziel-Name]"
- Im Dashboard → Wochenziele: zeigt zu welchem Monatsziel das Wochenziel gehört

**DB-Funktion ergänzen:**
```typescript
getGoalsByParent(userId, parentId)  // alle Ziele die einem bestimmten Ziel untergeordnet sind
```

**Wichtig:** Bestehende Ziele ohne parent_id bleiben unverändert. Keine Migration nötig.

Test: Wochenziel anlegen, Monatsziel zuordnen, prüfen ob Verknüpfung gespeichert und
sichtbar ist. Dann Monatsziel anlegen und Quartalsziel zuordnen.

---

## PAKET 5C — Umbenennung & Aufräumen

---

### Schritt 4 — "Nordstern" → "Vision" überall ersetzen ⬜ OFFEN

**Betroffene Dateien:** Alle Dateien die "Nordstern" als UI-Label oder Platzhaltertext enthalten.
`src/pages/Settings.tsx`, `src/components/journal/JournalYear.tsx`, `src/pages/Dashboard.tsx`,
`src/lib/claude.ts` (Coach-Kontext), ggf. weitere.
**Aufwand:** Klein

**Was geändert wird:**
- Alle UI-Labels: "Nordstern" → "Vision" (oder "Meine Vision")
- Alle Platzhaltertexte die "Nordstern" erwähnen
- Coach-Kontext in claude.ts: "Nordstern" → "Vision"
- DB-Feldname `north_star` in profiles bleibt unverändert (nur UI-Label ändert sich)

**Was NICHT geändert wird:** DB-Spaltennamen (breaking change, unnötig).

Test: Alle Screens durchklicken — kein "Nordstern" mehr sichtbar.

---

### Schritt 5 — Einstellungen neu strukturieren ⬜ OFFEN

**Betroffene Dateien:** `src/pages/Settings.tsx`
**Aufwand:** Mittel

**Problem:** Einstellungen ist eine endlose Scrollseite. Profildaten sind kaum lesbar.
Alles liegt auf einer Ebene ohne klare Struktur.

**Neue Struktur — eingeklappte Sektionen:**
Jede Sektion hat einen Header der auf/zu klappt. Standard: alle eingeklappt außer "Mein Profil".

```
▼ MEIN PROFIL
  Name, E-Mail (readonly)

▶ VISION & IDENTITÄT
  Vision (readonly, großer Text gut lesbar — mit "Bearbeiten"-Button der zu Journal→Jahr führt)
  Identitätssatz (direkt editierbar, Speichern-Button)

▶ WERTE
  Werte-Tags (wie bisher, aber in eigener Sektion)

▶ STOPP-LISTE
  Liste (wie bisher)

▶ IKIGAI
  Die vier Felder + Synthese (wie bisher)

▶ HABITS & JOURNAL
  Morgenmetriken Toggle

▶ PROFIL EINRICHTEN
  "Profil-Einrichtung neu starten" Button mit Erklärung

▶ GEFAHRENZONE
  Journal-Einträge löschen, Ziele löschen, Alles löschen

▶ ACCOUNT
  Abmelden
```

Jede Sektion mit eigenem Speichern-Button wo nötig.
"Bearbeiten"-Link bei Vision führt zu Journal → Jahr → Planung.

Test: Alle Sektionen auf/zuklappen, Werte bearbeiten und speichern, Identitätssatz bearbeiten.

---

## PAKET 5D — KI an Zielen

---

### Schritt 6 — KI-Ziel-Feedback kontextuell ⬜ OFFEN

**Betroffene Dateien:** `src/components/journal/JournalWeek.tsx`, `src/components/journal/JournalMonth.tsx`,
`src/components/journal/JournalQuarter.tsx`, `src/components/journal/JournalYear.tsx`,
`src/lib/claude.ts`
**Aufwand:** Mittel

**Was gebaut wird:**
An jedem gespeicherten Ziel erscheint ein kleiner KI-Button (Stern- oder Blitz-Icon).
Klick → öffnet ein Panel direkt unter dem Ziel (kein Seitenwechsel, kein Modal).

Das Panel zeigt:
- Einen Lade-Spinner während die KI antwortet
- Die KI-Antwort als Text
- Einen "Schließen"-Button

**KI-Kontext der mitgeschickt wird:**
- Das aktuelle Ziel (Text + Ebene)
- Übergeordnete Ziele (falls verknüpft)
- Vision des Nutzers
- Identitätssatz

**System-Prompt für diesen KI-Aufruf:**
```
Du bist Lukas' persönlicher Mentor. Du kennst seine Vision und seine Ziele.
Bewerte kurz und direkt (max. 3–4 Sätze):
1. Macht dieses Ziel Sinn um die Vision zu erreichen?
2. Ist es konkret und erreichbar formuliert?
3. Eine konkrete Optimierung wenn nötig.
Kein Gelaber. Direkt zum Punkt.
```

Test: Ziel anlegen, KI-Button drücken, Antwort lesen. Fehlerfall (API überlastet) sauber abfangen.

---

## PAKET 6 — Vision & Identitätssystem

Paket 6 ist der inhaltliche Kern der App. Die Vision wird zur lebendigen obersten Ebene.
Das Identitätssystem wird als durchgehendes Element durch die gesamte App integriert.
Habits werden mit Identität und Vision verknüpft.

**Reihenfolge ist kritisch. Paket 5 muss vollständig abgeschlossen sein.**

### Pakete
- **6A — Vision-Flow** (Schritte 1–2): Geführte Vision-Erstellung + Vision als Ebene über Jahr
- **6B — Identitätssystem** (Schritte 3–4): Soll-Identität festlegen + Morgen/Abend-Integration
- **6C — Habit-KI** (Schritt 5): KI bewertet Habits gegen Identität + schlägt Habits vor
- **6D — Coach-Kontext** (Schritt 6): Coach erhält vollständigen Vision+Identität-Kontext

---

## PAKET 6A — Vision-Flow

---

### Schritt 1 — Vision: Geführter Erstellungs-Flow ⬜ OFFEN

**Betroffene Dateien:** `src/components/vision/VisionFlow.tsx` (NEU), `src/pages/Settings.tsx`,
`src/lib/claude.ts`, `src/lib/db.ts`
**Aufwand:** Groß

**Was gebaut wird:**
Ein geführter Flow zur Erstellung der persönlichen Vision. Zugänglich über:
- Einstellungen → Vision & Identität → "Vision erstellen / bearbeiten"
- Beim ersten App-Start wenn noch keine Vision vorhanden (einmalig)

**Flow-Ablauf (schrittweise, kein Zwang alles auf einmal):**

*Schritt A — Freies Schreiben:*
"Beschreibe dein Traumleben in 3–5 Jahren. Wie sieht ein typischer Tag aus?
Was hast du erreicht? Wer bist du?" — großes Textfeld, kein Limit.

*Schritt B — KI-Feedback:*
KI liest den Text und gibt strukturiertes Feedback:
- Was ist stark und klar formuliert?
- Was ist noch vage?
- 2–3 Fragen die helfen die Vision zu schärfen
Lukas kann antworten und den Text überarbeiten — beliebig oft.

*Schritt C — Vision finalisieren:*
Lukas schreibt die finale Version. KI kann auf Wunsch helfen sie zu verdichten
("Schreib das als kraftvollen, klaren Vision-Statement in 3–5 Sätzen").

*Schritt D — Speichern:*
Vision wird in `profiles.north_star` gespeichert (Feldname bleibt, Label wird "Vision").
Bestehende Vision wird überschrieben nach Bestätigung.

**Wichtig:** Der Flow kann jederzeit abgebrochen werden. Bestehende Vision bleibt erhalten.

---

### Schritt 2 — Vision als oberste Ebene in der Zielkaskade ⬜ OFFEN

**Betroffene Dateien:** `src/components/journal/JournalYear.tsx`, `src/lib/db.ts`
**Aufwand:** Klein

**Was gebaut wird:**
In Journal → Jahr → Planung:
- Vision wird oben angezeigt (readonly, schön formatiert — nicht als kleines Textfeld)
- Jahresziele haben jetzt das Dropdown "Gehört zu Vision" (aus Schritt 3 Paket 5B)
- Visuell wird die Kaskade von oben nach unten klar: Vision → Jahresziele

In der Ziel-Erstellung (alle Ebenen):
- Quartalsziel kann jetzt einem Jahresziel zugeordnet werden (Paket 5B hat das gebaut)
- Jahresziel kann jetzt der Vision zugeordnet werden (dieser Schritt)
- Die vollständige Kette ist damit schließbar: Vision → Jahr → Quartal → Monat → Woche → Tag

---

## PAKET 6B — Identitätssystem

---

### Schritt 3 — Soll-Identität: Erstellung + Verwaltung ⬜ OFFEN

**Betroffene Dateien:** `src/components/identity/IdentityFlow.tsx` (NEU), `src/pages/Settings.tsx`,
`src/lib/claude.ts`, `src/lib/db.ts`
**Aufwand:** Groß

**Konzept:**
Die Soll-Identität beschreibt wer Lukas ist wenn er seine Vision lebt.
Nicht als Ziel formuliert ("Ich will...") sondern als Gegenwart ("Ich bin...").
Beispiel: "Ich bin jemand der sein Wort hält. Ich priorisiere meinen Körper und
meine Energie. Ich handle täglich in Richtung meiner finanziellen Freiheit."

**Was gebaut wird:**

*Erstellungs-Flow (analog zu Vision-Flow):*
- Schritt A: KI stellt 3–4 Fragen: "Wer musst du sein um deine Vision zu leben?",
  "Welche Eigenschaften hat der Lukas der das erreicht hat?",
  "Was tut dieser Lukas täglich, was tust du heute noch nicht?"
- Schritt B: KI generiert Identitätsbeschreibung aus den Antworten
- Schritt C: Lukas bearbeitet und finalisiert
- Optional: KI prüft ob Identität zur Vision passt

*Verwaltung in Einstellungen → Vision & Identität:*
- Identität gut lesbar angezeigt (kein kleines Scrollfeld)
- "Bearbeiten"-Button öffnet den Flow erneut
- KI kann auf Wunsch Optimierungsvorschläge machen

**DB:** `profiles.identity_statement` — existiert bereits. Wird genutzt.

---

### Schritt 4 — Identität im täglichen Flow ⬜ OFFEN

**Betroffene Dateien:** `src/components/journal/JournalDay.tsx`, `src/pages/Dashboard.tsx`
**Aufwand:** Mittel

**Was gebaut wird:**

*Morgenjournal — Identitäts-Anzeige:*
Am Anfang des Morgen-Eintrags (vor den Metriken):
- Identität wird angezeigt — nicht editierbar, nur lesen/spüren
- Darunter optional: "Wie verkörpere ich heute meine Identität?"
  Freitext-Feld, optional ausfüllbar, max. 1–2 Sätze
  Vorschlag: "Heute bin ich der Lukas, der..." (Pre-Fill mit Anfang)
  Bezug auf heutige Aufgaben möglich aber nicht erzwungen

*Dashboard — Identitäts-Banner:*
Kurzer Identitätssatz (erste Zeile der Identität) als subtiler Banner oben im Dashboard.
Nicht aufdringlich — eher wie eine ruhige Erinnerung.

*Abendjournal — Identitäts-Abgleich:*
Nach der Tagesreflexion, vor den Habits:
- Frage: "Hast du heute als die Person gehandelt die du sein willst?"
- Antwort: Ja / Teilweise / Nein (drei Buttons, farbkodiert grün/gelb/rot)
- Bei "Teilweise" oder "Nein": Textfeld öffnet sich automatisch
  "Was lief nicht — und warum?" (optional ausfüllen, kein Zwang)
- Antwort wird in `journal_entries` gespeichert (neues Feld: `identity_check` + `identity_note`)

**SQL-Migration:**
```sql
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_check TEXT
  CHECK (identity_check IN ('yes', 'partly', 'no'));
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS identity_note TEXT;
```

---

## PAKET 6C — Habit-KI

---

### Schritt 5 — Habit-KI: Bewertung + Vorschläge ⬜ OFFEN

**Betroffene Dateien:** `src/components/journal/JournalMonth.tsx`, `src/lib/claude.ts`
**Aufwand:** Mittel

**Was gebaut wird:**

*Habit-Bewertung:*
In Journal → Monat → Planung → Habit-Sektion:
Button "Meine Habits bewerten lassen" (KI-Icon).
KI kennt: alle aktuellen Habits (Titel + Frequenz), Identität, Vision.
KI gibt Feedback: "Welche Habits unterstützen deine Identität?",
"Welche sind vielleicht nicht zielführend?", "Was fehlt?"
Antwort erscheint direkt unter dem Button, kein Seitenwechsel.

*Habit-Vorschläge:*
Button "Habits vorschlagen lassen" (KI-Icon).
KI generiert 3–5 konkrete Habit-Vorschläge passend zu Identität und Vision.
Format der Antwort: strukturierte Liste mit Titel + Beschreibung + empfohlener Frequenz.
Neben jedem Vorschlag: "+ Übernehmen"-Button.
Klick → Habit wird automatisch angelegt mit den vorgeschlagenen Werten
(Titel, Beschreibung, Frequenz) — funktioniert identisch wie manuell erstellte Habits.
Farbe wird automatisch zugewiesen (nächste freie aus den 6 Optionen).

---

## PAKET 6D — Coach-Kontext

---

### Schritt 6 — Coach erhält vollständigen Vision+Identität-Kontext ⬜ OFFEN

**Betroffene Dateien:** `src/lib/claude.ts`, `src/pages/Coach.tsx`
**Aufwand:** Klein

**Was gebaut wird:**
Der Coach-System-Prompt wird erweitert. Er kennt jetzt:
- Vision (vollständiger Text)
- Soll-Identität (vollständiger Text)
- Aktuelle Ziele aller Ebenen (Jahr/Quartal/Monat/Woche)
- Aktuelle Habits + Completion-Rate des laufenden Monats
- Letzte 7 Tage Journal-Einträge (Morgen + Abend)
- Letzte Identitäts-Checks (ja/nein/teilweise der letzten 7 Tage)

Der Coach ist damit vollständig informiert und muss nicht gefragt werden "was sind meine Ziele?"
Er kennt Lukas — Vision, Identität, aktuelle Situation, tägliche Patterns.

Kein neues UI — nur der Kontext der mitgeschickt wird wird erweitert.

---

## Abgeschlossene Pakete (Archiv)

**Paket 1 + 2A + 3A + 3B + 3C + 4 (alle 15 Schritte) — April 2026 ✅**
Details in LIFE_OS_KONTEXT.md Archiv-Sektion.
