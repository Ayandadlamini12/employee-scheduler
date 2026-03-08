const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL
export const AUTH_SESSION_STORAGE_KEY = "authSession"

function resolveFallbackApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:4000"
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`
}

export const API_BASE_URL = ENV_API_BASE_URL || resolveFallbackApiBaseUrl()

function safeParseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function getAuthSession() {
  if (typeof window === "undefined") return null
  return safeParseJson(localStorage.getItem(AUTH_SESSION_STORAGE_KEY) || "")
}

export function setAuthSession(session) {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export function getAuthToken() {
  return getAuthSession()?.token || null
}

function resolveApiUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(String(pathOrUrl))) {
    return pathOrUrl
  }

  const normalizedPath = String(pathOrUrl || "")
  if (!normalizedPath.startsWith("/")) {
    return `${API_BASE_URL}/${normalizedPath}`
  }

  return `${API_BASE_URL}${normalizedPath}`
}

export function apiFetch(pathOrUrl, options = {}) {
  const url = resolveApiUrl(pathOrUrl)
  const headers = new Headers(options.headers || {})
  const token = getAuthToken()

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
  if (!isFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
