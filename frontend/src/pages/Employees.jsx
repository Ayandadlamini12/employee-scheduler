import { useTranslation } from "react-i18next"

export default function Employees() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-3xl font-bold">
        {t("employees")}
      </h1>
    </div>
  )
}
