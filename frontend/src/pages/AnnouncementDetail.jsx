import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "../config/api"

function getEmployeeDisplayName(row, isChinese, fallbackKey) {
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

export default function AnnouncementDetail({ announcementId, isAdmin, onBack, onChanged, onDeleted }) {
  const { t, i18n } = useTranslation()
  const [announcement, setAnnouncement] = useState(null)
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [isEditMode, setIsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editPriority, setEditPriority] = useState("normal")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState("")

  const isChinese = i18n.resolvedLanguage === "zh-TW"
  const locale = isChinese ? "zh-TW" : "en-US"

  useEffect(() => {
    const controller = new AbortController()

    async function loadDetail() {
      try {
        setIsLoading(true)
        setError("")

        const [announcementResponse, commentsResponse] = await Promise.all([
          apiFetch(`/announcements/${announcementId}`, { signal: controller.signal }),
          apiFetch(`/announcements/${announcementId}/comments`, { signal: controller.signal }),
        ])

        if (!announcementResponse.ok) {
          throw new Error(`Announcement request failed with status ${announcementResponse.status}`)
        }

        if (!commentsResponse.ok) {
          throw new Error(`Comments request failed with status ${commentsResponse.status}`)
        }

        const [announcementData, commentsData] = await Promise.all([
          announcementResponse.json(),
          commentsResponse.json(),
        ])

        setAnnouncement(announcementData)
        setComments(Array.isArray(commentsData) ? commentsData : [])
        setEditTitle(String(announcementData.title || ""))
        setEditContent(String(announcementData.content || ""))
        setEditPriority(String(announcementData.priority || "normal"))
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError("announcements.detailLoadError")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadDetail()
    return () => controller.abort()
  }, [announcementId])

  const createdAtLabel = useMemo(() => {
    if (!announcement?.created_at) return "-"
    const date = new Date(announcement.created_at)
    if (Number.isNaN(date.getTime())) return "-"
    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [announcement?.created_at, locale])

  async function saveEdit(event) {
    event.preventDefault()

    if (!editTitle.trim() || !editContent.trim()) {
      setError("announcements.validation")
      return
    }

    try {
      setIsSavingEdit(true)
      setError("")
      const response = await apiFetch(`/announcements/${announcementId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          priority: editPriority,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("announcements.saveError"))
      }

      const updated = await response.json()
      setAnnouncement(updated)
      setIsEditMode(false)
      onChanged?.()
    } catch (saveError) {
      setError(saveError.message || "announcements.saveError")
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function deleteAnnouncement() {
    const confirmed = window.confirm(t("announcements.confirmDelete"))
    if (!confirmed) return

    try {
      setError("")
      const response = await apiFetch(`/announcements/${announcementId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("announcements.deleteError"))
      }

      onDeleted?.()
    } catch (deleteError) {
      setError(deleteError.message || "announcements.deleteError")
    }
  }

  async function submitComment(event) {
    event.preventDefault()

    if (!newComment.trim()) {
      setCommentError("announcements.commentValidation")
      return
    }

    try {
      setIsSubmittingComment(true)
      setCommentError("")

      const response = await apiFetch(`/announcements/${announcementId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: newComment.trim() }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("announcements.commentSaveError"))
      }

      const createdComment = await response.json()
      setComments((prev) => [...prev, createdComment])
      setNewComment("")
      onChanged?.()
    } catch (submitError) {
      setCommentError(submitError.message || "announcements.commentSaveError")
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {t("announcements.backToList")}
      </button>

      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
          {t(error, { defaultValue: error })}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {t("announcements.loading")}
        </div>
      ) : !announcement ? (
        <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {t("announcements.notFound")}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
            {isEditMode ? (
              <form className="space-y-4" onSubmit={saveEdit}>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("announcements.title")}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("announcements.priorityLabel")}
                  </label>
                  <select
                    value={editPriority}
                    onChange={(event) => setEditPriority(event.target.value)}
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
                    rows={6}
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingEdit ? t("announcements.saving") : t("announcements.save")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{announcement.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("announcements.postedBy")}: {getEmployeeDisplayName(announcement, isChinese, "created_by")} | {createdAtLabel}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${priorityBadge(announcement.priority)}`}>
                    {t(`announcements.priority.${announcement.priority}`, { defaultValue: announcement.priority })}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{announcement.content}</p>

                {isAdmin ? (
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                    >
                      {t("announcements.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={deleteAnnouncement}
                      className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      {t("announcements.delete")}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">{t("announcements.comments")}</h3>

            <div className="mt-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">{t("announcements.noComments")}</p>
              ) : (
                comments.map((commentRow) => (
                  <div key={commentRow.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {getEmployeeDisplayName(commentRow, isChinese, "author")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{commentRow.comment}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {new Date(commentRow.created_at).toLocaleString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form className="mt-4 space-y-2" onSubmit={submitComment}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("announcements.addComment")}
              </label>
              <textarea
                rows={3}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-slate-500"
                placeholder={t("announcements.commentPlaceholder")}
              />
              {commentError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {t(commentError, { defaultValue: commentError })}
                </div>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingComment ? t("announcements.commentSubmitting") : t("announcements.commentSubmit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
