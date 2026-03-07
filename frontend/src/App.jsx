import { useState } from "react"
import Dashboard from "./pages/Dashboard"
import Scheduler from "./pages/Scheduler"
import Employees from "./pages/Employees"

export default function App() {

  const [page, setPage] = useState("dashboard")

  const renderPage = () => {
    if (page === "scheduler") return <Scheduler />
    if (page === "employees") return <Employees />
    return <Dashboard />
  }

  return (
    <div className="flex h-screen bg-gray-100">

      <div className="w-64 bg-white shadow-lg p-6">

        <h1 className="text-xl font-bold mb-10">
          Qilai Meidi
        </h1>

        <nav className="space-y-4">

          <div
            onClick={() => setPage("dashboard")}
            className="cursor-pointer"
          >
            Dashboard
          </div>

          <div
            onClick={() => setPage("scheduler")}
            className="cursor-pointer"
          >
            Scheduler
          </div>

          <div
            onClick={() => setPage("employees")}
            className="cursor-pointer"
          >
            Employees
          </div>

        </nav>

      </div>

      <div className="flex-1 p-10">
        {renderPage()}
      </div>

    </div>
  )
}
