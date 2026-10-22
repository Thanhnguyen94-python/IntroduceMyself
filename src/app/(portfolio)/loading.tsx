// Hiện ngay khi bấm chuyển trang (trang force-dynamic phải chờ server) để không có cảm giác "đứng".
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-300/50 dark:bg-slate-700/50" />
      <div className="card h-40 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card h-32 animate-pulse" />
        <div className="card h-32 animate-pulse" />
        <div className="card h-32 animate-pulse" />
      </div>
    </div>
  );
}
