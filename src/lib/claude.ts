import Anthropic from '@anthropic-ai/sdk'
import type { Profile, JournalEntry, Goal, CoachMessage, PatternAnalysis } from '../types'
import { LIFE_AREAS } from './lifeAreas'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

export type CoachTone = 'sachlich' | 'arschtritt' | 'anerkennend'

const TONE_INSTRUCTIONS: Record<CoachTone, string> = {
  sachlich:     'TON: Sachlich, klar, lösungsorientiert. Standard-Modus.',
  arschtritt:   'TON: ARSCHTRITT-Modus. Direkt, fordernd, ohne Beschönigung. Nenne Ausreden beim Namen. Kurze, harte Antworten. Unbequeme Fragen. Kein Mitleid mit Selbstsabotage — aber kein Beschämen.',
  anerkennend:  'TON: Anerkennend. Erkenne Fortschritte aktiv an. Betone was gut läuft — aber bleib ehrlich, nicht hohlloben.',
}

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

function buildSystemPrompt(profile: Profile, recentEntries: JournalEntry[], goals: Goal[], tone: CoachTone = 'sachlich'): string {
  const name = profile.name ?? 'Unbekannt'
  const activeGoals = goals.filter((g) => g.status === 'active')

  return `Du bist Life OS Coach — ein direkter, ehrlicher, mitfühlender Mentor für ${name}.

ÜBER ${name}:
- Vision: "${profile.north_star ?? 'noch nicht definiert'}"
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
- Beschämen oder Vorwürfe

${TONE_INSTRUCTIONS[tone]}`
}

export interface CoachHabit {
  title: string
  frequency_type: string
  frequency_value: number
  completionRate: number // 0–100
}

