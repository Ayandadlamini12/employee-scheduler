const auditRows = [
  {
    actor: "scheduler.admin@example.com",
    action: "Approved request",
    entity: "Shift change",
    time: "Today 09:20",
    summary: "Approved replacement coverage for morning shift.",
  },
  {
    actor: "scheduler.admin@example.com",
    action: "Updated schedule",
    entity: "Weekly roster",
    time: "Today 08:45",
    summary: "Adjusted Demo Employee shift from 08:00 to 12:00.",
  },
  {
    actor: "scheduler.employee@example.com",
    action: "Submitted availability",
    entity: "Availability",
    time: "Yesterday 16:10",
    summary: "Submitted preferred shifts for the upcoming week.",
  },
  {
    actor: "System",
    action: "Generated schedule",
    entity: "Fixed schedule",
    time: "Yesterday 07:00",
    summary: "Created schedule rows from fixed weekly template.",
  },
]

export default function AuditLog() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Phase 7</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Lightweight Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Prototype traceability for schedule, request, availability, and admin changes.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={`${row.time}-${row.action}`} className="border-t border-slate-200 align-top hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">{row.time}</td>
                  <td className="px-4 py-3 text-slate-700">{row.actor}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.action}</td>
                  <td className="px-4 py-3 text-slate-700">{row.entity}</td>
                  <td className="px-4 py-3 text-slate-600">{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Tracked actions</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">4</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Admin changes</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">2</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">System events</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">1</p>
        </div>
      </div>
    </div>
  )
}
