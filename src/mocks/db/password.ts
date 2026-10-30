function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}

export function createSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

export async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return toHex(new Uint8Array(digest))
}

export function hashPassword(password: string, salt: string) {
  return sha256Hex(`${salt}:${password}`)
}

export async function verifyPassword(
  password: string,
  salt: string,
  passwordHash: string
) {
  return (await hashPassword(password, salt)) === passwordHash
}