function buildCoachSystemPrompt(
  profile: Profile,
  recentEntries: JournalEntry[],
  goals: Goal[],
  tone: CoachTone,
  habits: CoachHabit[] = []
): string {
  const name = profile.name ?? 'du'
  const lifeAreas = profile.life_areas as Record<string, string> | null
  const aiProfile = profile.ai_profile as Record<string, unknown> | null
  const focusAreaKeys = Array.isArray(aiProfile?.focus_areas) ? (aiProfile!.focus_areas as string[]) : []

  const visionLines = lifeAreas
    ? Object.entries(lifeAreas)
        .filter(([, v]) => (v as string)?.trim())
        .map(([k, v]) => `  ${LIFE_AREAS[k as keyof typeof LIFE_AREAS]?.label ?? k}: "${v}"`)
        .join('\n')
    : '  Noch keine Visionen eingetragen.'

  const identityLines = profile.identity_statement?.trim()
    ? profile.identity_statement.split('\n').filter(Boolean).map((l) => `  - ${l}`).join('\n')
    : '  Noch nicht definiert.'

  const focusLine = focusAreaKeys.length > 0
    ? focusAreaKeys.map((k) => LIFE_AREAS[k as keyof typeof LIFE_AREAS]?.label ?? k).join(', ')
    : 'Noch nicht festgelegt.'

  const activeGoals = goals.filter((g) => g.status === 'active')
  const goalLines = [
    ...activeGoals.filter((g) => g.type === 'year').map((g) => `  [Jahr] ${g.title}`),
    ...activeGoals.filter((g) => g.type === 'quarterly').map((g) => `  [Quartal] ${g.title}`),
    ...activeGoals.filter((g) => g.type === 'monthly').map((g) => `  [Monat] ${g.title}`),
    ...activeGoals.filter((g) => g.type === 'weekly').map((g) => `  [Woche] ${g.title}`),
  ].join('\n') || '  Keine aktiven Ziele.'

  const habitLines = habits.length > 0
    ? habits.map((h) => `  - ${h.title} (${h.frequency_type === 'daily' ? 'täglich' : `${h.frequency_value}×/Wo`}) — ${h.completionRate}% Treffer diesen Monat`).join('\n')
    : '  Keine Habits aktiv.'

  const identityChecks = recentEntries
    .filter((e) => (e as Record<string, unknown>).identity_check)
    .slice(0, 5)
    .map((e) => {
      const check = (e as Record<string, unknown>).identity_check
      const label = check === 'yes' ? '✓ Ja' : check === 'partly' ? '△ Teilweise' : '✗ Nein'
      return `  ${e.entry_date}: ${label}`
    })
    .join('\n')

  return `Du bist Life OS Coach — ein direkter, ehrlicher, mitfühlender Mentor für ${name}.

VISIONEN von ${name} (10/10 — was ${name} für jeden Bereich anstrebt):
${visionLines}

IDENTITÄT / AFFIRMATIONEN:
${identityLines}

AKTUELLE SCHWERPUNKTBEREICHE: ${focusLine}

AKTIVE ZIELE:
${goalLines}

HABITS (diesen Monat):
${habitLines}

IDENTITÄTS-CHECKS (letzte Tage):
${identityChecks || '  Keine Einträge.'}

LETZTE 7 TAGE (Journal-Zusammenfassung):
${summarizeEntries(recentEntries)}

DEINE VERHALTENSREGELN:
1. Stelle maximal eine Frage pro Antwort
2. Gib keine ungebetenen Ratschläge — stelle Fragen
3. Sprich direkt und klar — kein Motivations-Bullshit
4. Erkenne Selbstsabotage, benenne sie sanft aber direkt
5. Beende jede Session mit einer Micro-Aktion ("Was ist der kleinste nächste Schritt?")
6. Antworte auf Deutsch
7. Halte Antworten unter 150 Wörtern — Qualität über Quantität
8. Du kennst ${name} — beziehe dich auf Visionen, Schwerpunkte und Muster wenn relevant

VERBOTEN:
- Generische Motivation ("Du schaffst das!")
- Lange Aufzählungen mit Ratschlägen
- Mehr als eine Frage stellen
- Beschämen oder Vorwürfe

${TONE_INSTRUCTIONS[tone]}`
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
  goals: Goal[],
  tone: CoachTone = 'sachlich',
  habits: CoachHabit[] = []
): Promise<string> {
  checkRateLimit()

  const client = getClient()
  const systemPrompt = buildCoachSystemPrompt(profile, recentEntries, goals, tone, habits)

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
    system: `Du hilfst einem Menschen, seinen Visions-Satz zu formulieren.
Basierend auf der 5-Warum-Analyse, fasse die Kernerkenntnisse zusammen und schlage einen Visions-Satz vor:
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
- Vision: "${profile.north_star ?? 'nicht definiert'}"
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

export type ReviewPeriod = 'week' | 'month' | 'quarter' | 'year'

const PERIOD_LABELS: Record<ReviewPeriod, string> = {
  week: 'Woche',
  month: 'Monat',
  quarter: 'Quartal',
  year: 'Jahr',
}

export async function generateReviewSummary(
  zeitraum: ReviewPeriod,
  entries: JournalEntry[],
  goals: Goal[],
  profile: Profile,
  reviewSummaries?: string[]
): Promise<string> {
  checkRateLimit()
  const client = getClient()

  const periodLabel = PERIOD_LABELS[zeitraum]
  const goalSummary = goals.length
    ? goals.map((g) => `- ${g.title} (${g.progress}%)`).join('\n')
    : `Keine ${periodLabel}sziele gesetzt.`

  // Für längere Zeiträume: komprimierte Review-Summaries bevorzugen
  let contextBlock: string
  if (reviewSummaries && reviewSummaries.length > 0) {
    const summaryList = reviewSummaries
      .map((s, i) => `Review ${i + 1}:\n${s}`)
      .join('\n\n---\n\n')
    contextBlock = `Vergangene Reviews des ${periodLabel}s:\n${summaryList}`
  } else {
    const entrySummary = summarizeEntries(entries)
    const dayCount = zeitraum === 'week' ? '7' : zeitraum === 'month' ? '30' : zeitraum === 'quarter' ? '90' : '365'
    contextBlock = `Journal-Einträge der letzten ${dayCount} Tage:\n${entrySummary}`
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `Du bist Life OS Coach. Erstelle eine ehrliche, prägnante ${periodLabel}-Zusammenfassung für ${profile.name ?? 'den Nutzer'}.
Analysiere Muster, Energie, Fortschritt und blinde Flecken über den ${periodLabel}szeitraum. Maximal 150 Wörter. Kein Motivations-Bullshit. Antworte auf Deutsch.`,
    messages: [
      {
        role: 'user',
        content: `${periodLabel}sziele:\n${goalSummary}\n\n${contextBlock}\n\nFasse den ${periodLabel}szeitraum zusammen.`,
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
    if (context?.northStar) parts.push(`Vision: ${context.northStar}`)
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

export async function generatePeriodSummary(
  periodType: 'week' | 'month' | 'quarter' | 'year',
  periodLabel: string,
  planningData: Record<string, unknown>,
  reflectionData: Record<string, unknown>,
  profile: Profile | null
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'der Nutzer'
  const periodNames: Record<string, string> = { week: 'Woche', month: 'Monat', quarter: 'Quartal', year: 'Jahr' }
  const periodName = periodNames[periodType] ?? periodType

  const planText = Object.entries(planningData)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n') || 'Keine Planungsdaten.'

  const reflText = Object.entries(reflectionData)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n') || 'Keine Reflexionsdaten.'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: `Du bist Life OS Coach. Erstelle eine ehrliche, prägnante ${periodName}s-Zusammenfassung für ${name}.
Analysiere was geplant war, was tatsächlich passierte, und die wichtigste Erkenntnis.
Maximal 150 Wörter. Kein Motivations-Bullshit. Direkt. Antworte auf Deutsch.`,
    messages: [{
      role: 'user',
      content: `Zeitraum: ${periodLabel}\n\nPlanung:\n${planText}\n\nReflexion:\n${reflText}\n\nFasse zusammen.`,
    }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function getGoalFeedback(
  goal: Goal,
  parentGoal: Goal | null,
  profile: Profile | null
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'Lukas'

  const systemPrompt = `Du bist ${name}s persönlicher Mentor. Du kennst seine Vision und seine Ziele.
Bewerte kurz und direkt (max. 3–4 Sätze):
1. Macht dieses Ziel Sinn um die Vision zu erreichen?
2. Ist es konkret und erreichbar formuliert?
3. Eine konkrete Optimierung wenn nötig.
Kein Gelaber. Direkt zum Punkt. Antworte auf Deutsch.`

  const lines = [
    `Ziel: "${goal.title}"`,
    `Ebene: ${goal.type}`,
    parentGoal ? `Übergeordnetes Ziel: "${parentGoal.title}"` : null,
    profile?.north_star ? `Vision: "${profile.north_star}"` : null,
    profile?.identity_statement ? `Identitätssatz: "${profile.identity_statement}"` : null,
  ].filter(Boolean).join('\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: systemPrompt,
    messages: [{ role: 'user', content: lines }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function getGoalFeedbackFollowup(
  goal: Goal,
  originalFeedback: string,
  followupQuestion: string,
  profile: Profile | null,
  previousHistory: Array<{ question: string; answer: string }> = []
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'Lukas'

  const contextLine = [
    `Ziel: "${goal.title}"`,
    profile?.north_star ? `Vision: "${profile.north_star}"` : null,
  ].filter(Boolean).join('\n')

  // Build multi-turn messages: context → initial feedback → previous Q&A → new question
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: contextLine },
    { role: 'assistant', content: originalFeedback },
  ]
  for (const entry of previousHistory) {
    messages.push({ role: 'user', content: entry.question })
    messages.push({ role: 'assistant', content: entry.answer })
  }
  messages.push({ role: 'user', content: followupQuestion })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: `Du bist ${name}s persönlicher Mentor. Du beantwortest eine Rückfrage zu deiner Ziel-Bewertung. Direkt und konkret. Max. 3–4 Sätze. Auf Deutsch.`,
    messages,
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
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
      content: `Bitte bewerte dieses Ziel:\n\n${context}\n\nFragen: Ist das Ziel noch auf Kurs? Stimmt es mit meiner Vision überein? Was beobachtest du?`,
    }],
  })
  const resultBlock = response.content[0]
  if (resultBlock.type !== 'text') throw new Error('Unexpected response type from Claude')
  return resultBlock.text
}

export async function getEveningImpulse(
  accomplished: string,
  energyLevel: number,
  profile: Profile | null
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'du'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 120,
    system: `Du bist ein direkter, sachlicher Lebensmentor für ${name}. Antworte auf Deutsch. Maximal 2 kurze Sätze. Kein Gelaber, keine leeren Floskeln.`,
    messages: [{
      role: 'user',
      content: `Was ich heute geschafft habe: "${accomplished || 'Nichts aufgeschrieben'}"\nEnergie-Level: ${energyLevel}/10\n\nGib mir einen kurzen Mentor-Abschluss für den Tag.`,
    }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

export async function getMorningImpulse(
  mainGoal: string,
  tasks: string[],
  profile: Profile | null,
  weeklyGoals: string[] = []
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'du'
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const taskList = tasks.length > 0 ? tasks.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'Keine Tasks definiert.'
  const weekGoalList = weeklyGoals.length > 0 ? weeklyGoals.map((g, i) => `${i + 1}. ${g}`).join('\n') : 'Keine Wochenziele gesetzt.'

  const contextLines: string[] = [
    `Heute: ${today}`,
    `Hauptziel für heute: "${mainGoal || 'nicht definiert'}"`,
    `Tagesaufgaben:\n${taskList}`,
    `Wochenziele (aktuell):\n${weekGoalList}`,
  ]
  if (profile?.north_star) contextLines.push(`Vision: "${profile.north_star}"`)
  if (profile?.identity_statement) contextLines.push(`Identität: "${profile.identity_statement}"`)
  contextLines.push(`\nGib ${name} einen konkreten Mentor-Impuls für den Tagesstart.`)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: `Du bist ein direkter, ehrlicher Lebensmentor für ${name}. Antworte auf Deutsch in 3–5 konkreten Sätzen. Beziehe dich explizit auf die heutigen Aufgaben und/oder Wochenziele. Kein leeres Motivationsgerede — personalisiert und auf den Punkt.`,
    messages: [{
      role: 'user',
      content: contextLines.join('\n\n'),
    }],
  })
  const impulseBlock = response.content[0]
  if (impulseBlock.type !== 'text') throw new Error('Unexpected response type from Claude')
  return impulseBlock.text
}

export interface YearStartAnalysis {
  scores: Record<string, { score: number; reason: string }>
  focusAreas: string[]
  goals: Record<string, string>
}

export async function generateYearStartAnalysis(
  visions: Record<string, string>,
  profile: Profile | null,
  year: number
): Promise<YearStartAnalysis> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'du'

  const visionLines = Object.entries(visions)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${k}: "${v}"`)
    .join('\n')

  const lifeAreaKeys = ['body_mind', 'social', 'love', 'finance', 'career', 'meaning']

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: `Du analysierst ${name}'s Jahresstart für ${year} und gibst strukturierte Empfehlungen. Antworte ausschließlich mit einem validen JSON-Objekt — kein Text davor oder danach, keine Markdown-Codeblöcke.`,
    messages: [{
      role: 'user',
      content: `Lebens-Visionen von ${name}:
${visionLines || 'Noch keine Visionen eingetragen.'}

Erstelle eine Jahresstart-Analyse. Antworte NUR mit diesem JSON (alle 6 Schlüssel müssen enthalten sein):
{
  "scores": {
    "body_mind": {"score": 1-10, "reason": "kurze Begründung in Alltagssprache"},
    "social": {"score": 1-10, "reason": "..."},
    "love": {"score": 1-10, "reason": "..."},
    "finance": {"score": 1-10, "reason": "..."},
    "career": {"score": 1-10, "reason": "..."},
    "meaning": {"score": 1-10, "reason": "..."}
  },
  "focusAreas": ["key1", "key2"],
  "goals": {
    "key": "konkretes Jahresziel in Ich-Form, 1 Satz"
  }
}

Regeln:
- scores: Schätze den typischen Startpunkt realistisch, basierend auf der Vision (je ambitionierter die Vision, desto wahrscheinlicher niedriger Ist-Stand).
- focusAreas: Wähle 2–3 Schlüssel aus: ${lifeAreaKeys.join(', ')}
- goals: Nur für Bereiche mit eingetragener Vision. Konkret, messbar, 1 Satz.
- Alltagssprache, keine Floskeln.`,
    }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')

  const text = block.text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '')
  const parsed = JSON.parse(text) as YearStartAnalysis
  return parsed
}

