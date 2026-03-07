import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Dashboard from "./pages/Dashboard"
import Scheduler from "./pages/Scheduler"
import Employees from "./pages/Employees"
import Requests from "./pages/Requests"
import { API_BASE_URL } from "./config/api"

const LANGUAGE_STORAGE_KEY = "preferredLanguage"
const EMPLOYEE_ID_STORAGE_KEY = "currentEmployeeId"

function getBrowserLanguage() {
  if (typeof navigator === "undefined") {
    return "en"
  }

  const browserLanguage = String(navigator.language || "").toLowerCase()
  return browserLanguage.startsWith("zh") ? "zh-TW" : "en"
}

function normalizeLanguage(value) {
  const language = String(value || "").trim().toLowerCase()
  if (language === "zh-tw" || language === "zh") return "zh-TW"
  if (language === "en") return "en"
  return null
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState("dashboard")
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false)
  const [employeeId] = useState(() => {
    const storedEmployeeId = localStorage.getItem(EMPLOYEE_ID_STORAGE_KEY)
    if (storedEmployeeId) return storedEmployeeId

    const fallbackEmployeeId = String(import.meta.env.VITE_EMPLOYEE_ID || "1")
    localStorage.setItem(EMPLOYEE_ID_STORAGE_KEY, fallbackEmployeeId)
    return fallbackEmployeeId
  })

  useEffect(() => {
    let cancelled = false

    async function initializeLanguage() {
      const storedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
      const browserLanguage = normalizeLanguage(getBrowserLanguage()) || "en"
      let backendLanguage = null

      if (employeeId) {
        try {
          const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`)
          if (response.ok) {
            const employee = await response.json()
            backendLanguage = normalizeLanguage(employee.preferred_language)
          }
        } catch (error) {
          console.error("Failed to load employee language preference:", error)
        }
      }

      const initialLanguage = backendLanguage || storedLanguage || browserLanguage || "en"

      if (!cancelled) {
        i18n.changeLanguage(initialLanguage)
        localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage)
        setShowLanguagePrompt(!backendLanguage && !storedLanguage)
      }
    }

    initializeLanguage()

    return () => {
      cancelled = true
    }
  }, [employeeId, i18n])

  const isChinese = i18n.resolvedLanguage === "zh-TW"

  async function handleLanguageChange(language, closePrompt = false) {
    const normalizedLanguage = normalizeLanguage(language) || "en"

    i18n.changeLanguage(normalizedLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage)

    if (employeeId) {
      try {
        await fetch(`${API_BASE_URL}/employees/${employeeId}/language`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferred_language: normalizedLanguage }),
        })
      } catch (error) {
        console.error("Failed to persist language preference:", error)
      }
    }

    if (closePrompt) {
      setShowLanguagePrompt(false)
    }
  }

  const navItems = useMemo(
    () => [
      { key: "dashboard", label: t("dashboard") },
      { key: "scheduler", label: t("scheduler") },
      { key: "employees", label: t("employees") },
      { key: "requests", label: t("adminRequests") },
    ],
    [t]
  )

  const renderPage = () => {
    if (page === "scheduler") return <Scheduler />
    if (page === "employees") return <Employees />
    if (page === "requests") return <Requests />
    return <Dashboard />
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg p-6">
        <h1 className="text-xl font-bold mb-10">{t("appTitle")}</h1>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = page === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPage(item.key)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                !isChinese ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t("languageEnglish")}
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("zh-TW")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                isChinese ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t("languageChineseTraditional")}
            </button>
          </div>
        </header>

        <div className="h-[calc(100vh-56px)] overflow-y-auto p-10">{renderPage()}</div>
      </main>

      {showLanguagePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{t("selectLanguageTitle")}</h2>
            <p className="mt-2 text-sm text-slate-500">{t("selectLanguageBody")}</p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleLanguageChange("en", true)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("languageEnglish")}
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("zh-TW", true)}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t("languageChineseTraditional")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
