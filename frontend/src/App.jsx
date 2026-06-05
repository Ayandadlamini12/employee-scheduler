import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Dashboard from "./pages/Dashboard"
import EmployeeDashboard from "./pages/EmployeeDashboard"
import Today from "./pages/Today"
import Scheduler from "./pages/Scheduler"
import Employees from "./pages/Employees"
import Requests from "./pages/Requests"
import Availability from "./pages/Availability"
import TeamPlanner from "./pages/TeamPlanner"
import Reports from "./pages/Reports"
import AuditLog from "./pages/AuditLog"
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

  if (icon === "availability") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M8 15l2 2 5-5" />
      </svg>
    )
  }

  if (icon === "teams") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <circle cx="8" cy="7" r="4" />
        <path d="M2 21a6 6 0 0 1 12 0" />
        <path d="M17 11a3 3 0 1 0 0-6M19 21a5 5 0 0 0-4-4.9" />
      </svg>
    )
  }

  if (icon === "reports") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    )
  }

  if (icon === "audit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-5" />
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

function getUserInitials(user) {
  const first = String(user?.first_name || "").trim()
  const last = String(user?.last_name || "").trim()
  const fallback = String(user?.email || user?.employee_code || "U").trim()
  const initials = `${first.charAt(0)}${last.charAt(0)}`.trim()
  return (initials || fallback.charAt(0) || "U").toUpperCase()
}

function AuthenticatedApp({
  authUser,
  isAdmin,
  isChinese,
  showLanguagePrompt,
  handleLanguageChange,
  handlePasswordChanged,
  handleProfileUpdated,
  handleLogout,
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState(isAdmin ? "dashboard" : "employeeDashboard")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const defaultPage = isAdmin ? "dashboard" : "employeeDashboard"
  const allowedPages = useMemo(
    () => isAdmin
      ? new Set(["dashboard", "today", "scheduler", "teams", "availability", "reports", "employees", "requests", "audit", "announcements", "profile"])
      : new Set(["employeeDashboard", "availability", "announcements", "profile"]),
    [isAdmin],
  )
  const currentPage = allowedPages.has(page) ? page : defaultPage

  const navItems = useMemo(() => {
    if (!isAdmin) {
      return [
        { key: "employeeDashboard", label: t("employeeDashboard.nav"), icon: "employeeDashboard" },
        { key: "availability", label: t("availability.nav", { defaultValue: "Availability" }), icon: "availability" },
        { key: "announcements", label: t("announcements.nav"), icon: "announcements" },
        { key: "profile", label: t("profile.nav"), icon: "profile" },
      ]
    }

    return [
      { key: "dashboard", label: t("dashboard"), icon: "dashboard" },
      { key: "today", label: t("today.nav"), icon: "today" },
      { key: "scheduler", label: t("scheduler"), icon: "scheduler" },
      { key: "teams", label: t("teamPlanner.nav", { defaultValue: "Team Planner" }), icon: "teams" },
      { key: "availability", label: t("availability.nav", { defaultValue: "Availability" }), icon: "availability" },
      { key: "reports", label: t("reports.nav", { defaultValue: "Reports" }), icon: "reports" },
      { key: "employees", label: t("employees.label"), icon: "employees" },
      { key: "requests", label: t("adminRequests"), icon: "requests" },
      { key: "audit", label: t("audit.nav", { defaultValue: "Audit Log" }), icon: "audit" },
      { key: "announcements", label: t("announcements.nav"), icon: "announcements" },
      { key: "profile", label: t("profile.nav"), icon: "profile" },
    ]
  }, [isAdmin, t])

  const renderPage = () => {
    if (currentPage === "profile") {
      return <Profile user={authUser} onProfileUpdated={handleProfileUpdated} onPasswordChanged={handlePasswordChanged} />
    }

    if (currentPage === "announcements") {
      return <Announcements isAdmin={isAdmin} />
    }

    if (currentPage === "availability") {
      return <Availability user={authUser} isAdmin={isAdmin} />
    }

    if (!isAdmin) {
      return <EmployeeDashboard employeeId={String(authUser?.id || "")} />
    }

    if (currentPage === "today") return <Today />
    if (currentPage === "scheduler") return <Scheduler />
    if (currentPage === "teams") return <TeamPlanner />
    if (currentPage === "reports") return <Reports />
    if (currentPage === "employees") return <Employees />
    if (currentPage === "requests") return <Requests />
    if (currentPage === "audit") return <AuditLog />
    return <Dashboard />
  }

  const userName = [authUser?.first_name, authUser?.last_name].filter(Boolean).join(" ") || authUser?.email || "User"
  const roleLabel = String(authUser?.role || "staff").replaceAll("_", " ")

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Workforce</p>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950">{t("appTitle")}</h1>
        </div>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Close navigation"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-sm">
            {getUserInitials(authUser)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
            <p className="truncate text-xs font-semibold capitalize text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = currentPage === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => { setPage(item.key); setMobileSidebarOpen(false) }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isActive ? "bg-white/15 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-blue-600"
              }`}>
                <NavIcon icon={item.icon} />
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          {t("logout", { defaultValue: "Logout" })}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative h-full w-80 max-w-[86vw] overflow-hidden border-r border-slate-200 bg-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden h-screen w-72 shrink-0 overflow-hidden border-r border-slate-200 bg-white shadow-sm lg:sticky lg:top-0 lg:block">
        {sidebarContent}
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden min-w-0 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Employee Scheduling</p>
            <p className="truncate text-sm font-semibold text-slate-700">{navItems.find((item) => item.key === currentPage)?.label || t("dashboard")}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
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
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                {getUserInitials(authUser)}
              </div>
              <span className="max-w-40 truncate text-sm font-bold text-slate-800">{userName}</span>
            </div>
          </div>
        </header>

        <div className="h-[calc(100vh-64px)] overflow-y-auto p-4 sm:p-6 lg:p-8">{renderPage()}</div>
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

export default function App() {
  const { t, i18n } = useTranslation()
  const [authSession, setAuthSessionState] = useState(() => getAuthSession())
  const [isAuthChecking, setIsAuthChecking] = useState(() => Boolean(getAuthSession()?.token))
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

  return (
    <AuthenticatedApp
      authUser={authUser}
      isAdmin={isAdmin}
      isChinese={isChinese}
      showLanguagePrompt={showLanguagePrompt}
      handleLanguageChange={handleLanguageChange}
      handlePasswordChanged={handlePasswordChanged}
      handleProfileUpdated={handleProfileUpdated}
      handleLogout={handleLogout}
    />
  )
}
