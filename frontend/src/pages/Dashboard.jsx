import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"

function MetricIcon({ type }) {
  const commonClass = "h-5 w-5"

  if (type === "employees") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (type === "shifts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={commonClass}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function getEmployeeDisplayName(shiftRow, isChinese) {
  if (isChinese && shiftRow.employee_chinese_name) {
    return shiftRow.employee_chinese_name
  }

  if (shiftRow.employee_english_name) {
    return shiftRow.employee_english_name
  }

  return shiftRow.employee_name || "-"
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState({
    total_employees: 0,
    shifts_this_week: 0,
    pending_requests: 0,
  })
  const [todayShifts, setTodayShifts] = useState([])
  const [showAllShifts, setShowAllShifts] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [todayShiftsError, setTodayShiftsError] = useState("")

  const isChinese = i18n.resolvedLanguage === "zh-TW"

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboardData() {
      try {
        setIsLoading(true)
        setError("")
        setTodayShiftsError("")

        const [statsResult, todayShiftsResult] = await Promise.allSettled([
          apiFetch("/stats/dashboard", { signal: controller.signal }),
          apiFetch("/stats/today-shifts", { signal: controller.signal }),
        ])

        if (statsResult.status === "fulfilled") {
          if (!statsResult.value.ok) {
            throw new Error(`Failed with status ${statsResult.value.status}`)
          }

          const data = await statsResult.value.json()
          setStats({
            total_employees: Number(data.total_employees) || 0,
            shifts_this_week: Number(data.shifts_this_week ?? data.shifts_today) || 0,
            pending_requests: Number(data.pending_requests) || 0,
          })
        } else if (statsResult.reason?.name !== "AbortError") {
          throw statsResult.reason
        }

        if (todayShiftsResult.status === "fulfilled") {
          if (!todayShiftsResult.value.ok) {
            setTodayShiftsError("dashboardTodayShiftsLoadError")
          } else {
            const data = await todayShiftsResult.value.json()
            setTodayShifts(Array.isArray(data) ? data : [])
          }
        } else if (todayShiftsResult.reason?.name !== "AbortError") {
          setTodayShiftsError("dashboardTodayShiftsLoadError")
        }
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("dashboardStatsLoadError")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
    return () => controller.abort()
  }, [])

  const visibleTodayShifts = useMemo(() => {
    if (showAllShifts) return todayShifts
    return todayShifts.slice(0, 4)
  }, [showAllShifts, todayShifts])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">
        {t("employeeSchedulingSystem")}
      </h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-3 inline-flex rounded-lg bg-slate-900 p-2 text-white">
            <MetricIcon type="employees" />
          </div>
          <p className="text-sm font-semibold text-slate-700">{t("employeesLabel")}</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-950">
            {isLoading ? "-" : stats.total_employees}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-3 inline-flex rounded-lg bg-blue-700 p-2 text-white">
            <MetricIcon type="shifts" />
          </div>
          <p className="text-sm font-semibold text-slate-700">{t("shiftsThisWeek")}</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-950">
            {isLoading ? "-" : stats.shifts_this_week}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-3 inline-flex rounded-lg bg-amber-600 p-2 text-white">
            <MetricIcon type="requests" />
          </div>
          <p className="text-sm font-semibold text-slate-700">{t("pendingRequests")}</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-950">
            {isLoading ? "-" : stats.pending_requests}
          </h2>
        </div>

      </div>

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{t("dashboardTodayScheduleTitle")}</h2>
        </div>

        {todayShiftsError ? (
          <div className="border-b border-rose-200 bg-rose-100 px-6 py-3 text-sm font-semibold text-rose-900">
            {t(todayShiftsError, { defaultValue: todayShiftsError })}
          </div>
        ) : null}

        <div className="px-6 py-3">
          {isLoading ? (
            <p className="py-4 text-sm text-slate-500">{t("dashboardTodayScheduleLoading")}</p>
          ) : todayShifts.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">{t("dashboardTodayScheduleEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {visibleTodayShifts.map((shiftRow) => (
                <div
                  key={shiftRow.schedule_id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-300 px-3 py-2 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {getEmployeeDisplayName(shiftRow, isChinese)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {shiftRow.role ? t(`roles.${shiftRow.role}`, { defaultValue: shiftRow.role }) : "-"}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {shiftRow.shift_start} - {shiftRow.shift_end}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {todayShifts.length > 4 ? (
          <div className="border-t border-slate-200 px-6 py-3">
            <button
              type="button"
              onClick={() => setShowAllShifts((prev) => !prev)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              {showAllShifts ? t("dashboardShowLess") : t("dashboardShowAll")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
