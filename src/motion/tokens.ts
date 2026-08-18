import type { Transition, Variants } from 'motion/react'

/** KampeDrop motion — playful spring for Gen Z energy, still readable. */
export const easeOut = [0.22, 1, 0.36, 1] as const
export const easeInOut = [0.65, 0, 0.35, 1] as const
export const springSoft = { type: 'spring' as const, stiffness: 280, damping: 28 }
export const springSnap = { type: 'spring' as const, stiffness: 420, damping: 32 }
export const springPop = { type: 'spring' as const, stiffness: 520, damping: 16 }
export const springWobble = { type: 'spring' as const, stiffness: 380, damping: 12 }

export const duration = {
  fast: 0.28,
  base: 0.5,
  slow: 0.8,
  hero: 1.05,
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: duration.base, ease: easeOut },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.base, ease: easeOut },
  },
}

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.06,
    },
  },
}

export const staggerFast: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.fast, ease: easeInOut },
  },
}

export const heroWord: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: duration.hero, ease: easeOut },
  },
}

export const lockIn: Variants = {
  hidden: { opacity: 0, scale: 0.6, rotate: -12 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: springSnap,
  },
}

export const lineDraw = {
  hidden: { scaleX: 0, originX: 0 },
  show: {
    scaleX: 1,
    transition: { duration: duration.slow, ease: easeOut },
  },
}

export const hoverLift = {
  y: -4,
  transition: springSoft,
}

export const tapPress = {
  scale: 0.97,
  transition: { duration: 0.12 },
}

export const scrollViewport = { once: true, amount: 0.25 as const, margin: '0px 0px -8% 0px' }

export const slowFloatTransition: Transition = {
  duration: 5.5,
  repeat: Infinity,
  repeatType: 'mirror',
  ease: 'easeInOut',
}
