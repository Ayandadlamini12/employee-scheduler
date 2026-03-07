const days = [
  { key: "mon", label: "Mon", date: "Mar 9" },
  { key: "tue", label: "Tue", date: "Mar 10" },
  { key: "wed", label: "Wed", date: "Mar 11" },
  { key: "thu", label: "Thu", date: "Mar 12" },
  { key: "fri", label: "Fri", date: "Mar 13" },
  { key: "sat", label: "Sat", date: "Mar 14" },
  { key: "sun", label: "Sun", date: "Mar 15" },
]

const employees = [
  {
    id: 1,
    name: "Olivia Martin",
    role: "Supervisor",
    scheduledHours: 40,
    shifts: {
      mon: [{ start: "08:00", end: "16:00", type: "opening" }],
      tue: [{ start: "08:00", end: "16:00", type: "opening" }],
      wed: [{ start: "10:00", end: "18:00", type: "mid" }],
      thu: [{ start: "08:00", end: "16:00", type: "opening" }],
      fri: [{ start: "12:00", end: "20:00", type: "closing" }],
      sat: [],
      sun: [],
    },
  },
  {
    id: 2,
    name: "Ethan Clark",
    role: "Cashier",
    scheduledHours: 34,
    shifts: {
      mon: [{ start: "12:00", end: "20:00", type: "closing" }],
      tue: [{ start: "12:00", end: "20:00", type: "closing" }],
      wed: [{ start: "12:00", end: "20:00", type: "closing" }],
      thu: [],
      fri: [{ start: "09:00", end: "17:00", type: "mid" }],
      sat: [{ start: "10:00", end: "16:00", type: "weekend" }],
      sun: [],
    },
  },
  {
    id: 3,
    name: "Mia Johnson",
    role: "Stock Associate",
    scheduledHours: 30,
    shifts: {
      mon: [],
      tue: [{ start: "09:00", end: "15:00", type: "mid" }],
      wed: [{ start: "07:00", end: "13:00", type: "opening" }],
      thu: [{ start: "09:00", end: "15:00", type: "mid" }],
      fri: [],
      sat: [{ start: "11:00", end: "19:00", type: "weekend" }],
      sun: [{ start: "11:00", end: "17:00", type: "weekend" }],
    },
  },
  {
    id: 4,
    name: "Noah Williams",
    role: "Barista",
    scheduledHours: 28,
    shifts: {
      mon: [{ start: "06:00", end: "12:00", type: "opening" }],
      tue: [],
      wed: [{ start: "06:00", end: "12:00", type: "opening" }],
      thu: [{ start: "14:00", end: "20:00", type: "closing" }],
      fri: [{ start: "14:00", end: "20:00", type: "closing" }],
      sat: [],
      sun: [{ start: "09:00", end: "15:00", type: "weekend" }],
    },
  },
]

const shiftTypeStyles = {
  opening: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  mid: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  closing: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  weekend: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
}

function ShiftBlock({ shift }) {
  return (
    <div
      className={`rounded-md px-2 py-1 text-xs font-semibold ${shiftTypeStyles[shift.type]}`}
    >
      {shift.start} - {shift.end}
    </div>
  )
}

function ScheduleCell({ shifts }) {
  if (!shifts || shifts.length === 0) {
    return <div className="text-xs text-slate-400">Off</div>
  }

  return (
    <div className="space-y-1">
      {shifts.map((shift, index) => (
        <ShiftBlock key={`${shift.start}-${shift.end}-${index}`} shift={shift} />
      ))}
    </div>
  )
}

export default function Scheduler() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Weekly Schedule</h1>
          <p className="mt-1 text-sm text-slate-500">Week of March 9 to March 15, 2026</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Opening
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700 ring-1 ring-sky-200">
            Mid
          </span>
          <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700 ring-1 ring-violet-200">
            Closing
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200">
            Weekend
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div className="grid grid-cols-[220px_repeat(7,minmax(100px,1fr))] border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div className="border-r border-slate-200 px-4 py-3">Employee</div>
              {days.map((day) => (
                <div key={day.key} className="border-r border-slate-200 px-3 py-3 last:border-r-0">
                  <div>{day.label}</div>
                  <div className="mt-1 text-[11px] font-medium normal-case tracking-normal text-slate-400">
                    {day.date}
                  </div>
                </div>
              ))}
            </div>

            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-[220px_repeat(7,minmax(100px,1fr))] border-b border-slate-100 last:border-b-0"
              >
                <div className="border-r border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{employee.name}</p>
                  <p className="text-xs text-slate-500">{employee.role}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">{employee.scheduledHours}h scheduled</p>
                </div>

                {days.map((day) => (
                  <div key={`${employee.id}-${day.key}`} className="border-r border-slate-100 px-3 py-3 last:border-r-0">
                    <ScheduleCell shifts={employee.shifts[day.key]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 md:hidden">Swipe horizontally to view all weekdays.</p>
    </div>
  )
}
