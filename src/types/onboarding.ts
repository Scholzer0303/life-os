export interface LebensradScores {
  Gesundheit: number
  Finanzen: number
  Karriere: number
  Beziehungen: number
  Persönlichkeit: number
  Freizeit: number
  Umfeld: number
  Sinn: number
}

export const LEBENSRAD_AREAS = [
  'Gesundheit',
  'Finanzen',
  'Karriere',
  'Beziehungen',
  'Persönlichkeit',
  'Freizeit',
  'Umfeld',
  'Sinn',
] as const

export const ALL_VALUES = [
  'Freiheit',
  'Sicherheit',
  'Einfluss',
  'Familie',
  'Wachstum',
  'Abenteuer',
  'Kreativität',
  'Gerechtigkeit',
  'Wohlstand',
  'Verbindung',
  'Gesundheit',
  'Wirkung',
] as const

export type Value = (typeof ALL_VALUES)[number]

export interface FiveWhysEntry {
  question: string
  answer: string
}

export interface OnboardingData {
  name: string
  lebensrad: LebensradScores
  selectedValues: Value[]
  fiveWhys: FiveWhysEntry[]
  northStar: string
  stopList: string[]
  firstGoalTitle: string
  firstGoalDescription: string
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  name: '',
  lebensrad: {
    Gesundheit: 5,
    Finanzen: 5,
    Karriere: 5,
    Beziehungen: 5,
    Persönlichkeit: 5,
    Freizeit: 5,
    Umfeld: 5,
    Sinn: 5,
  },
  selectedValues: [],
  fiveWhys: [],
  northStar: '',
  stopList: [],
  firstGoalTitle: '',
  firstGoalDescription: '',
}
