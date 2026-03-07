export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Employee Scheduling System
      </h1>

      <div className="grid grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded shadow">
          <p>Employees</p>
          <h2 className="text-3xl font-bold">24</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>Shifts Today</p>
          <h2 className="text-3xl font-bold">18</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>Requests</p>
          <h2 className="text-3xl font-bold">4</h2>
        </div>

      </div>
    </div>
  )
}
