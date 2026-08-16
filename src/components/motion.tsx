import {
  motion,
  useReducedMotion,
  type Variants,
} from 'motion/react'
import type { ReactNode } from 'react'
import {
  fadeUp,
  scrollViewport,
  stagger,
  staggerFast,
} from '../motion/tokens'

type RevealProps = {
  children: ReactNode
  className?: string
  variants?: Variants
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article' | 'header' | 'p' | 'h1' | 'h2' | 'h3' | 'span'
}

export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay = 0,
  as = 'div',
}: RevealProps) {
  const reduce = useReducedMotion()
  const Comp = motion[as]

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <Comp
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={scrollViewport}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Comp>
  )
}

export function Stagger({
  children,
  className,
  as = 'div',
  fast = false,
  /** Use mount animation instead of scroll — needed for filterable lists */
  immediate = false,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'ul' | 'ol' | 'section'
  fast?: boolean
  immediate?: boolean
}) {
  const reduce = useReducedMotion()
  const Comp = motion[as]

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <Comp
      className={className}
      variants={fast ? staggerFast : stagger}
      initial="hidden"
      {...(immediate
        ? { animate: 'show' as const }
        : { whileInView: 'show' as const, viewport: scrollViewport })}
    >
      {children}
    </Comp>
  )
}

export function MotionItem({
  children,
  className,
  variants = fadeUp,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  variants?: Variants
  as?: 'div' | 'li' | 'article'
}) {
  const Comp = motion[as]
  return (
    <Comp className={className} variants={variants}>
      {children}
    </Comp>
  )
}

/** Animated “secured” seal — SureDrop’s signature confirm moment */
export function SecureSeal({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`relative grid h-16 w-16 place-items-center ${className}`}
      initial={reduce ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
      aria-hidden
    >
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-lagoon/40"
        animate={
          reduce
            ? undefined
            : {
                scale: [1, 1.18, 1],
                opacity: [0.55, 0.15, 0.55],
              }
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute inset-1 rounded-full bg-lagoon/15"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <span className="relative grid h-11 w-11 place-items-center rounded-full bg-lagoon text-sm font-bold text-white shadow-[0_8px_24px_rgba(26,122,100,0.35)]">
        ✓
      </span>
    </motion.div>
  )
}

export function AnimatedCheck({ active }: { active: boolean }) {
  return (
    <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <motion.path
        d="M3 7.2L5.8 10L11 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.svg>
  )
}
