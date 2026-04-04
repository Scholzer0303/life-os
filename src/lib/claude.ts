import Anthropic from '@anthropic-ai/sdk'
import type { Profile, JournalEntry, Goal, CoachMessage, PatternAnalysis } from '../types'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

// Rate limiting: max 1 request per 10 seconds
let lastRequestTime = 0
const MIN_INTERVAL_MS = 10_000

function checkRateLimit() {
  const now = Date.now()
  if (now - lastRequestTime < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - lastRequestTime)) / 1000)
    throw new Error(`Bitte warte noch ${waitSec} Sekunden.`)
  }
  lastRequestTime = now
}

function summarizeEntries(entries: JournalEntry[]): string {
  if (!entries.length) return 'Keine Einträge vorhanden.'
  return entries
    .slice(0, 7)
    .map((e) => {
      const parts: string[] = [`[${e.entry_date} / ${e.type}]`]
      if (e.main_goal_today) parts.push(`Ziel: ${e.main_goal_today}`)
      if (e.accomplished) parts.push(`Geschafft: ${e.accomplished}`)
      if (e.what_blocked) parts.push(`Blockiert von: ${e.what_blocked}`)
      if (e.free_text) parts.push(`Freitext: ${e.free_text.slice(0, 100)}`)
      return parts.join(' | ')
    })
    .join('\n')
}

function buildSystemPrompt(profile: Profile, recentEntries: JournalEntry[], goals: Goal[]): string {
  const name = profile.name ?? 'Unbekannt'
  const activeGoals = goals.filter((g) => g.status === 'active')

  return `Du bist Life OS Coach — ein direkter, ehrlicher, mitfühlender Mentor für ${name}.

ÜBER ${name}:
- Nordstern-Vision: "${profile.north_star ?? 'noch nicht definiert'}"
- Wichtigste Werte: ${(profile.values ?? []).slice(0, 5).join(', ') || 'noch nicht definiert'}
- Stopp-Liste (was er/sie explizit nicht mehr tut): ${(profile.stop_list ?? []).join(', ') || 'noch nicht definiert'}
${(profile.ikigai as Record<string, string> | null)?.synthesis ? `- IKIGAI-KERN: ${(profile.ikigai as Record<string, string>).synthesis}` : ''}

AKTUELLE ZIELE:
${activeGoals.length ? activeGoals.map((g) => `- [${g.type}] ${g.title} (${g.progress}%)`).join('\n') : 'Keine aktiven Ziele.'}

LETZTE 7 TAGE (Journal-Zusammenfassung):
${summarizeEntries(recentEntries)}

ERKANNTE MUSTER:
${JSON.stringify(profile.energy_pattern ?? {})}

DEINE VERHALTENSREGELN:
1. Stelle maximal eine Frage pro Antwort
2. Gib keine ungebetenen Ratschläge — stelle Fragen
3. Sprich direkt und klar — kein Motivations-Bullshit
4. Erkenne Selbstsabotage, benenne sie sanft aber direkt
5. Beende jede Session mit einer Micro-Aktion ("Was ist der kleinste nächste Schritt?")
6. Antworte auf Deutsch
7. Halte Antworten unter 150 Wörtern — Qualität über Quantität
8. Du kennst ${name} — du erinnerst dich an Muster, Rückschläge und Erfolge

VERBOTEN:
- Generische Motivation ("Du schaffst das!")
- Lange Aufzählungen mit Ratschlägen
- Mehr als eine Frage stellen
- Beschämen oder Vorwürfe`
}

// The client is created lazily so it picks up the env var at runtime
function getClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY nicht gesetzt.')
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

