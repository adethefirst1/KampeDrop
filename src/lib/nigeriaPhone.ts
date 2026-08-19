/** Nigeria mobile helpers — national number is 10 digits (no leading 0, no 234). */

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

/**
 * Normalize typed/pasted input to a 10-digit national mobile.
 * Strips +234 / 234 and a mistaken leading 0 (080… → 80…).
 */
export function toNationalMobile(input: string): string {
  let d = digitsOnly(input)
  if (d.startsWith('234')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

/** Valid NG mobile national: 10 digits starting with 7, 8, or 9. */
export function isValidNgMobileNational(national: string): boolean {
  return /^[789]\d{9}$/.test(national)
}

/** Store as local 0XXXXXXXXXX (matches existing pilot data). */
export function toStoredNgPhone(national: string): string {
  const n = toNationalMobile(national)
  return n ? `0${n}` : ''
}

/** Compare phones regardless of 0 / 234 / formatting. */
export function phoneMatchKey(phone: string): string {
  return toNationalMobile(phone)
}
