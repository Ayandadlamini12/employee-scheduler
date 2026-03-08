import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Dashboard from "./pages/Dashboard"
import EmployeeDashboard from "./pages/EmployeeDashboard"
import Today from "./pages/Today"
import Scheduler from "./pages/Scheduler"
import Employees from "./pages/Employees"
import Requests from "./pages/Requests"
import { API_BASE_URL } from "./config/api"

const LANGUAGE_STORAGE_KEY = "preferredLanguage"
const EMPLOYEE_ID_STORAGE_KEY = "currentEmployeeId"

function NavIcon({ icon }) {
  const commonClass = "h-4 w-4 shrink-0"

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M3 13h8V3H3v10zM13 21h8v-6h-8v6zM13 11h8V3h-8v8zM3 21h8v-6H3v6z" />
      </svg>
    )
  }

  if (icon === "employeeDashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }

  if (icon === "today") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }

  if (icon === "scheduler") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 11h18M9 5v16M15 5v16" />
      </svg>
    )
  }

  if (icon === "employees") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

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
      { key: "dashboard", label: t("dashboard"), icon: "dashboard" },
      { key: "employeeDashboard", label: t("employeeDashboard.nav"), icon: "employeeDashboard" },
      { key: "today", label: t("today.nav"), icon: "today" },
      { key: "scheduler", label: t("scheduler"), icon: "scheduler" },
      { key: "employees", label: t("employees.label"), icon: "employees" },
      { key: "requests", label: t("adminRequests"), icon: "requests" },
    ],
    [t]
  )

  const renderPage = () => {
    if (page === "employeeDashboard") return <EmployeeDashboard employeeId={employeeId} />
    if (page === "today") return <Today />
    if (page === "scheduler") return <Scheduler />
    if (page === "employees") return <Employees />
    if (page === "requests") return <Requests />
    return <Dashboard />
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside className="border-b border-slate-300 bg-white/95 px-4 py-4 shadow-sm md:min-h-screen md:w-72 md:border-b-0 md:border-r md:px-5 md:py-6 md:shadow-md">
        <h1 className="mb-4 text-xl font-extrabold tracking-tight text-slate-950 md:mb-8">{t("appTitle")}</h1>

        <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-x-visible md:pb-0">
          {navItems.map((item) => {
            const isActive = page === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPage(item.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-left text-sm font-semibold transition md:flex md:w-full ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b border-slate-300 bg-white px-4 md:px-6">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                !isChinese ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("languageEnglish")}
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("zh-TW")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                isChinese ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("languageChineseTraditional")}
            </button>
          </div>
        </header>

        <div className="h-[calc(100vh-56px)] overflow-y-auto p-4 md:p-8">{renderPage()}</div>
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
