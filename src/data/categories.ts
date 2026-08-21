import type { Category } from './vendors'

/** Buyer-facing labels — playful, short. */
export const categoryLabel: Record<Category, string> = {
  food: 'Foods',
  mart: 'Mall',
  pharmacy: 'Pharmacy',
  store: 'Stores',
}

export const categoryOrder: Category[] = ['food', 'mart', 'pharmacy', 'store']

export type CategoryTheme = {
  id: Category
  label: string
  hint: string
  /** Hero line on category page */
  headline: string
  sub: string
  /** Soft page wash */
  wash: string
  accent: string
  accentSoft: string
  ink: string
  chip: string
  chipText: string
}

export const categoryThemes: Record<Category, CategoryTheme> = {
  food: {
    id: 'food',
    label: 'Foods',
    hint: 'Kitchens & pepper soup',
    headline: 'Hungry?',
    sub: 'Home pots, grill smoke, and Sunday jollof — near you in Badagry.',
    wash: 'linear-gradient(165deg, #fff4eb 0%, #ffe8d6 45%, #e6f0ee 100%)',
    accent: '#d9772f',
    accentSoft: 'rgba(217, 119, 47, 0.14)',
    ink: '#3a1f12',
    chip: '#fff8f1',
    chipText: '#b85a1c',
  },
  mart: {
    id: 'mart',
    label: 'Mall',
    hint: 'Everyday staples',
    headline: 'Stock up',
    sub: 'Rice, oil, eggs, detergent — the things homes actually run out of.',
    wash: 'linear-gradient(165deg, #eef8f2 0%, #dcefe3 50%, #e6f0ee 100%)',
    accent: '#2a5c38',
    accentSoft: 'rgba(42, 92, 56, 0.12)',
    ink: '#143028',
    chip: '#f3faf6',
    chipText: '#1a5f4a',
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    hint: 'Sealed & careful',
    headline: 'Feel better',
    sub: 'OTC essentials, sealed packs, careful handoff — no roadside guessing.',
    wash: 'linear-gradient(165deg, #eef7f8 0%, #d9eef0 48%, #e6f0ee 100%)',
    accent: '#0c6560',
    accentSoft: 'rgba(12, 101, 96, 0.12)',
    ink: '#0f2a32',
    chip: '#f4f9fb',
    chipText: '#084845',
  },
  store: {
    id: 'store',
    label: 'Stores',
    hint: 'Neighbourhood shops',
    headline: 'Around the corner',
    sub: 'Local stores and counters — small runs, big convenience.',
    wash: 'linear-gradient(165deg, #f3f0ff 0%, #e8e4f8 48%, #e6f0ee 100%)',
    accent: '#5b4a9a',
    accentSoft: 'rgba(91, 74, 154, 0.12)',
    ink: '#1f1833',
    chip: '#f7f5fc',
    chipText: '#4a3d7a',
  },
}

export function isCategory(value: string): value is Category {
  return (
    value === 'food' ||
    value === 'mart' ||
    value === 'pharmacy' ||
    value === 'store'
  )
}

/** Fisher–Yates shuffle (copy). */
export function shuffleCopy<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}
