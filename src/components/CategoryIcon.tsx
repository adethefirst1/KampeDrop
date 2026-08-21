import { motion, useReducedMotion } from 'motion/react'
import type { Category } from '../data/vendors'
import { slowFloatTransition } from '../motion/tokens'

type IconProps = {
  category: Category
  className?: string
  stroke?: string
}

/** Simple line icons — doodle-friendly, not emoji. */
export function CategoryIcon({
  category,
  className = 'h-7 w-7',
  stroke = 'currentColor',
}: IconProps) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (category) {
    case 'food':
      return (
        <svg {...common}>
          <path d="M4 10c0-2 2-4 4-4h8c2 0 4 2 4 4v1H4v-1Z" />
          <path d="M6 11v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
          <path d="M9 6V4M12 6V3M15 6V4" />
        </svg>
      )
    case 'mart':
      return (
        <svg {...common}>
          <path d="M4 7h16l-1.2 11.2A2 2 0 0 1 16.8 20H7.2a2 2 0 0 1-2-1.8L4 7Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      )
    case 'pharmacy':
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="4" rx="1" />
          <rect x="5" y="7" width="14" height="14" rx="3" />
          <path d="M12 11v6M9 14h6" />
        </svg>
      )
    case 'store':
      return (
        <svg {...common}>
          <path d="M3 10h18l-1.2 9H4.2L3 10Z" />
          <path d="M5 10V7l2.5-3h9L19 7v3" />
          <path d="M10 19v-5h4v5" />
        </svg>
      )
  }
}

/** Soft floating doodles for category atmospheres. */
export function CategoryDoodles({
  category,
  className = '',
}: {
  category: Category
  className?: string
}) {
  const reduce = useReducedMotion()
  const color =
    category === 'food'
      ? '#d9772f'
      : category === 'mart'
        ? '#2a5c38'
        : category === 'pharmacy'
          ? '#0c6560'
          : '#5b4a9a'

  const floatA = reduce
    ? undefined
    : { y: [0, -8, 0], rotate: [0, 3, 0] }
  const floatB = reduce
    ? undefined
    : { y: [0, 6, 0], rotate: [0, -4, 0] }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {category === 'food' && (
        <>
          <motion.svg
            className="absolute -right-2 top-6 h-16 w-16 opacity-[0.18]"
            viewBox="0 0 64 64"
            fill="none"
            style={{ color }}
            animate={floatA}
            transition={slowFloatTransition}
          >
            <ellipse cx="32" cy="42" rx="20" ry="7" fill="currentColor" />
            <path
              d="M14 40c2-12 10-22 18-22s16 10 18 22"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M28 14c0-3 2-6 4-6s4 3 4 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.svg>
          <motion.svg
            className="absolute left-2 bottom-8 h-12 w-12 opacity-[0.14]"
            viewBox="0 0 48 48"
            fill="currentColor"
            style={{ color }}
            animate={floatB}
            transition={{ ...slowFloatTransition, duration: 6.4 }}
          >
            <path d="M10 34c4-10 12-16 20-10 6 4 8 12 4 16-6 6-18 4-24-6Z" />
          </motion.svg>
        </>
      )}
      {category === 'mart' && (
        <>
          <motion.svg
            className="absolute right-3 top-8 h-14 w-14 opacity-[0.16]"
            viewBox="0 0 56 56"
            fill="none"
            style={{ color }}
            animate={floatA}
            transition={slowFloatTransition}
          >
            <path
              d="M14 20h28l-3 24H17L14 20Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M20 20c0-6 4-10 8-10s8 4 8 10"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </motion.svg>
          <motion.svg
            className="absolute left-3 bottom-10 h-10 w-10 opacity-[0.14]"
            viewBox="0 0 40 40"
            fill="currentColor"
            style={{ color }}
            animate={floatB}
            transition={{ ...slowFloatTransition, duration: 6.4 }}
          >
            <ellipse cx="20" cy="26" rx="10" ry="8" />
            <path d="M20 6c-2 5-7 9-7 14a7 7 0 0 0 14 0c0-5-5-9-7-14Z" />
          </motion.svg>
        </>
      )}
      {category === 'pharmacy' && (
        <>
          <motion.svg
            className="absolute right-4 top-7 h-14 w-14 opacity-[0.16]"
            viewBox="0 0 56 56"
            fill="none"
            style={{ color }}
            animate={floatA}
            transition={slowFloatTransition}
          >
            <rect
              x="18"
              y="10"
              width="20"
              height="8"
              rx="2"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <rect
              x="14"
              y="18"
              width="28"
              height="28"
              rx="6"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              d="M28 24v16M20 32h16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </motion.svg>
          <motion.svg
            className="absolute left-4 bottom-12 h-9 w-9 opacity-[0.12]"
            viewBox="0 0 36 36"
            fill="currentColor"
            style={{ color }}
            animate={floatB}
            transition={{ ...slowFloatTransition, duration: 6.4 }}
          >
            <path d="M18 4c-5 7-9 12-9 18a9 9 0 0 0 18 0c0-6-4-11-9-18Z" />
          </motion.svg>
        </>
      )}
      {category === 'store' && (
        <>
          <motion.svg
            className="absolute right-2 top-6 h-14 w-14 opacity-[0.16]"
            viewBox="0 0 56 56"
            fill="none"
            style={{ color }}
            animate={floatA}
            transition={slowFloatTransition}
          >
            <path
              d="M8 22h40l-2.5 22H10.5L8 22Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M12 22V16l4-6h24l4 6v6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d="M24 44V32h8v12" stroke="currentColor" strokeWidth="2.5" />
          </motion.svg>
          <motion.svg
            className="absolute left-2 bottom-8 h-11 w-11 opacity-[0.12]"
            viewBox="0 0 44 44"
            fill="none"
            style={{ color }}
            animate={floatB}
            transition={{ ...slowFloatTransition, duration: 6.4 }}
          >
            <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2.5" />
            <path
              d="M14 22h16M22 14v16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </motion.svg>
        </>
      )}
    </div>
  )
}
