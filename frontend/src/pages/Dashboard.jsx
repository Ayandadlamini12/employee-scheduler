import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { API_BASE_URL } from "../config/api"

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
          fetch(`${API_BASE_URL}/stats/dashboard`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/stats/today-shifts`, { signal: controller.signal }),
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
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        <div className="bg-white p-6 rounded shadow">
          <p>{t("employeesLabel")}</p>
          <h2 className="text-3xl font-bold">
            {isLoading ? "-" : stats.total_employees}
          </h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>{t("shiftsThisWeek")}</p>
          <h2 className="text-3xl font-bold">
            {isLoading ? "-" : stats.shifts_this_week}
          </h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>{t("requests")}</p>
          <h2 className="text-3xl font-bold">
            {isLoading ? "-" : stats.pending_requests}
          </h2>
        </div>

      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{t("dashboardTodayScheduleTitle")}</h2>
        </div>

        {todayShiftsError ? (
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700">
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
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {getEmployeeDisplayName(shiftRow, isChinese)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {shiftRow.role ? t(`roles.${shiftRow.role}`, { defaultValue: shiftRow.role }) : "-"}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {shiftRow.shift_start} - {shiftRow.shift_end}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {todayShifts.length > 4 ? (
          <div className="border-t border-slate-100 px-6 py-3">
            <button
              type="button"
              onClick={() => setShowAllShifts((prev) => !prev)}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              {showAllShifts ? t("dashboardShowLess") : t("dashboardShowAll")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
