export type PasswordRule = {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'upper', label: '영문 대문자', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: '영문 소문자', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: '숫자', test: (p) => /\d/.test(p) },
  { id: 'special', label: '특수문자', test: (p) => /[^A-Za-z0-9]/.test(p) },
  { id: 'length', label: '8자 이상', test: (p) => p.length >= 8 },
]

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}

export function isEmailFormatValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
