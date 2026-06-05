const reports = [
  {
    title: "Daily timetable",
    description: "Shift-by-shift daily plan grouped by team and department.",
    status: "Ready",
  },
  {
    title: "Weekly schedule",
    description: "Seven-day employee roster with assigned shifts and off days.",
    status: "Ready",
  },
  {
    title: "Employee directory",
    description: "Staff profile list with contact details and employment status.",
    status: "Draft",
  },
  {
    title: "Team assignments",
    description: "Daily team grouping, captains, and shift coverage summary.",
    status: "Draft",
  },
]

export default function Reports() {
  function printPage() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 print:text-slate-500">Phase 6</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">Reports and Print Views</h1>
            <p className="mt-1 text-sm text-slate-500">
              Prototype report center for schedules, teams, and employee records.
            </p>
          </div>
          <button
            type="button"
            onClick={printPage}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 print:hidden"
          >
            Print demo report
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">{report.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{report.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {report.status}
              </span>
            </div>
            <div className="mt-5 flex gap-2 print:hidden">
              <button type="button" onClick={printPage} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Print
              </button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-950">Printable weekly summary</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Generated for</th>
                <th className="px-4 py-3">Coverage</th>
                <th className="px-4 py-3">Approval</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3 font-bold text-slate-900">Weekly Schedule</td>
                <td className="px-4 py-3 text-slate-700">Manager/Admin</td>
                <td className="px-4 py-3 text-slate-700">Monday to Sunday</td>
                <td className="px-4 py-3 text-slate-700">Pending final review</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3 font-bold text-slate-900">Daily Team Plan</td>
                <td className="px-4 py-3 text-slate-700">Shift leaders</td>
                <td className="px-4 py-3 text-slate-700">Today</td>
                <td className="px-4 py-3 text-slate-700">Ready to print</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
