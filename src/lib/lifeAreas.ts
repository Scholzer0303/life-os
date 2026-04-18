// Lebensbereiche — zentrale Definitionen (Farben, Labels, Reihenfolge)
// Wird app-weit verwendet: Ziele, Lebensrad, Journal, Dashboard

export type LifeArea = 'body_mind' | 'social' | 'love' | 'finance' | 'career' | 'meaning'

export interface LifeAreaDef {
  key: LifeArea
  label: string
  color: string          // Hex-Wert für direkte Nutzung in inline styles
  cssVar: string         // CSS-Variable für Tailwind/CSS
  bgAlpha: string        // Hintergrund mit niedriger Deckkraft (10%)
  borderAlpha: string    // Rahmen mit niedriger Deckkraft (25%)
}

export const LIFE_AREAS: Record<LifeArea, LifeAreaDef> = {
  body_mind: {
    key: 'body_mind',
    label: 'Körper & Geist',
    color: '#3b82f6',
    cssVar: 'var(--life-body-mind)',
    bgAlpha: 'color-mix(in srgb, #3b82f6 10%, transparent)',
    borderAlpha: 'color-mix(in srgb, #3b82f6 25%, transparent)',
  },
  social: {
    key: 'social',
    label: 'Soziales',
    color: '#22c55e',
    cssVar: 'var(--life-social)',
    bgAlpha: 'color-mix(in srgb, #22c55e 10%, transparent)',
    borderAlpha: 'color-mix(in srgb, #22c55e 25%, transparent)',
  },
  love: {
    key: 'love',
    label: 'Liebe',
    color: '#ec4899',
    cssVar: 'var(--life-love)',
    bgAlpha: 'color-mix(in srgb, #ec4899 10%, transparent)',
    borderAlpha: 'color-mix(in srgb, #ec4899 25%, transparent)',
  },
  finance: {
    key: 'finance',
    label: 'Finanzen',
    color: '#eab308',
    cssVar: 'var(--life-finance)',
    bgAlpha: 'color-mix(in srgb, #eab308 10%, transparent)',
    borderAlpha: 'color-mix(in srgb, #eab308 25%, transparent)',
  },
  career: {
    key: 'career',
    label: 'Karriere',
    color: '#f97316',
    cssVar: 'var(--life-career)',
    bgAlpha: 'color-mix(in srgb, #f97316 10%, transparent)',
    borderAlpha: 'color-mix(in srgb, #f97316 25%, transparent)',
  },
  meaning: {
    key: 'meaning',
    label: 'Sinn',
    color: '#a855f7',
    cssVar: 'var(--life-meaning)',
    bgAlpha: 'color-mix(in srgb, #a855f7 10%, transparent)',
    borderAlpha: 'color-mix(in srgb, #a855f7 25%, transparent)',
  },
}

// Reihenfolge für konsistente Darstellung überall in der App
export const LIFE_AREA_ORDER: LifeArea[] = [
  'body_mind', 'social', 'love', 'finance', 'career', 'meaning',
]

// Hilfsfunktion: LifeAreaDef aus key holen (mit Fallback)
export function getLifeArea(key: string | null | undefined): LifeAreaDef | null {
  if (!key) return null
  return LIFE_AREAS[key as LifeArea] ?? null
}
