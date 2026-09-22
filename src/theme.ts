export const themeClass =
  'h-full w-full bg-background text-white flex flex-col p-2 sm:p-4 md:p-6 box-border overflow-hidden'

export const tierColors = {
  S: 'var(--color-tier-s)',
  A: 'var(--color-tier-a)',
  B: 'var(--color-tier-b)',
  C: 'var(--color-tier-c)',
  D: 'var(--color-tier-d)',
  F: 'var(--color-tier-f)',
} as const

export type TierLetter = keyof typeof tierColors
