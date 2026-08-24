import { motion, useReducedMotion } from 'motion/react'
import type { Category } from '../data/vendors'
import { CategoryDoodles } from './CategoryIcon'
import { slowFloatTransition } from '../motion/tokens'

/** Soft living background for the shop — blobs + optional category doodles. */
export function ShopBackdrop({
  category,
  intense = false,
}: {
  category?: Category
  intense?: boolean
}) {
  const reduce = useReducedMotion()

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className={`absolute -left-[20%] -top-[10%] h-[55%] w-[70%] rounded-full blur-3xl ${
          intense ? 'opacity-90' : 'opacity-70'
        }`}
        style={{
          background:
            category === 'food'
              ? 'rgba(217, 119, 47, 0.22)'
              : category === 'mart'
                ? 'rgba(42, 92, 56, 0.18)'
                : category === 'pharmacy'
                  ? 'rgba(12, 101, 96, 0.18)'
                  : category === 'store'
                    ? 'rgba(91, 74, 154, 0.16)'
                    : 'rgba(12, 101, 96, 0.16)',
        }}
      />
      <div
        className="absolute -right-[15%] top-[8%] h-[40%] w-[55%] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            category === 'food'
              ? 'rgba(239, 194, 122, 0.35)'
              : 'rgba(217, 119, 47, 0.1)',
        }}
      />
      <div className="absolute bottom-[-10%] left-[10%] h-[35%] w-[60%] rounded-full bg-lagoon/10 opacity-50 blur-3xl" />

      {!reduce && (
        <>
          <motion.div
            className="absolute left-[12%] top-[28%] h-3 w-3 rounded-full bg-mango/40"
            animate={{ y: [0, -10, 0], opacity: [0.35, 0.7, 0.35] }}
            transition={slowFloatTransition}
          />
          <motion.div
            className="absolute right-[18%] top-[42%] h-2.5 w-2.5 rounded-full bg-lagoon/35"
            animate={{ y: [0, 8, 0], opacity: [0.3, 0.65, 0.3] }}
            transition={{ ...slowFloatTransition, duration: 6.5 }}
          />
        </>
      )}

      {category && (
        <div className="absolute inset-0 opacity-90">
          <CategoryDoodles category={category} />
        </div>
      )}
    </div>
  )
}

function greetingLine() {
  const h = new Date().getHours()
  if (h < 11) return 'Morning hunger · Badagry’s got you'
  if (h < 16) return 'Afternoon craving · someone\'s got you'
  if (h < 20) return 'Evening heat · order with ease'
  return 'Night run · we\'ll bring it home'
}

export function shopGreeting() {
  return greetingLine()
}