export async function sendCoachMessage(
  messages: CoachMessage[],
  profile: Profile,
  recentEntries: JournalEntry[],
  goals: Goal[]
): Promise<string> {
  checkRateLimit()

  const client = getClient()
  const systemPrompt = buildSystemPrompt(profile, recentEntries, goals)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function getJournalFeedback(
  entry: JournalEntry,
  profile: Profile,
  goals: Goal[]
): Promise<string> {
  checkRateLimit()

  const client = getClient()
  const systemPrompt = buildSystemPrompt(profile, [entry], goals)

  const entryText = [
    entry.accomplished && `Geschafft: ${entry.accomplished}`,
    entry.what_blocked && `Blockiert: ${entry.what_blocked}`,
    entry.energy_level && `Energie: ${entry.energy_level}/10`,
    entry.free_text && `Freitext: ${entry.free_text}`,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Hier ist mein heutiger Abend-Eintrag:\n\n${entryText}\n\nWas beobachtest du?`,
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function runFiveWhys(answers: string[]): Promise<string> {
  checkRateLimit()

  const client = getClient()

  const conversation = answers.map((a, i) => ({
    role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content: a,
  }))

  // API erfordert dass die letzte Nachricht vom Typ "user" ist
  if (conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant') {
    conversation.push({ role: 'user' as const, content: 'Bitte stelle mir die nächste Warum-Frage.' })
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `Du führst eine 5-Warum-Analyse durch. Stelle eine einzige, tiefergehende Warum-Frage basierend auf der letzten Antwort.
Ziel: Das echte Motiv hinter dem Oberflächenwunsch freilegen.
Antworte auf Deutsch. Maximal 2 Sätze.`,
    messages: conversation,
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function summarizeNorthStar(fiveWhysAnswers: string[]): Promise<string> {
  checkRateLimit()

  const client = getClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `Du hilfst einem Menschen, seinen Nordstern-Satz zu formulieren.
Basierend auf der 5-Warum-Analyse, fasse die Kernerkenntnisse zusammen und schlage einen Nordstern-Satz vor:
"In 3 Jahren bin ich [X], erkennbar daran, dass [Y]"
Antworte auf Deutsch. Sei präzise, nicht pathetisch.`,
    messages: [
      {
        role: 'user',
        content: `Meine 5-Warum-Antworten:\n\n${fiveWhysAnswers.join('\n\n')}`,
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function handlePatternInterrupt(
  userText: string,
  profile: Profile,
  recentEntries: JournalEntry[],
  _goals: Goal[]
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile.name ?? 'du'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `Du bist Life OS Coach. ${name} ist gerade aus dem Rhythmus — kein Eintrag seit mehreren Tagen oder Wochen.
WICHTIG: Null Beschämung. Kein "Du hättest..." oder "Du solltest...".
Reagiere mitfühlend und direkt. Erkenne was los ist. Schlage am Ende EINE einzige kleine Aufgabe für heute vor — nichts Großes, kein System neu aufsetzen.
Antworte auf Deutsch. Maximal 150 Wörter.

Kontext über ${name}:
- Nordstern: "${profile.north_star ?? 'nicht definiert'}"
- Letzte Journal-Einträge: ${summarizeEntries(recentEntries)}`,
    messages: [
      {
        role: 'user',
        content: userText,
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function generateWeeklySummary(
  recentEntries: JournalEntry[],
  weeklyGoals: Goal[],
  profile: Profile
): Promise<string> {
  checkRateLimit()
  const client = getClient()

  const entrySummary = summarizeEntries(recentEntries)
  const goalSummary = weeklyGoals.length
    ? weeklyGoals.map((g) => `- ${g.title} (${g.progress}%)`).join('\n')
    : 'Keine Wochenziele gesetzt.'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `Du bist Life OS Coach. Erstelle eine ehrliche, prägnante Wochen-Zusammenfassung für ${profile.name ?? 'den Nutzer'}.
Analysiere Muster, Energie, Fortschritt und blinde Flecken. Maximal 120 Wörter. Kein Motivations-Bullshit. Antworte auf Deutsch.`,
    messages: [
      {
        role: 'user',
        content: `Wochenziele:\n${goalSummary}\n\nJournal-Einträge der Woche:\n${entrySummary}\n\nFasse die Woche zusammen.`,
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function generateWeeklyFeedback(
  wentWell: string,
  wouldChange: string,
  recentEntries: JournalEntry[],
  weeklyGoals: Goal[],
  profile: Profile
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const systemPrompt = buildSystemPrompt(profile, recentEntries, weeklyGoals)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Mein Wochen-Review:\n\nWas lief gut: ${wentWell}\n\nWas ich ändern würde: ${wouldChange}\n\nWas beobachtest du? Welche Micro-Aktion empfiehlst du für die nächste Woche?`,
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function generateIkigaiSynthesis(
  loves: string,
  goodAt: string,
  paidFor: string,
  worldNeeds: string
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Basierend auf: Liebe=${loves}, Können=${goodAt}, Bezahlung=${paidFor}, Weltbedarf=${worldNeeds} — formuliere den Ikigai-Kern in 1-2 prägnanten Sätzen auf Deutsch. Direkt und kraftvoll, keine Floskeln.`,
      },
    ],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

interface IdentityContext {
  northStar?: string
  values?: string[]
  ikigaiSynthesis?: string
  fiveWhysSummary?: string
}

export async function reformulateIdentity(userText: string, context?: IdentityContext): Promise<string> {
  checkRateLimit()
  const client = getClient()

  let prompt: string
  if (userText.trim()) {
    prompt = `Der User beschreibt sein zukünftiges Ich: ${userText}. Forme es um in kraftvolle Gegenwartsform ('Ich bin...', 'Ich habe...', 'Ich lebe...'). Max. 4 Sätze. Deutsch. Nah am Original.`
  } else {
    const parts: string[] = []
    if (context?.northStar) parts.push(`Nordstern: ${context.northStar}`)
    if (context?.values?.length) parts.push(`Wichtigste Werte: ${context.values.join(', ')}`)
    if (context?.ikigaiSynthesis) parts.push(`Ikigai-Kern: ${context.ikigaiSynthesis}`)
    if (context?.fiveWhysSummary) parts.push(`5-Warum-Kette: ${context.fiveWhysSummary}`)
    prompt = `Basierend auf diesen Onboarding-Antworten:\n${parts.join('\n')}\n\nGeneriere eine kraftvolle Identitäts-Aussage in Gegenwartsform ('Ich bin...', 'Ich habe...', 'Ich lebe...'). Max. 4 Sätze. Deutsch.`
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function generatePatternAnalysis(
  profile: Profile,
  entries: JournalEntry[],
  goals: Goal[]
): Promise<PatternAnalysis> {
  checkRateLimit()
  const client = getClient()

  const ikigai = profile.ikigai as Record<string, string> | null
  const entrySummary = entries
    .map((e) =>
      `Datum: ${e.entry_date} | Typ: ${e.type} | Feeling: ${e.feeling_score ?? '-'}/5 | Ziel: ${e.main_goal_today ?? '-'} | Blocker: ${e.what_blocked ?? '-'} | Energie: ${e.energy_level ?? '-'}/10 | Geschafft: ${e.accomplished ?? '-'}`
    )
    .join('\n')

  const prompt = `Du analysierst Journal-Einträge als Verhaltenspsychologe.

NORDSTERN: ${profile.north_star ?? 'nicht angegeben'}
WERTE: ${(profile.values ?? []).join(', ') || 'nicht angegeben'}
IKIGAI-KERN: ${ikigai?.synthesis ?? 'nicht angegeben'}
IDENTITÄT: ${profile.identity_statement ?? 'nicht angegeben'}
AKTIVE ZIELE: ${goals.filter((g) => g.status === 'active').map((g) => g.title).join(', ') || 'keine'}

EINTRÄGE (${entries.length} Stück, älteste zuerst):
${entrySummary}

Antworte AUSSCHLIESSLICH als valides JSON ohne Markdown-Backticks:
{"energyPatterns":"...","focusPatterns":"...","sabotagePatterns":"...","progressObservation":"...","coachQuestion":"..."}

Konkret, direkt, nicht wertend. Echte Zahlen aus den Daten verwenden. Auf Deutsch.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')

  // Strip potential markdown backticks
  const cleaned = block.text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned) as Omit<PatternAnalysis, 'generatedAt'>

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  }
}

export async function checkGoalAlignment(
  goal: Goal,
  parentGoal: Goal | null,
  profile: Profile,
  recentEntries: JournalEntry[],
  allGoals: Goal[]
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const systemPrompt = buildSystemPrompt(profile, recentEntries, allGoals)
  const context = [
    `Ziel: "${goal.title}"`,
    goal.description && `Beschreibung: ${goal.description}`,
    `Typ: ${goal.type} | Fortschritt: ${goal.progress}% | Status: ${goal.status}`,
    parentGoal && `Übergeordnetes Ziel: "${parentGoal.title}"`,
  ].filter(Boolean).join('\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Bitte bewerte dieses Ziel:\n\n${context}\n\nFragen: Ist das Ziel noch auf Kurs? Stimmt es mit meinem Nordstern überein? Was beobachtest du?`,
    }],
  })
  const resultBlock = response.content[0]
  if (resultBlock.type !== 'text') throw new Error('Unexpected response type from Claude')
  return resultBlock.text
}
