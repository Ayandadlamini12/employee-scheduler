import { useTranslation } from "react-i18next"

export default function Dashboard() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {t("employeeSchedulingSystem")}
      </h1>

      <div className="grid grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded shadow">
          <p>{t("employeesLabel")}</p>
          <h2 className="text-3xl font-bold">24</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>{t("shiftsToday")}</p>
          <h2 className="text-3xl font-bold">18</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p>{t("requests")}</p>
          <h2 className="text-3xl font-bold">4</h2>
        </div>

      </div>
    </div>
  )
}
