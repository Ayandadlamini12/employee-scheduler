import { useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"

export default function Login({ onLoginSuccess, onLanguageChange, isChinese }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError("auth.login.validation")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")

      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "auth.login.failed")
      }

      const data = await response.json()
      onLoginSuccess(data)
    } catch (loginError) {
      setError(loginError.message || "auth.login.failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("auth.login.title")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("auth.login.subtitle")}</p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onLanguageChange("en")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                !isChinese ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("languageEnglish")}
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("zh-TW")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                isChinese ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("languageChineseTraditional")}
            </button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("auth.login.username")}
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              placeholder={t("auth.login.usernamePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("auth.login.password")}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              placeholder={t("auth.login.passwordPlaceholder")}
              required
            />
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {t(error, { defaultValue: error })}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>

          <p className="text-xs text-slate-500">{t("auth.login.defaultPasswordHint")}</p>
        </form>
      </div>
    </div>
  )
}
