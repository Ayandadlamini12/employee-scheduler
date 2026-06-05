import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Dashboard from "./pages/Dashboard"
import EmployeeDashboard from "./pages/EmployeeDashboard"
import Today from "./pages/Today"
import Scheduler from "./pages/Scheduler"
import Employees from "./pages/Employees"
import Requests from "./pages/Requests"
import Login from "./pages/Login"
import ChangePassword from "./pages/ChangePassword"
import Announcements from "./pages/Announcements"
import Profile from "./pages/Profile"
import {
  apiFetch,
  clearAuthSession,
  getAuthSession,
  setAuthSession as persistAuthSession,
} from "./config/api"

const LANGUAGE_STORAGE_KEY = "preferredLanguage"

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

  if (icon === "announcements") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M22 8.5L2 12l7 2.5L11.5 22l2.5-7.5L22 8.5z" />
      </svg>
    )
  }

  if (icon === "requests") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    )
  }

  if (icon === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
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

function isAdminRole(role) {
  return role === "team_leader" || role === "manager"
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [authSession, setAuthSessionState] = useState(() => getAuthSession())
  const [isAuthChecking, setIsAuthChecking] = useState(() => Boolean(getAuthSession()?.token))
  const [page, setPage] = useState("dashboard")
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false)

  const authUser = authSession?.user || null
  const isAuthenticated = Boolean(authSession?.token && authUser)
  const isAdmin = isAdminRole(authUser?.role)
  const isChinese = i18n.resolvedLanguage === "zh-TW"

  function setAuthSession(nextSession) {
    setAuthSessionState(nextSession)

    if (nextSession) {
      persistAuthSession(nextSession)
    } else {
      clearAuthSession()
    }
  }

  useEffect(() => {
    let cancelled = false

    async function validateSession() {
      if (!authSession?.token) {
        setIsAuthChecking(false)
        return
      }

      try {
        const response = await apiFetch("/auth/me")
        if (!response.ok) {
          if (!cancelled) {
            setAuthSession(null)
          }
          return
        }

        const data = await response.json()
        if (!cancelled) {
          setAuthSession({
            token: authSession.token,
            user: data.user,
          })
        }
      } catch {
        if (!cancelled) {
          setAuthSession(null)
        }
      } finally {
        if (!cancelled) {
          setIsAuthChecking(false)
        }
      }
    }

    validateSession()

    return () => {
      cancelled = true
    }
  }, [authSession?.token])

  useEffect(() => {
    const storedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
    const backendLanguage = normalizeLanguage(authUser?.preferred_language)
    const browserLanguage = normalizeLanguage(getBrowserLanguage()) || "en"
    const initialLanguage = backendLanguage || storedLanguage || browserLanguage || "en"

    i18n.changeLanguage(initialLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage)
    setShowLanguagePrompt(isAuthenticated && !backendLanguage && !storedLanguage)
  }, [authUser?.preferred_language, i18n, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !authUser) return

    if (authUser.must_change_password) return

    const allowedPages = isAdmin
      ? new Set(["dashboard", "today", "scheduler", "employees", "requests", "announcements", "profile"])
      : new Set(["employeeDashboard", "announcements", "profile"])

    if (!allowedPages.has(page)) {
      setPage(isAdmin ? "dashboard" : "employeeDashboard")
    }
  }, [authUser, isAdmin, isAuthenticated, page])

  async function handleLanguageChange(language, closePrompt = false) {
    const normalizedLanguage = normalizeLanguage(language) || "en"

    i18n.changeLanguage(normalizedLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage)

    if (authUser?.id) {
      try {
        await apiFetch(`/employees/${authUser.id}/language`, {
          method: "PATCH",
          body: JSON.stringify({ preferred_language: normalizedLanguage }),
        })

        setAuthSession({
          ...authSession,
          user: {
            ...authUser,
            preferred_language: normalizedLanguage,
          },
        })
      } catch (error) {
        console.error("Failed to persist language preference:", error)
      }
    }

    if (closePrompt) {
      setShowLanguagePrompt(false)
    }
  }

  function handleLoginSuccess(nextSession) {
    setAuthSession(nextSession)
    const nextIsAdmin = isAdminRole(nextSession?.user?.role)
    setPage(nextIsAdmin ? "dashboard" : "employeeDashboard")
  }

  function handlePasswordChanged(nextSession) {
    setAuthSession(nextSession)
  }

  function handleProfileUpdated(nextUser) {
    if (!nextUser || !authSession?.token) return

    setAuthSession({
      token: authSession.token,
      user: {
        ...authUser,
        ...nextUser,
      },
    })
  }

  function handleLogout() {
    setAuthSession(null)
    setPage("dashboard")
  }

  const navItems = useMemo(() => {
    if (!isAdmin) {
      return [
        { key: "employeeDashboard", label: t("employeeDashboard.nav"), icon: "employeeDashboard" },
        { key: "announcements", label: t("announcements.nav"), icon: "announcements" },
        { key: "profile", label: t("profile.nav"), icon: "profile" },
      ]
    }

    return [
      { key: "dashboard", label: t("dashboard"), icon: "dashboard" },
      { key: "today", label: t("today.nav"), icon: "today" },
      { key: "scheduler", label: t("scheduler"), icon: "scheduler" },
      { key: "employees", label: t("employees.label"), icon: "employees" },
      { key: "requests", label: t("adminRequests"), icon: "requests" },
      { key: "announcements", label: t("announcements.nav"), icon: "announcements" },
      { key: "profile", label: t("profile.nav"), icon: "profile" },
    ]
  }, [isAdmin, t])

  const renderPage = () => {
    if (page === "profile") {
      return <Profile user={authUser} onProfileUpdated={handleProfileUpdated} onPasswordChanged={handlePasswordChanged} />
    }

    if (page === "announcements") {
      return <Announcements isAdmin={isAdmin} />
    }

    if (!isAdmin) {
      return <EmployeeDashboard employeeId={String(authUser?.id || "")} />
    }

    if (page === "today") return <Today />
    if (page === "scheduler") return <Scheduler />
    if (page === "employees") return <Employees />
    if (page === "requests") return <Requests />
    return <Dashboard />
  }

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-600">{t("authChecking", { defaultValue: "Checking session..." })}</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} onLanguageChange={handleLanguageChange} isChinese={isChinese} />
  }

  if (authUser.must_change_password) {
    return (
      <ChangePassword
        user={authUser}
        onPasswordChanged={handlePasswordChanged}
        onLogout={handleLogout}
      />
    )
  }

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const sidebar = (
    <>
      <div className="flex items-center justify-between md:mb-8">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-950">{t("appTitle")}</h1>
        <button type="button" onClick={() => setMobileSidebarOpen(false)} className="md:hidden rounded-md p-1 text-slate-500 hover:bg-slate-100">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-x-visible md:pb-0">
        {navItems.map((item) => {
          const isActive = page === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => { setPage(item.key); setMobileSidebarOpen(false) }}
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

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 md:mt-8"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
        {t("logout", { defaultValue: "Logout" })}
      </button>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative h-full w-72 overflow-y-auto border-r border-slate-300 bg-white px-4 py-4 shadow-lg">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden border-b border-slate-300 bg-white/95 px-4 py-4 shadow-sm md:block md:min-h-screen md:w-72 md:border-b-0 md:border-r md:px-5 md:py-6 md:shadow-md">
        {sidebar}
      </aside>

      <main className="flex-1 overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-300 bg-white px-4 md:justify-end md:px-6">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
