import { useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"

export default function ChangePassword({ user, onPasswordChanged, onLogout }) {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("auth.changePassword.validation")
      return
    }

    if (newPassword.length < 8) {
      setError("auth.changePassword.minLength")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("auth.changePassword.mismatch")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")

      const response = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "auth.changePassword.failed")
      }

      const data = await response.json()
      onPasswordChanged(data)
    } catch (changeError) {
      setError(changeError.message || "auth.changePassword.failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-slate-900">{t("auth.changePassword.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("auth.changePassword.subtitle", {
            defaultValue: "Please set a new password before using the system.",
          })}
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {t("auth.changePassword.account", { account: user?.email || user?.phone || "-", defaultValue: "Account: {{account}}" })}
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("auth.changePassword.currentPassword")}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("auth.changePassword.newPassword")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("auth.changePassword.confirmPassword")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              required
            />
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {t(error, { defaultValue: error })}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="w-1/2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("logout", { defaultValue: "Logout" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t("auth.changePassword.submitting") : t("auth.changePassword.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
