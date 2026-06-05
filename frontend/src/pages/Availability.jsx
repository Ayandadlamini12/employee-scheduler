import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../config/api"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const shifts = ["06:20-10:30", "08:00-12:00", "13:00-17:00", "17:00-21:00"]

function getCurrentMonday() {
  const today = new Date()
  const offset = (today.getDay() + 6) % 7
  today.setDate(today.getDate() - offset)
  return today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function toDateTime(date, time) {
  return `${date}T${time}:00`
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (normalized === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200"
  return "bg-amber-50 text-amber-700 ring-amber-200"
}

export default function Availability({ user, isAdmin }) {
  const [selected, setSelected] = useState(() => {
    return days.reduce((acc, day, index) => {
      acc[day] = index < 5 ? ["08:00-12:00"] : []
      return acc
    }, {})
  })
  const [requests, setRequests] = useState([])
  const [requestType, setRequestType] = useState("availability_change")
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("12:00")
  const [reason, setReason] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  const selectedCount = useMemo(() => {
    return Object.values(selected).reduce((total, dayShifts) => total + dayShifts.length, 0)
  }, [selected])

  async function loadRequests(signal) {
    try {
      setIsLoadingRequests(true)
      const response = await apiFetch("/requests", { signal })
      if (!response.ok) throw new Error(`Failed with status ${response.status}`)
      const data = await response.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch (loadError) {
      if (loadError.name !== "AbortError") setError("Could not load request history.")
    } finally {
      setIsLoadingRequests(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadRequests(controller.signal)
    return () => controller.abort()
  }, [])

  function toggleShift(day, shift) {
    setStatusMessage("")
    setSelected((prev) => {
      const current = new Set(prev[day] || [])
      if (current.has(shift)) current.delete(shift)
      else current.add(shift)
      return { ...prev, [day]: Array.from(current) }
    })
  }

  async function submitRequest(event) {
    event.preventDefault()
    setError("")
    setStatusMessage("")

    if (!reason.trim()) {
      setError("A reason is required before submitting a request.")
      return
    }

    if (!requestDate || !startTime || !endTime) {
      setError("Date, start time, and end time are required.")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(user?.id),
          request_type: requestType,
          requested_start: toDateTime(requestDate, startTime),
          requested_end: toDateTime(requestDate, endTime),
          reason: reason.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Could not submit request.")
      }

      setReason("")
      setStatusMessage("Request submitted. A manager can review it under Review Requests.")
      await loadRequests()
    } catch (submitError) {
      setError(submitError.message || "Could not submit request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Rules</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">Availability and Requests</h1>
            <p className="mt-1 text-sm text-slate-500">
              Employees submit availability or time-off requests. Managers approve or reject from Review Requests.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            {selectedCount} weekly shift choices selected
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">Weekly availability</h2>
            <p className="text-sm text-slate-500">Week starting {getCurrentMonday()}. This is used by managers while planning.</p>
          </div>
          <div className="overflow-x-auto p-5">
            <div className="grid min-w-[860px] grid-cols-7 gap-3">
              {days.map((day) => (
                <div key={day} className="rounded-xl border border-slate-200 bg-white p-3">
                  <h3 className="mb-3 text-sm font-extrabold text-slate-900">{day}</h3>
                  <div className="space-y-2">
                    {shifts.map((shift) => {
                      const checked = selected[day]?.includes(shift)
                      return (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => toggleShift(day, shift)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                            checked
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          {shift}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={submitRequest} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">Submit employee request</h2>
            <p className="text-sm text-slate-500">Rules are validated before submission.</p>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Request type</span>
              <select
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
              >
                <option value="availability_change">Availability change</option>
                <option value="time_off">Time off</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-3">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Date</span>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(event) => setRequestDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Reason</span>
              <textarea
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain the request clearly for manager review"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
              />
            </label>
            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div> : null}
            {statusMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{statusMessage}</div> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-900">{isAdmin ? "All requests" : "My requests"}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date/Time</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRequests ? (
                <tr><td colSpan={4} className="px-4 py-6 text-slate-500">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-slate-500">No requests submitted yet.</td></tr>
              ) : requests.slice(0, 8).map((request) => (
                <tr key={request.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-bold text-slate-900">{String(request.request_type || "").replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {request.requested_start ? new Date(request.requested_start).toLocaleString() : request.schedule_date || "-"}
                  </td>
                  <td className="max-w-lg px-4 py-3 text-slate-600">{request.reason || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${statusClass(request.status)}`}>
                      {request.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
