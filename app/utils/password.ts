export const PASSWORD_MIN_LENGTH = 12

export const PASSWORD_REQUIREMENTS =
  `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con mayúsculas, minúsculas, números y símbolos.`

export function isRobustPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return false
  }

  return /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^a-zA-Z0-9]/.test(password)
}

export function validateRobustPassword(password: string): string | null {
  if (!password) {
    return null
  }

  if (!isRobustPassword(password)) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres e incluir mayúsculas, minúsculas, números y símbolos.`
  }

  return null
}

export function generateRobustPassword(length = 14): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = lower + upper + digits + symbols

  const required = [
    lower[crypto.getRandomValues(new Uint32Array(1))[0]! % lower.length],
    upper[crypto.getRandomValues(new Uint32Array(1))[0]! % upper.length],
    digits[crypto.getRandomValues(new Uint32Array(1))[0]! % digits.length],
    symbols[crypto.getRandomValues(new Uint32Array(1))[0]! % symbols.length],
  ]

  const remaining = length - required.length
  const chars: string[] = [...required]

  const array = new Uint32Array(remaining)
  crypto.getRandomValues(array)
  for (let i = 0; i < remaining; i++) {
    chars.push(all[array[i]! % all.length]!)
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }

  return chars.join('')
}
