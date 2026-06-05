import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../config/api"

function formatTime(value) {
  const match = String(value || "").match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : "-"
}

function displayName(row) {
  return row.employee_english_name || row.employee_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Employee"
}

function buildInitialTeams(rows) {
  const sourceRows = rows.length ? rows : [
    { schedule_id: "demo-1", employee_english_name: "Sophia Manager", role: "Supervisor", start_time: "08:00", end_time: "12:00" },
    { schedule_id: "demo-2", employee_english_name: "Demo Employee", role: "Packaging", start_time: "08:00", end_time: "12:00" },
    { schedule_id: "demo-3", employee_english_name: "Chen Mei", role: "Indoor", start_time: "13:00", end_time: "17:00" },
    { schedule_id: "demo-4", employee_english_name: "Alex Lin", role: "Outdoor", start_time: "13:00", end_time: "17:00" },
  ]

  const grouped = new Map()
  sourceRows.forEach((row) => {
    const start = formatTime(row.start_time || row.shift_start)
    const end = formatTime(row.end_time || row.shift_end)
    const key = `${start}-${end}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push({ ...row, assignmentId: String(row.schedule_id || `${key}-${displayName(row)}`) })
  })

  return Array.from(grouped.entries()).map(([shift, members], index) => ({
    id: `team-${index + 1}`,
    label: `Team ${index + 1}`,
    shift,
    department: index % 2 === 0 ? "Operations" : "Packaging",
    members,
  }))
}

export default function TeamPlanner() {
  const [teams, setTeams] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [captains, setCaptains] = useState({})
  const [moveTarget, setMoveTarget] = useState({})

  useEffect(() => {
    const controller = new AbortController()

    async function loadToday() {
      try {
        setIsLoading(true)
        setError("")
        const response = await apiFetch("/schedule/today", { signal: controller.signal })
        if (!response.ok) throw new Error(`Failed with status ${response.status}`)
        const data = await response.json()
        const nextRows = Array.isArray(data) ? data : []
        setTeams(buildInitialTeams(nextRows))
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("Could not load today's schedule for team planning. Showing demo layout.")
          setTeams(buildInitialTeams([]))
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadToday()
    return () => controller.abort()
  }, [])

  const teamOptions = useMemo(() => teams.map((team) => ({ id: team.id, label: team.label })), [teams])
  const totalMembers = useMemo(() => teams.reduce((total, team) => total + team.members.length, 0), [teams])

  function moveMember(member, fromTeamId, toTeamId) {
    if (!toTeamId || toTeamId === fromTeamId) return

    setTeams((prevTeams) => {
      let movingMember = null
      const withoutMember = prevTeams.map((team) => {
        if (team.id !== fromTeamId) return team
        movingMember = team.members.find((item) => item.assignmentId === member.assignmentId)
        return { ...team, members: team.members.filter((item) => item.assignmentId !== member.assignmentId) }
      })

      if (!movingMember) return prevTeams

      return withoutMember.map((team) => {
        if (team.id !== toTeamId) return team
        return { ...team, members: [...team.members, movingMember] }
      })
    })

    setMoveTarget((prev) => ({ ...prev, [member.assignmentId]: "" }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Team assignments</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">Daily Team Planner</h1>
            <p className="mt-1 text-sm text-slate-500">
              Admin can move scheduled people between teams and assign a team captain.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            {totalMembers} assigned staff
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {error}
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
                    <option key={member.assignmentId} value={displayName(member)}>{displayName(member)}</option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                {team.members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-500">
                    No staff assigned. Move someone into this team.
                  </div>
                ) : team.members.map((member) => (
                  <div key={member.assignmentId} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{displayName(member)}</p>
                        <p className="text-xs text-slate-500">{member.role || member.role_title || "Team member"}</p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={moveTarget[member.assignmentId] || ""}
                          onChange={(event) => setMoveTarget((prev) => ({ ...prev, [member.assignmentId]: event.target.value }))}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"
                        >
                          <option value="">Move to...</option>
                          {teamOptions.filter((option) => option.id !== team.id).map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => moveMember(member, team.id, moveTarget[member.assignmentId])}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          Move
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-950">Assignment rules</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">One captain per team.</div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">Staff can be moved between same-day teams.</div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">Final persistence can be added after demo approval.</div>
        </div>
      </div>
    </div>
  )
}
