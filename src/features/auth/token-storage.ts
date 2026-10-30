const TOKEN_KEY = "kurio.session.token"

// The mock API runs in the browser and cannot set an httpOnly cookie, so the
// token lives in localStorage. Production should use an httpOnly cookie.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    console.error(error)
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    console.error(error)
  }
}

export function onTokenChangedElsewhere(listener: () => void) {
  window.addEventListener("storage", ({ key }) => {
    if (key === TOKEN_KEY || key === null) listener()
  })
}
