const PIN_HASH_KEY = 'life_os_pin_hash'
const SALT = 'life_os_2026'

async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin + SALT)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function getPinHash(): string | null {
  return localStorage.getItem(PIN_HASH_KEY)
}

export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_HASH_KEY, hash)
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = getPinHash()
  if (!stored) return false
  const hash = await hashPin(pin)
  return hash === stored
}

export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY)
}
