const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function resolveFallbackApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:4000"
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`
}

export const API_BASE_URL = ENV_API_BASE_URL || resolveFallbackApiBaseUrl()
