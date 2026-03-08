import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { API_BASE_URL } from "../config/api"

function statusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (normalized === "on_leave") return "bg-amber-50 text-amber-700 ring-amber-200"
  if (normalized === "inactive") return "bg-slate-100 text-slate-700 ring-slate-200"
  if (normalized === "terminated") return "bg-rose-50 text-rose-700 ring-rose-200"
  return "bg-slate-100 text-slate-700 ring-slate-200"
}

function translateRole(roleTitle, t) {
  if (!roleTitle) return "-"
  return t(`roles.${roleTitle}`, { defaultValue: roleTitle })
}

function translateEmploymentType(employmentType, t) {
  if (!employmentType) return "-"
  return t(`employment.${employmentType}`, { defaultValue: employmentType })
}

function translatePreferredLanguage(languageCode, t) {
  if (languageCode === "zh-TW") {
    return t("languages.Traditional Chinese", { defaultValue: "Traditional Chinese" })
  }

  if (languageCode === "en") {
    return t("languages.English", { defaultValue: "English" })
  }

  return "-"
}

export default function Employees() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadEmployees() {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch(`${API_BASE_URL}/employees`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`)
        }

        const data = await response.json()
        setEmployees(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("Failed to load employees.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadEmployees()
    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t("employees")}</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("employee")}</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Employment Type</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {employee.english_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "-"}
                      </p>
                      <p className="text-xs text-slate-500">{employee.chinese_name || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{translateRole(employee.role_title, t)}</td>
                    <td className="px-4 py-3 text-slate-700">{translateEmploymentType(employee.employment_type, t)}</td>
                    <td className="px-4 py-3 text-slate-700">{translatePreferredLanguage(employee.preferred_language, t)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(employee.status)}`}>
                        {employee.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
