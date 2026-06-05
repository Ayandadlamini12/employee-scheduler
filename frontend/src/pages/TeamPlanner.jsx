import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../config/api"

function formatTime(value) {
  const match = String(value || "").match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : "-"
}

function displayName(row) {
  return row.employee_english_name || row.employee_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Employee"
}

export default function TeamPlanner() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [captains, setCaptains] = useState({})

  useEffect(() => {
    const controller = new AbortController()

    async function loadToday() {
      try {
        setIsLoading(true)
        setError("")
        const response = await apiFetch("/schedule/today", { signal: controller.signal })
        if (!response.ok) throw new Error(`Failed with status ${response.status}`)
        const data = await response.json()
        setRows(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError("Could not load today's schedule for team planning.")
      } finally {
        setIsLoading(false)
      }
    }

    loadToday()
    return () => controller.abort()
  }, [])

  const teams = useMemo(() => {
    const grouped = new Map()
    const fallbackRows = rows.length ? rows : [
      { schedule_id: "demo-1", employee_english_name: "Sophia Manager", role: "Supervisor", start_time: "08:00", end_time: "12:00" },
      { schedule_id: "demo-2", employee_english_name: "Demo Employee", role: "Packaging", start_time: "08:00", end_time: "12:00" },
      { schedule_id: "demo-3", employee_english_name: "Chen Mei", role: "Indoor", start_time: "13:00", end_time: "17:00" },
    ]

    fallbackRows.forEach((row) => {
      const start = formatTime(row.start_time || row.shift_start)
      const end = formatTime(row.end_time || row.shift_end)
      const key = `${start}-${end}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    })

    return Array.from(grouped.entries()).map(([shift, members], index) => ({
      id: shift,
      label: `Team ${index + 1}`,
      shift,
      department: index % 2 === 0 ? "Operations" : "Packaging",
      members,
    }))
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Phase 5</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Daily Team Planner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Group scheduled staff into practical teams and assign a captain for the day.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {error} Showing demo layout.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
            Loading team planner...
          </div>
        ) : teams.map((team) => (
          <div key={team.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">{team.label}</h2>
                <p className="text-sm font-semibold text-slate-500">{team.department} | {team.shift}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                {team.members.length} staff
              </span>
            </div>
            <div className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Team captain</span>
                <select
                  value={captains[team.id] || ""}
                  onChange={(event) => setCaptains((prev) => ({ ...prev, [team.id]: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  <option value="">Choose captain</option>
                  {team.members.map((member) => (
                    <option key={member.schedule_id} value={displayName(member)}>{displayName(member)}</option>
                  ))}
                </select>
              </label>
              <div className="space-y-2">
                {team.members.map((member) => (
                  <div key={member.schedule_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{displayName(member)}</p>
                      <p className="text-xs text-slate-500">{member.role || member.role_title || "Team member"}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Assigned</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
