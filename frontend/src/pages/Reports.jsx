import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../config/api"

function formatTime(value) {
  const match = String(value || "").match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : "-"
}

function displayName(row) {
  return row.employee_english_name || row.employee_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Employee"
}

function dateKey(value) {
  return String(value || "").slice(0, 10)
}

function printPage() {
  window.print()
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState("weekly")
  const [weeklyRows, setWeeklyRows] = useState([])
  const [dailyRows, setDailyRows] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadReports() {
      try {
        setIsLoading(true)
        setError("")
        const [weeklyResponse, dailyResponse] = await Promise.all([
          apiFetch("/schedule", { signal: controller.signal }),
          apiFetch("/schedule/today", { signal: controller.signal }),
        ])

        if (!weeklyResponse.ok) throw new Error(`Weekly schedule failed with status ${weeklyResponse.status}`)
        if (!dailyResponse.ok) throw new Error(`Daily schedule failed with status ${dailyResponse.status}`)

        const [weeklyData, dailyData] = await Promise.all([weeklyResponse.json(), dailyResponse.json()])
        setWeeklyRows(Array.isArray(weeklyData) ? weeklyData : [])
        setDailyRows(Array.isArray(dailyData) ? dailyData : [])
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError("Could not load report data.")
      } finally {
        setIsLoading(false)
      }
    }

    loadReports()
    return () => controller.abort()
  }, [])

  const weekDays = useMemo(() => {
    const unique = Array.from(new Set(weeklyRows.map((row) => dateKey(row.schedule_date)).filter(Boolean))).sort()
    return unique.slice(0, 7)
  }, [weeklyRows])

  const weeklyEmployees = useMemo(() => {
    const map = new Map()
    weeklyRows.forEach((row) => {
      const employeeId = row.employee_id
      if (!map.has(employeeId)) {
        map.set(employeeId, { id: employeeId, name: displayName(row), role: row.role_title || row.role || "-", shifts: {} })
      }
      const employee = map.get(employeeId)
      const key = dateKey(row.schedule_date)
      if (!employee.shifts[key]) employee.shifts[key] = []
      employee.shifts[key].push(`${formatTime(row.start_time)}-${formatTime(row.end_time)}`)
    })
    return Array.from(map.values())
  }, [weeklyRows])

  const dailyGroups = useMemo(() => {
    const groups = new Map()
    dailyRows.forEach((row) => {
      const shift = `${formatTime(row.start_time || row.shift_start)}-${formatTime(row.end_time || row.shift_end)}`
      if (!groups.has(shift)) groups.set(shift, [])
      groups.get(shift).push(row)
    })
    return Array.from(groups.entries())
  }, [dailyRows])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 print:text-slate-500">Reports</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">Schedule Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              Working weekly and daily schedule reports for printing and review.
            </p>
          </div>
          <button
            type="button"
            onClick={printPage}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 print:hidden"
          >
            Print current report
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 print:hidden">
        {[
          ["weekly", "Weekly schedule"],
          ["daily", "Daily schedule"],
          ["teams", "Team assignments"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveReport(key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              activeReport === key ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
          Loading reports...
        </div>
      ) : null}

      {!isLoading && activeReport === "weekly" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-950">Weekly Schedule Report</h2>
          <p className="mt-1 text-sm text-slate-500">Employee roster by day for the current schedule week.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  {weekDays.map((day) => <th key={day} className="px-4 py-3">{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeklyEmployees.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={weekDays.length + 1}>No weekly schedule data.</td></tr>
                ) : weeklyEmployees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{employee.name}</p>
                      <p className="text-xs text-slate-500">{employee.role}</p>
                    </td>
                    {weekDays.map((day) => (
                      <td key={day} className="px-4 py-3 text-slate-700">
                        {employee.shifts[day]?.join(", ") || "Off"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!isLoading && activeReport === "daily" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-950">Daily Schedule Report</h2>
          <p className="mt-1 text-sm text-slate-500">Today’s shift plan grouped by shift time.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dailyGroups.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">No daily schedule data.</div>
            ) : dailyGroups.map(([shift, members]) => (
              <div key={shift} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-extrabold text-slate-950">{shift}</h3>
                <div className="mt-3 space-y-2">
                  {members.map((member) => (
                    <div key={member.schedule_id} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="font-bold text-slate-800">{displayName(member)}</span>
                      <span className="text-slate-500">{member.role || "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!isLoading && activeReport === "teams" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-950">Team Assignments Report</h2>
          <p className="mt-1 text-sm text-slate-500">Use Team Planner to move people between teams before printing this report.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dailyGroups.map(([shift, members], index) => (
              <div key={shift} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-extrabold text-slate-950">Team {index + 1}</h3>
                <p className="text-sm font-semibold text-slate-500">{shift}</p>
                <ul className="mt-3 space-y-2">
                  {members.map((member) => (
                    <li key={member.schedule_id} className="rounded-lg bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      {displayName(member)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
