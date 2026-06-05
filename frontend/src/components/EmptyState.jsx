export default function EmptyState({ message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {icon ? (
        <div className="mb-3 text-slate-400">{icon}</div>
      ) : (
        <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}
