import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { API_BASE_URL } from "../config/api"

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    total_employees: 0,
    shifts_today: 0,
    pending_requests: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboardStats() {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch(`${API_BASE_URL}/stats/dashboard`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`)
        }

        const data = await response.json()
        setStats({
          total_employees: Number(data.total_employees) || 0,
          shifts_today: Number(data.shifts_today) || 0,
          pending_requests: Number(data.pending_requests) || 0,
        })
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("Failed to load dashboard stats.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardStats()
    return () => controller.abort()
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {t("employeeSchedulingSystem")}
      </h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
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
          <p>{t("shiftsToday")}</p>
          <h2 className="text-3xl font-bold">
            {isLoading ? "-" : stats.shifts_today}
          </h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>{t("requests")}</p>
          <h2 className="text-3xl font-bold">
            {isLoading ? "-" : stats.pending_requests}
          </h2>
        </div>

      </div>
    </div>
  )
}
