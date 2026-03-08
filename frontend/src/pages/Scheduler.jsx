import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { API_BASE_URL } from "../config/api"

const shiftTypeStyles = {
  opening: "bg-emerald-600 text-white ring-1 ring-emerald-700",
  mid: "bg-blue-600 text-white ring-1 ring-blue-700",
  closing: "bg-purple-600 text-white ring-1 ring-purple-700",
  weekend: "bg-amber-500 text-slate-950 ring-1 ring-amber-600",
}

function parseDateOnly(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDateOnly(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getWeekStartMonday(date) {
  const dayOffset = (date.getDay() + 6) % 7
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - dayOffset)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

function normalizeTime(value) {
  return String(value || "").slice(0, 5)
}

function shiftTypeFromNameOrTime(shiftName, startTime, scheduleDate) {
  const name = String(shiftName || "").toLowerCase()
  if (name.includes("open")) return "opening"
  if (name.includes("close")) return "closing"
  if (name.includes("mid")) return "mid"

  const day = parseDateOnly(scheduleDate).getDay()
  if (day === 0 || day === 6) return "weekend"

  const startHour = Number(startTime.slice(0, 2))
  if (startHour < 9) return "opening"
  if (startHour >= 14) return "closing"
  return "mid"
}

function getShiftMinutes(startTime, endTime, isOvernight) {
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)
  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute

  if (isOvernight || endTotal < startTotal) {
    return 24 * 60 - startTotal + endTotal
  }

  return endTotal - startTotal
}

function getEmployeeDisplayName(employee, isChinese) {
  if (isChinese && employee.chinese_name) {
    return employee.chinese_name
  }

  if (employee.english_name) {
    return employee.english_name
  }

  if (employee.first_name || employee.last_name) {
    return `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
  }

  return employee.employee_name || "-"
}

function ShiftBlock({ shift }) {
  const { t } = useTranslation()
  const blockStyles = shift.isRequested
    ? "bg-rose-600 text-white ring-1 ring-rose-700"
    : shiftTypeStyles[shift.type] || shiftTypeStyles.mid

  return (
    <button
      type="button"
      onClick={shift.onClick}
      className={`w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold transition hover:brightness-95 ${blockStyles}`}
    >
      {shift.start} - {shift.end}
      {shift.isRequested ? <span className="ml-1 align-middle text-[10px]">{t("requested")}</span> : null}
    </button>
  )
}

function ScheduleCell({ shifts, onShiftClick }) {
  const { t } = useTranslation()

  if (!shifts || shifts.length === 0) {
    return <div className="text-xs font-medium text-slate-500">{t("off")}</div>
  }

  return (
    <div className="space-y-1">
      {shifts.map((shift, index) => (
        <ShiftBlock
          key={`${shift.scheduleId}-${shift.start}-${shift.end}-${index}`}
          shift={{ ...shift, onClick: () => onShiftClick(shift) }}
        />
      ))}
    </div>
  )
}

export default function Scheduler() {
  const { t, i18n } = useTranslation()
  const [scheduleRows, setScheduleRows] = useState([])
  const [requestRows, setRequestRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedShift, setSelectedShift] = useState(null)
  const [newStartTime, setNewStartTime] = useState("")
  const [newEndTime, setNewEndTime] = useState("")
  const [reason, setReason] = useState("")
  const [requestError, setRequestError] = useState("")
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const isChinese = i18n.resolvedLanguage === "zh-TW"
  const locale = isChinese ? "zh-TW" : "en-US"

  useEffect(() => {
    const controller = new AbortController()

    async function loadSchedule() {
      try {
        setIsLoading(true)
        setError("")

        const [scheduleResponse, requestsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/schedule`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/requests`, { signal: controller.signal }),
        ])

        if (!scheduleResponse.ok) {
          throw new Error(`Schedule request failed with status ${scheduleResponse.status}`)
        }

        if (!requestsResponse.ok) {
          throw new Error(`Requests request failed with status ${requestsResponse.status}`)
        }

        const [scheduleData, requestsData] = await Promise.all([
          scheduleResponse.json(),
          requestsResponse.json(),
        ])

        setScheduleRows(Array.isArray(scheduleData) ? scheduleData : [])
        setRequestRows(Array.isArray(requestsData) ? requestsData : [])
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("failedToLoadScheduleData")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSchedule()

    return () => controller.abort()
  }, [])

  const requestedScheduleIds = useMemo(() => {
    const ids = new Set()

    requestRows.forEach((requestRow) => {
      const type = String(requestRow.request_type || "")
      const status = String(requestRow.status || "").toLowerCase()
      const scheduleId = requestRow.schedule_id

      if (!scheduleId) return
      if (status !== "pending") return
      if (type === "change" || type === "availability_change") {
        ids.add(scheduleId)
      }
    })

    return ids
  }, [requestRows])

  const weekStart = useMemo(() => {
    if (scheduleRows.length === 0) {
      return getWeekStartMonday(new Date())
    }

    const earliestDate = scheduleRows.reduce((minDate, row) => {
      const rowDate = parseDateOnly(row.schedule_date)
      return rowDate < minDate ? rowDate : minDate
    }, parseDateOnly(scheduleRows[0].schedule_date))

    return getWeekStartMonday(earliestDate)
  }, [scheduleRows])

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)
      return {
        key: formatDateOnly(date),
        label: date.toLocaleDateString(locale, { weekday: "short" }),
        date: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      }
    })
  }, [locale, weekStart])

  const employees = useMemo(() => {
    const weekStartKey = formatDateOnly(weekStart)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const weekEndKey = formatDateOnly(weekEnd)

    const employeeMap = new Map()

    scheduleRows.forEach((row) => {
      const scheduleKey = String(row.schedule_date).slice(0, 10)
      if (scheduleKey < weekStartKey || scheduleKey > weekEndKey) {
        return
      }

      if (!employeeMap.has(row.employee_id)) {
        employeeMap.set(row.employee_id, {
          id: row.employee_id,
          displayName: getEmployeeDisplayName(row, isChinese),
          role: row.role_title,
          scheduledMinutes: 0,
          shiftsByDate: {},
        })
      }

      const employee = employeeMap.get(row.employee_id)
      const start = normalizeTime(row.start_time)
      const end = normalizeTime(row.end_time)

      const shift = {
        scheduleId: row.id,
        employeeId: row.employee_id,
        employeeName: getEmployeeDisplayName(row, isChinese),
        scheduleDate: scheduleKey,
        start,
        end,
        type: shiftTypeFromNameOrTime(row.shift_name, start, scheduleKey),
        isRequested: requestedScheduleIds.has(row.id),
      }

      if (!employee.shiftsByDate[scheduleKey]) {
        employee.shiftsByDate[scheduleKey] = []
      }

      employee.shiftsByDate[scheduleKey].push(shift)
      employee.scheduledMinutes += getShiftMinutes(start, end, row.is_overnight)
    })

    return Array.from(employeeMap.values())
      .map((employee) => ({
        ...employee,
        scheduledHours: Math.round((employee.scheduledMinutes / 60) * 10) / 10,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, locale))
  }, [isChinese, locale, requestedScheduleIds, scheduleRows, weekStart])

  const weekRangeLabel = useMemo(() => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const startLabel = weekStart.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const endLabel = weekEnd.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    return t("weekOfRange", { start: startLabel, end: endLabel })
  }, [locale, t, weekStart])

  function handleShiftClick(shift) {
    setSelectedShift(shift)
    setNewStartTime(shift.start)
    setNewEndTime(shift.end)
    setReason("")
    setRequestError("")
  }

  function closeRequestModal() {
    setSelectedShift(null)
    setRequestError("")
    setIsSubmittingRequest(false)
  }

  async function handleRequestSubmit(event) {
    event.preventDefault()

    if (!selectedShift) return

    if (!newStartTime || !newEndTime || !reason.trim()) {
      setRequestError("requestValidationError")
      return
    }

    try {
      setIsSubmittingRequest(true)
      setRequestError("")

      const combinedReason = `${reason.trim()}\nRequested change: ${newStartTime}-${newEndTime}`
      const requestedStart = `${selectedShift.scheduleDate}T${newStartTime}:00`
      const requestedEnd = `${selectedShift.scheduleDate}T${newEndTime}:00`

      const response = await fetch(`${API_BASE_URL}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedShift.employeeId,
          schedule_id: selectedShift.scheduleId,
          request_type: "change",
          requested_start: requestedStart,
          requested_end: requestedEnd,
          reason: combinedReason,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("failedToSubmitRequest"))
      }

      const createdRequest = await response.json()
      setRequestRows((prevRows) => [createdRequest, ...prevRows])
      closeRequestModal()
    } catch (submitError) {
      setRequestError(submitError.message || "failedToSubmitRequest")
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("weeklySchedule")}</h1>
          <p className="mt-1 text-sm text-slate-500">{weekRangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white ring-1 ring-emerald-700">
            {t("opening")}
          </span>
          <span className="rounded-full bg-blue-600 px-3 py-1 font-semibold text-white ring-1 ring-blue-700">
            {t("mid")}
          </span>
          <span className="rounded-full bg-purple-600 px-3 py-1 font-semibold text-white ring-1 ring-purple-700">
            {t("closing")}
          </span>
          <span className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-slate-950 ring-1 ring-amber-600">
            {t("weekend")}
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div className="grid grid-cols-[220px_repeat(7,minmax(100px,1fr))] border-b border-slate-300 bg-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700">
              <div className="border-r border-slate-300 px-4 py-3">{t("employee")}</div>
              {days.map((day) => (
                <div key={day.key} className="border-r border-slate-300 px-3 py-3 last:border-r-0">
                  <div>{day.label}</div>
                  <div className="mt-1 text-[11px] font-semibold normal-case tracking-normal text-slate-600">
                    {day.date}
                  </div>
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500">{t("loadingSchedule")}</div>
            ) : employees.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">{t("noScheduleDataForWeek")}</div>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-[220px_repeat(7,minmax(100px,1fr))] border-b border-slate-200 last:border-b-0 hover:bg-slate-50"
                >
                  <div className="border-r border-slate-300 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{employee.displayName}</p>
                    <p className="text-xs font-medium text-slate-700">{employee.role}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {t("hoursScheduled", { hours: employee.scheduledHours })}
                    </p>
                  </div>

                  {days.map((day) => (
                    <div key={`${employee.id}-${day.key}`} className="border-r border-slate-200 px-3 py-3 last:border-r-0">
                      <ScheduleCell
                        shifts={employee.shiftsByDate[day.key]}
                        onShiftClick={handleShiftClick}
                      />
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 md:hidden">{t("swipeToViewWeekdays")}</p>

      {selectedShift ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">{t("requestShiftAdjustment")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedShift.employeeName} | {selectedShift.scheduleDate} | {selectedShift.start}-{selectedShift.end}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleRequestSubmit}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("newStartTime")}
                </label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(event) => setNewStartTime(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("newEndTime")}
                </label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(event) => setNewEndTime(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("reasonForChange")}
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-400"
                  placeholder={t("reasonPlaceholder")}
                  required
                />
              </div>

              {requestError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {t(requestError, { defaultValue: requestError })}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingRequest ? t("submitting") : t("submitRequest")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
