import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"

export default function Profile({ user, onProfileUpdated, onPasswordChanged }) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      try {
        setIsLoading(true)
        setError("")
        const response = await apiFetch("/profile", { signal: controller.signal })

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`)
        }

        const data = await response.json()
        setProfile(data)
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("profile.loadError")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
    return () => controller.abort()
  }, [])

  function handleFieldChange(field, value) {
    setProfile((prev) => ({
      ...(prev || {}),
      [field]: value,
    }))
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!profile) return

    try {
      setIsSavingProfile(true)
      setError("")
      setProfileMessage("")

      const response = await apiFetch("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          english_name: profile.english_name,
          chinese_name: profile.chinese_name,
          email: profile.email,
          phone: profile.phone,
          preferred_language: profile.preferred_language,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("profile.saveError"))
      }

      const data = await response.json()
      setProfile(data.profile)
      setProfileMessage(t("profile.saved"))
      onProfileUpdated?.(data.user)
    } catch (saveError) {
      setError(saveError.message || "profile.saveError")
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("auth.changePassword.validation")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("auth.changePassword.minLength")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("auth.changePassword.mismatch")
      return
    }

    try {
      setIsSavingPassword(true)
      setPasswordError("")
      setPasswordMessage("")

      const response = await apiFetch("/profile/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("auth.changePassword.failed"))
      }

      const data = await response.json()
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordMessage(t("profile.passwordUpdated"))
      onPasswordChanged?.(data)
    } catch (saveError) {
      setPasswordError(saveError.message || "auth.changePassword.failed")
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
        {t("profile.loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t("profile.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("profile.subtitle")} ({user?.role || "-"})
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">{t("profile.details")}</h2>

          <form className="mt-4 space-y-4" onSubmit={saveProfile}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("profile.firstName")}
                </label>
                <input
                  type="text"
                  value={profile?.first_name || ""}
                  onChange={(event) => handleFieldChange("first_name", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("profile.lastName")}
                </label>
                <input
                  type="text"
                  value={profile?.last_name || ""}
                  onChange={(event) => handleFieldChange("last_name", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("profile.englishName")}
                </label>
                <input
                  type="text"
                  value={profile?.english_name || ""}
                  onChange={(event) => handleFieldChange("english_name", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("profile.chineseName")}
                </label>
                <input
                  type="text"
                  value={profile?.chinese_name || ""}
                  onChange={(event) => handleFieldChange("chinese_name", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("profile.email")}
              </label>
              <input
                type="email"
                value={profile?.email || ""}
                onChange={(event) => handleFieldChange("email", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("profile.phone")}
              </label>
              <input
                type="text"
                value={profile?.phone || ""}
                onChange={(event) => handleFieldChange("phone", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("profile.language")}
              </label>
              <select
                value={profile?.preferred_language || "en"}
                onChange={(event) => handleFieldChange("preferred_language", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              >
                <option value="en">{t("languageEnglish")}</option>
                <option value="zh-TW">{t("languageChineseTraditional")}</option>
              </select>
            </div>

            {profileMessage ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {profileMessage}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile ? t("profile.saving") : t("profile.save")}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">{t("profile.changePassword")}</h2>
          <form className="mt-4 space-y-4" onSubmit={changePassword}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("auth.changePassword.currentPassword")}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("auth.changePassword.newPassword")}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("auth.changePassword.confirmPassword")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              />
            </div>

            {passwordError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {t(passwordError, { defaultValue: passwordError })}
              </div>
            ) : null}

            {passwordMessage ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {passwordMessage}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPassword ? t("auth.changePassword.submitting") : t("profile.updatePassword")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
