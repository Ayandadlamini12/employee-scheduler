import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { API_BASE_URL } from "../config/api"

function formatDate(value, locale) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
}

function formatTime(value) {
  if (!value) return "-"
  const match = String(value).match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : "-"
}

function formatRequestedChange(request) {
  if (request.requested_start && request.requested_end) {
    const start = formatTime(request.requested_start)
    const end = formatTime(request.requested_end)
    return `${start}-${end}`
  }

  const reason = String(request.reason || "")
  const reasonMatch = reason.match(/requested\s+change:\s*([0-2]\d:[0-5]\d)\s*-\s*([0-2]\d:[0-5]\d)/i)
  if (reasonMatch) {
    return `${reasonMatch[1]}-${reasonMatch[2]}`
  }

  return "-"
}

function statusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (normalized === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200"
  return "bg-amber-50 text-amber-700 ring-amber-200"
}

function getEmployeeDisplayName(request, isChinese) {
  if (isChinese && request.employee_chinese_name) {
    return request.employee_chinese_name
  }

  if (request.employee_english_name) {
    return request.employee_english_name
  }

  return request.employee_name || "-"
}

export default function Requests() {
  const { t, i18n } = useTranslation()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingRequestId, setUpdatingRequestId] = useState(null)

  const isChinese = i18n.resolvedLanguage === "zh-TW"
  const locale = isChinese ? "zh-TW" : "en-US"

  async function loadRequests(signal) {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`${API_BASE_URL}/requests`, { signal })
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`)
      }

      const data = await response.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch (loadError) {
      if (loadError.name !== "AbortError") {
        setError("failedToLoadRequests")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadRequests(controller.signal)
    return () => controller.abort()
  }, [])

  async function updateRequest(id, status) {
    try {
      setUpdatingRequestId(id)
      setError("")

      const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("failedToUpdateRequest"))
      }

      await loadRequests()
    } catch (updateError) {
      setError(updateError.message || "failedToUpdateRequest")
    } finally {
      setUpdatingRequestId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t("adminRequestsTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("adminRequestsSubtitle")}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("employee")}</th>
                <th className="px-4 py-3">{t("scheduleDate")}</th>
                <th className="px-4 py-3">{t("requestedChange")}</th>
                <th className="px-4 py-3">{t("reason")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    {t("loadingRequests")}
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    {t("noRequestsFound")}
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const isPending = String(request.status || "").toLowerCase() === "pending"
                  const isUpdating = updatingRequestId === request.id

                  return (
                    <tr key={request.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {getEmployeeDisplayName(request, isChinese)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(request.schedule_date, locale)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatRequestedChange(request)}</td>
                      <td className="max-w-md px-4 py-3 text-slate-600">{request.reason || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(request.status)}`}>
                          {request.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => updateRequest(request.id, "approved")}
                            disabled={!isPending || isUpdating}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t("approve")}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRequest(request.id, "rejected")}
                            disabled={!isPending || isUpdating}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t("reject")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
