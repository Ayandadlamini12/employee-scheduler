import { useMemo, useState } from "react"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const shifts = ["06:20-10:30", "08:00-12:00", "13:00-17:00", "17:00-21:00"]
const demoSubmissions = [
  { name: "Sophia Manager", monday: "08:00-12:00", tuesday: "13:00-17:00", status: "Reviewed" },
  { name: "Demo Employee", monday: "06:20-10:30", tuesday: "08:00-12:00", status: "Pending" },
  { name: "Chen Mei", monday: "13:00-17:00", tuesday: "Off", status: "Pending" },
]

function getCurrentMonday() {
  const today = new Date()
  const offset = (today.getDay() + 6) % 7
  today.setDate(today.getDate() - offset)
  return today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function Availability({ user, isAdmin }) {
  const [selected, setSelected] = useState(() => {
    return days.reduce((acc, day, index) => {
      acc[day] = index < 5 ? ["08:00-12:00"] : []
      return acc
    }, {})
  })
  const [saved, setSaved] = useState(false)

  const selectedCount = useMemo(() => {
    return Object.values(selected).reduce((total, dayShifts) => total + dayShifts.length, 0)
  }, [selected])

  function toggleShift(day, shift) {
    setSaved(false)
    setSelected((prev) => {
      const current = new Set(prev[day] || [])
      if (current.has(shift)) {
        current.delete(shift)
      } else {
        current.add(shift)
      }
      return { ...prev, [day]: Array.from(current) }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Phase 3</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">Availability</h1>
            <p className="mt-1 text-sm text-slate-500">
              Submit available shifts for the week starting {getCurrentMonday()}.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            {selectedCount} shift choices selected
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-900">My weekly availability</h2>
          <p className="text-sm text-slate-500">{user?.email || "Employee"} can update this before manager planning.</p>
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
        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => setSaved(true)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Save availability
          </button>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Availability saved for this prototype session.
        </div>
      ) : null}

      {isAdmin ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">Manager review</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Monday</th>
                  <th className="px-4 py-3">Tuesday</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {demoSubmissions.map((row) => (
                  <tr key={row.name} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.monday}</td>
                    <td className="px-4 py-3 text-slate-700">{row.tuesday}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
