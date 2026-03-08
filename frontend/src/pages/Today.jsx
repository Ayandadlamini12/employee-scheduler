import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { API_BASE_URL } from "../config/api"

function formatTime(value) {
  if (!value) return "-"
  const match = String(value).match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : "-"
}

function getEmployeeDisplayName(row, isChinese) {
  if (isChinese && row.employee_chinese_name) {
    return row.employee_chinese_name
  }

  if (row.employee_english_name) {
    return row.employee_english_name
  }

  return row.employee_name || "-"
}

function statusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "scheduled") return "bg-blue-100 text-blue-900 ring-blue-300"
  if (normalized === "published") return "bg-emerald-100 text-emerald-900 ring-emerald-300"
  if (normalized === "completed") return "bg-slate-200 text-slate-900 ring-slate-300"
  if (normalized === "cancelled") return "bg-rose-100 text-rose-900 ring-rose-300"
  return "bg-slate-200 text-slate-900 ring-slate-300"
}

export default function Today() {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRow, setSelectedRow] = useState(null)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isChinese = i18n.resolvedLanguage === "zh-TW"
  const locale = isChinese ? "zh-TW" : "en-US"

  useEffect(() => {
    const controller = new AbortController()

    async function loadTodaySchedule() {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch(`${API_BASE_URL}/schedule/today`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`)
        }

        const data = await response.json()
        setRows(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("today.failedLoad")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadTodaySchedule()
    return () => controller.abort()
  }, [])

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [locale])

  function openAdjustModal(row) {
    setSelectedRow(row)
    setStartTime(formatTime(row.start_time))
    setEndTime(formatTime(row.end_time))
    setSubmitError("")
  }

  function closeAdjustModal() {
    setSelectedRow(null)
    setSubmitError("")
    setIsSaving(false)
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!selectedRow) return

    if (!startTime || !endTime) {
      setSubmitError("today.timeRequired")
      return
    }

    try {
      setIsSaving(true)
      setSubmitError("")

      const response = await fetch(`${API_BASE_URL}/schedule/${selectedRow.schedule_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("today.failedSave"))
      }

      const updatedRow = await response.json()
      setRows((prevRows) =>
        prevRows.map((row) => (row.schedule_id === updatedRow.schedule_id ? updatedRow : row))
      )
      closeAdjustModal()
    } catch (saveError) {
      setSubmitError(saveError.message || "today.failedSave")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t("today.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {todayLabel} | {t("today.subtitle")}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full text-sm">
            <thead className="bg-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="px-4 py-3">{t("today.employee")}</th>
                <th className="px-4 py-3">{t("today.role")}</th>
                <th className="px-4 py-3">{t("today.shift")}</th>
                <th className="px-4 py-3">{t("today.status")}</th>
                <th className="px-4 py-3 text-right">{t("today.action")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    {t("today.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    {t("today.noShifts")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.schedule_id} className="border-t border-slate-200 align-top transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {getEmployeeDisplayName(row, isChinese)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.role ? t(`roles.${row.role}`, { defaultValue: row.role }) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatTime(row.start_time)} - {formatTime(row.end_time)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(row.status)}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(row)}
                        className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                      >
                        {t("today.adjust")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">{t("today.editShift")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {getEmployeeDisplayName(selectedRow, isChinese)}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("today.startTime")}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("today.endTime")}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
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
                  onClick={closeAdjustModal}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t("today.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? t("today.saving") : t("today.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
