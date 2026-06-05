import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"
import AnnouncementDetail from "./AnnouncementDetail"
import EmptyState from "../components/EmptyState"

function getEmployeeDisplayName(row, isChinese, fallbackKey = "created_by") {
  if (isChinese && row?.[`${fallbackKey}_chinese_name`]) {
    return row[`${fallbackKey}_chinese_name`]
  }

  if (row?.[`${fallbackKey}_english_name`]) {
    return row[`${fallbackKey}_english_name`]
  }

  return row?.[`${fallbackKey}_name`] || "-"
}

function priorityBadge(priority) {
  const normalized = String(priority || "").toLowerCase()
  if (normalized === "urgent") return "bg-rose-100 text-rose-800 ring-rose-200"
  if (normalized === "high") return "bg-amber-100 text-amber-800 ring-amber-200"
  if (normalized === "normal") return "bg-blue-100 text-blue-800 ring-blue-200"
  return "bg-slate-100 text-slate-700 ring-slate-200"
}

export default function Announcements({ isAdmin }) {
  const { t, i18n } = useTranslation()
  const [announcements, setAnnouncements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState("normal")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState("")

  const isChinese = i18n.resolvedLanguage === "zh-TW"
  const locale = isChinese ? "zh-TW" : "en-US"

  async function loadAnnouncements(signal) {
    try {
      setIsLoading(true)
      setError("")

      const response = await apiFetch("/announcements", { signal })
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`)
      }

      const data = await response.json()
      setAnnouncements(Array.isArray(data) ? data : [])
    } catch (loadError) {
      if (loadError.name !== "AbortError") {
        setError("announcements.loadError")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadAnnouncements(controller.signal)
    return () => controller.abort()
  }, [])

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      const first = new Date(a.created_at).getTime()
      const second = new Date(b.created_at).getTime()
      return second - first
    })
  }, [announcements])

  async function createAnnouncement(event) {
    event.preventDefault()

    if (!title.trim() || !content.trim()) {
      setCreateError("announcements.validation")
      return
    }

    try {
      setIsSubmitting(true)
      setCreateError("")

      const response = await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("announcements.createError"))
      }

      const created = await response.json()
      setAnnouncements((prev) => [created, ...prev])
      setTitle("")
      setContent("")
      setPriority("normal")
      setIsCreateOpen(false)
    } catch (submitError) {
      setCreateError(submitError.message || "announcements.createError")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (selectedAnnouncementId) {
    return (
      <AnnouncementDetail
        announcementId={selectedAnnouncementId}
        isAdmin={isAdmin}
        onBack={() => setSelectedAnnouncementId(null)}
        onChanged={() => loadAnnouncements()}
        onDeleted={() => {
          setSelectedAnnouncementId(null)
          loadAnnouncements()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t("announcements.titlePage")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("announcements.subtitle")}</p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => setIsCreateOpen((prev) => !prev)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {isCreateOpen ? t("announcements.closeCreate") : t("announcements.new")}
          </button>
        ) : null}
      </div>

      {isAdmin && isCreateOpen ? (
        <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={createAnnouncement}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("announcements.title")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("announcements.priorityLabel")}
              </label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
              >
                <option value="low">{t("announcements.priorityLow")}</option>
                <option value="normal">{t("announcements.priorityNormal")}</option>
                <option value="high">{t("announcements.priorityHigh")}</option>
                <option value="urgent">{t("announcements.priorityUrgent")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("announcements.content")}
              </label>
              <textarea
                rows={5}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                required
              />
            </div>

            {createError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {t(createError, { defaultValue: createError })}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t("announcements.creating") : t("announcements.create")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
            {t("announcements.loading")}
          </div>
        ) : sortedAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
            <EmptyState message={t("announcements.empty")} />
          </div>
        ) : (
          sortedAnnouncements.map((announcement) => (
            <button
              key={announcement.id}
              type="button"
              onClick={() => setSelectedAnnouncementId(announcement.id)}
              className="w-full rounded-xl border border-slate-300 bg-white p-5 text-left shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{announcement.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("announcements.postedBy")}: {getEmployeeDisplayName(announcement, isChinese)} |{" "}
                    {new Date(announcement.created_at).toLocaleString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${priorityBadge(announcement.priority)}`}>
                  {t(`announcements.priority.${announcement.priority}`, { defaultValue: announcement.priority })}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">{announcement.content}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
