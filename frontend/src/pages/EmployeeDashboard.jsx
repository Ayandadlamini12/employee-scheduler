import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"
import EmptyState from "../components/EmptyState"

function formatTime(value) {
  if (!value) return "-"
  const match = String(value).match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : "-"
}

function getEmployeeDisplayName(employee, isChinese) {
  if (isChinese && employee.chinese_name) {
    return employee.chinese_name
  }

  if (employee.english_name) {
    return employee.english_name
  }

  return `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "-"
}

function getTargetDisplayName(requestRow, isChinese) {
  if (isChinese && requestRow.target_employee_chinese_name) {
    return requestRow.target_employee_chinese_name
  }

  if (requestRow.target_employee_english_name) {
    return requestRow.target_employee_english_name
  }

  return requestRow.target_employee_name || null
}

function statusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "scheduled") return "bg-blue-100 text-blue-900 ring-blue-300"
  if (normalized === "published") return "bg-emerald-100 text-emerald-900 ring-emerald-300"
  if (normalized === "completed") return "bg-slate-200 text-slate-900 ring-slate-300"
  if (normalized === "cancelled") return "bg-rose-100 text-rose-900 ring-rose-300"
  return "bg-slate-200 text-slate-900 ring-slate-300"
}

export default function EmployeeDashboard({ employeeId }) {
  const { t, i18n } = useTranslation()
  const [tomorrowShifts, setTomorrowShifts] = useState([])
  const [coworkers, setCoworkers] = useState([])
  const [pendingReplacementBySchedule, setPendingReplacementBySchedule] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedShift, setSelectedShift] = useState(null)
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("")
  const [reason, setReason] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isChinese = i18n.resolvedLanguage === "zh-TW"
  const locale = isChinese ? "zh-TW" : "en-US"

  const loadEmployeeDashboardData = useCallback(async (signal) => {
    if (!employeeId) return

    try {
      setIsLoading(true)
      setError("")

      const [shiftsResponse, employeesResponse, requestsResponse] = await Promise.all([
        apiFetch(`/employees/${employeeId}/tomorrow-shifts`, { signal }),
        apiFetch(`/employees/${employeeId}/coworkers`, { signal }),
        apiFetch("/requests", { signal }),
      ])

      if (!shiftsResponse.ok) {
        throw new Error(`Shifts failed with status ${shiftsResponse.status}`)
      }

      if (!employeesResponse.ok) {
        throw new Error(`Employees failed with status ${employeesResponse.status}`)
      }

      if (!requestsResponse.ok) {
        throw new Error(`Requests failed with status ${requestsResponse.status}`)
      }

      const [shiftsData, employeesData, requestsData] = await Promise.all([
        shiftsResponse.json(),
        employeesResponse.json(),
        requestsResponse.json(),
      ])

      const shifts = Array.isArray(shiftsData) ? shiftsData : []
      const employees = Array.isArray(employeesData) ? employeesData : []
      const requests = Array.isArray(requestsData) ? requestsData : []

      setTomorrowShifts(shifts)
      setCoworkers(
        employees
          .filter((employee) => Number(employee.id) !== Number(employeeId))
          .sort((a, b) => {
            const first = getEmployeeDisplayName(a, isChinese)
            const second = getEmployeeDisplayName(b, isChinese)
            return first.localeCompare(second, locale)
          })
      )

      const pendingMap = {}
      requests.forEach((requestRow) => {
        if (Number(requestRow.employee_id) !== Number(employeeId)) return
        if (String(requestRow.request_type || "").toLowerCase() !== "shift_swap") return
        if (String(requestRow.status || "").toLowerCase() !== "pending") return
        if (!requestRow.schedule_id) return
        pendingMap[requestRow.schedule_id] = requestRow
      })
      setPendingReplacementBySchedule(pendingMap)
    } catch (loadError) {
      if (loadError.name !== "AbortError") {
        setError("employeeDashboard.failedLoad")
      }
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, isChinese, locale])

  useEffect(() => {
    const controller = new AbortController()
    loadEmployeeDashboardData(controller.signal)
    return () => controller.abort()
  }, [loadEmployeeDashboardData])

  const tomorrowLabel = useMemo(() => {
    if (tomorrowShifts.length > 0 && tomorrowShifts[0].schedule_date) {
      const date = new Date(tomorrowShifts[0].schedule_date)
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
      }
    }

    const date = new Date()
    date.setDate(date.getDate() + 1)
    return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
  }, [locale, tomorrowShifts])

  function openRecommendModal(shiftRow) {
    setSelectedShift(shiftRow)
    setReplacementEmployeeId(coworkers[0]?.id ? String(coworkers[0].id) : "")
    setReason("")
    setSubmitError("")
  }

  function closeRecommendModal() {
    setSelectedShift(null)
    setSubmitError("")
    setIsSubmitting(false)
  }

  async function submitReplacementRequest(event) {
    event.preventDefault()

    if (!selectedShift) return

    if (!replacementEmployeeId || !reason.trim()) {
      setSubmitError("employeeDashboard.requestValidationError")
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError("")

      const response = await apiFetch("/requests/absence-replacement", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(employeeId),
          schedule_id: selectedShift.schedule_id,
          replacement_employee_id: Number(replacementEmployeeId),
          reason: reason.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("employeeDashboard.failedSubmit"))
      }

      await loadEmployeeDashboardData()
      closeRecommendModal()
    } catch (createError) {
      setSubmitError(createError.message || "employeeDashboard.failedSubmit")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t("employeeDashboard.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("employeeDashboard.subtitle")} | {tomorrowLabel}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="space-y-3 p-4 md:hidden">
          {isLoading ? (
            <p className="text-sm text-slate-600">{t("employeeDashboard.loading")}</p>
          ) : tomorrowShifts.length === 0 ? (
            <p className="text-sm text-slate-600">{t("employeeDashboard.noTomorrowShifts")}</p>
          ) : (
            tomorrowShifts.map((shiftRow) => {
              const pendingRequest = pendingReplacementBySchedule[shiftRow.schedule_id]
              const replacementDisplayName = pendingRequest
                ? getTargetDisplayName(pendingRequest, isChinese)
                : null

              return (
                <div key={shiftRow.schedule_id} className="rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {new Date(shiftRow.schedule_date).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {formatTime(shiftRow.start_time)} - {formatTime(shiftRow.end_time)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {shiftRow.role ? t(`roles.${shiftRow.role}`, { defaultValue: shiftRow.role }) : "-"}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {replacementDisplayName
                      ? t("employeeDashboard.pendingWithName", {
                        name: replacementDisplayName,
                        defaultValue: `Pending: ${replacementDisplayName}`,
                      })
                      : t("employeeDashboard.noRecommendation")}
                  </p>
                  <button
                    type="button"
                    onClick={() => openRecommendModal(shiftRow)}
                    disabled={Boolean(pendingRequest) || coworkers.length === 0}
                    className="mt-3 w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingRequest
                      ? t("employeeDashboard.requested")
                      : t("employeeDashboard.recommendReplacement")}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="px-4 py-3">{t("employeeDashboard.shiftDate")}</th>
                <th className="px-4 py-3">{t("employeeDashboard.shiftTime")}</th>
                <th className="px-4 py-3">{t("employeeDashboard.role")}</th>
                <th className="px-4 py-3">{t("employeeDashboard.status")}</th>
                <th className="px-4 py-3">{t("employeeDashboard.recommendedReplacement")}</th>
                <th className="px-4 py-3 text-right">{t("employeeDashboard.action")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={6}>
                    {t("employeeDashboard.loading")}
                  </td>
                </tr>
              ) : tomorrowShifts.length === 0 ? (
                <tr>
                  <td className="p-0" colSpan={6}>
                    <EmptyState message={t("employeeDashboard.noTomorrowShifts")} />
                  </td>
                </tr>
              ) : (
                tomorrowShifts.map((shiftRow) => {
                  const pendingRequest = pendingReplacementBySchedule[shiftRow.schedule_id]
                  const replacementDisplayName = pendingRequest
                    ? getTargetDisplayName(pendingRequest, isChinese)
                    : null

                  return (
                    <tr key={shiftRow.schedule_id} className="border-t border-slate-200 align-top transition hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(shiftRow.schedule_date).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatTime(shiftRow.start_time)} - {formatTime(shiftRow.end_time)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {shiftRow.role ? t(`roles.${shiftRow.role}`, { defaultValue: shiftRow.role }) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(shiftRow.status)}`}>
                          {shiftRow.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {replacementDisplayName
                          ? t("employeeDashboard.pendingWithName", {
                            name: replacementDisplayName,
                            defaultValue: `Pending: ${replacementDisplayName}`,
                          })
                          : t("employeeDashboard.noRecommendation")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openRecommendModal(shiftRow)}
                          disabled={Boolean(pendingRequest) || coworkers.length === 0}
                          className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendingRequest
                            ? t("employeeDashboard.requested")
                            : t("employeeDashboard.recommendReplacement")}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedShift ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">{t("employeeDashboard.modalTitle")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {formatTime(selectedShift.start_time)} - {formatTime(selectedShift.end_time)}
              </p>
            </div>

            <form className="space-y-4" onSubmit={submitReplacementRequest}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("employeeDashboard.selectReplacement")}
                </label>
                <select
                  value={replacementEmployeeId}
                  onChange={(event) => setReplacementEmployeeId(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
                  required
                >
                  <option value="">{t("employeeDashboard.selectReplacementPlaceholder")}</option>
                  {coworkers.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {getEmployeeDisplayName(employee, isChinese)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("employeeDashboard.reason")}
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
                  placeholder={t("employeeDashboard.reasonPlaceholder")}
                  required
                />
              </div>

              {submitError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {t(submitError, { defaultValue: submitError })}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRecommendModal}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t("employeeDashboard.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t("employeeDashboard.submitting") : t("employeeDashboard.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
