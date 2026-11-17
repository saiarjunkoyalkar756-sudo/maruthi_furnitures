// Robust, Edge-compatible HMAC-SHA256 Auth Session Engine
// Compatible with both Node.js API routes and Next.js Edge Middleware

export const AUTH_COOKIE_NAME = 'maruthi_auth_token'
const AUTH_SECRET = process.env.AUTH_SECRET || 'maruthi-furnitures-secret-key-2026-secure-session'

export interface SessionPayload {
  userId: number
  username: string
  name: string
  role: string
  exp: number // Unix timestamp in seconds
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * Creates a cryptographically signed session token
 */
export async function createSessionToken(
  user: { id: number; username: string; name: string; role: string },
  expiresInDays = 7
): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60,
  }

  const enc = new TextEncoder()
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = base64UrlEncode(enc.encode(payloadJson))

  const key = await getHmacKey()
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64) as any)
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuffer))

  return `${payloadB64}.${sigB64}`
}

/**
 * Verifies a cryptographically signed session token
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, sigB64] = parts

  try {
    const enc = new TextEncoder()
    const key = await getHmacKey()
    const signature = base64UrlDecode(sigB64)

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as any,
      enc.encode(payloadB64) as any
    )

    if (!isValid) return null

    const payloadBytes = base64UrlDecode(payloadB64)
    const payloadStr = new TextDecoder().decode(payloadBytes)
    const payload: SessionPayload = JSON.parse(payloadStr)

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