export async function generateIdentityAffirmations(
  visions: Record<string, string>,
  profile: Profile | null
): Promise<string[]> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'du'

  const visionLines = Object.entries(visions)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${k}: "${v}"`)
    .join('\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: `Du hilfst ${name} dabei, Identitäts-Affirmationen zu formulieren die zu seiner Lebens-Vision passen. Antworte ausschließlich auf Deutsch. Schreibe NUR die Affirmationen — eine pro Zeile, keine Nummerierung, kein Kommentar davor oder danach.

Stil-Regeln:
- Beginne jede Affirmation mit "Ich bin jemand, der/die..." oder "Ich..."
- Kurze, klare Alltagssprache — wie ${name} selbst sprechen würde
- Keine Floskeln, kein Motivations-Bullshit
- Konkret und direkt`,
    messages: [{
      role: 'user',
      content: `Lebens-Visionen von ${name}:
${visionLines || 'Noch keine Visionen eingetragen.'}

Generiere 5–7 Identitäts-Affirmationen die aus diesen Visionen abgeleitet sind.`,
    }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 8)
}

export async function generateVisionProposal(
  areaLabel: string,
  userInput: string,
  profile: Profile | null
): Promise<string> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'du'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: `Du formulierst eine persönliche Vision für ${name}. Schreibe exakt so wie ${name} selbst schreiben würde — nicht wie ein Coach oder Motivationsredner. Antworte ausschließlich auf Deutsch. Schreibe NUR den Vision-Text, kein Kommentar davor oder danach.

