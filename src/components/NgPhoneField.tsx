type Props = {
  value: string
  onChange: (national10: string) => void
  id?: string
  autoFocus?: boolean
  className?: string
}

/**
 * +234 prefix (fixed) + max 10 national digits.
 * Auto-strips a leading 0 so 080… becomes 80… under the country code.
 */
export function NgPhoneField({ value, onChange, id, autoFocus, className = '' }: Props) {
  const national = value

  return (
    <div>
      <div
        className={`flex overflow-hidden rounded-[1rem] border-[2px] border-ink/15 bg-paper focus-within:border-lagoon focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-lagoon)_25%,transparent)] ${className}`}
      >
        <span className="grid shrink-0 place-items-center border-r border-ink/10 bg-mist px-3 text-sm font-extrabold text-ink">
          +234
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          maxLength={10}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-semibold tracking-wide text-ink outline-none placeholder:text-muted/70"
          placeholder="8012345678"
          value={national}
          onChange={(e) => onChange(toNationalFromInput(e.target.value))}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text')
            onChange(toNationalFromInput(text))
          }}
          aria-describedby={id ? `${id}-hint` : undefined}
        />
      </div>
      <p id={id ? `${id}-hint` : undefined} className="mt-1.5 text-[11px] font-semibold text-muted">
        10 digits — don’t type the first 0. Example: 8012345678
      </p>
    </div>
  )
}

function toNationalFromInput(raw: string) {
  // lazy import avoided — duplicate tiny strip for component locality
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('234')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}