Stil-Regeln (strikt einhalten):
- Kurze, klare Sätze. Kein Blumensprech, keine Metaphern.
- Alltagssprache — so wie man es einem Freund erzählen würde.
- Erste Person Singular ("Ich...").
- Präsens, als wäre es bereits Realität.
- Maximal 4–5 Sätze.
- Nur das aufgreifen was der Nutzer selbst genannt hat — nichts erfinden.`,
    messages: [{
      role: 'user',
      content: `Lebensbereich: "${areaLabel}"

Rohgedanken:
"${userInput}"

Formuliere daraus die Vision in meinen eigenen Worten.`,
    }],
  })
  const visionBlock = response.content[0]
  if (visionBlock.type !== 'text') throw new Error('Unexpected response type from Claude')
  return visionBlock.text.trim()
}

export interface HabitEvaluation {
  habitTitle: string
  rating: 'gut' | 'ok' | 'schwach'
  reason: string
}

export interface HabitSuggestion {
  title: string
  description: string
  frequency_type: 'daily' | 'weekly'
  frequency_value: number
  reason: string
}

export interface HabitAnalysis {
  evaluations: HabitEvaluation[]
  suggestions: HabitSuggestion[]
}

export async function generateHabitAnalysis(
  habits: Array<{ title: string; description: string | null; frequency_type: string; frequency_value: number }>,
  profile: Profile | null
): Promise<HabitAnalysis> {
  checkRateLimit()
  const client = getClient()
  const name = profile?.name ?? 'du'
  const lifeAreas = profile?.life_areas as Record<string, string> | null
  const visionLines = lifeAreas
    ? Object.entries(lifeAreas).filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v}`).join('\n')
    : ''
  const identityLines = profile?.identity_statement?.trim() ?? ''
  const habitLines = habits.length > 0
    ? habits.map((h) => `- ${h.title}${h.description ? ` (${h.description})` : ''}, ${h.frequency_type === 'daily' ? 'täglich' : `${h.frequency_value}×/Woche`}`).join('\n')
    : 'Noch keine Habits.'

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: `Du bist ein ehrlicher Lebens-Coach für ${name}. Antworte ausschließlich auf Deutsch. Antworte NUR mit einem validen JSON-Objekt, ohne Markdown-Codeblöcke.`,
    messages: [{
      role: 'user',
      content: `Visionen von ${name}:
${visionLines || 'Noch keine Visionen.'}

Identität:
${identityLines || 'Noch nicht definiert.'}

Aktuelle Habits:
${habitLines}

Analysiere die aktuellen Habits (rating: "gut"/"ok"/"schwach" — wie gut passt der Habit zur Vision und Identität) und schlage 2–3 neue Habits vor die zur Vision passen aber noch fehlen.

Antworte mit exakt diesem JSON:
{
  "evaluations": [
    { "habitTitle": "...", "rating": "gut|ok|schwach", "reason": "..." }
  ],
  "suggestions": [
    { "title": "...", "description": "...", "frequency_type": "daily|weekly", "frequency_value": 1, "reason": "..." }
  ]
}`,
    }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  const cleaned = block.text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned) as HabitAnalysis
  } catch {
    throw new Error('KI-Antwort konnte nicht verarbeitet werden.')
  }
}

