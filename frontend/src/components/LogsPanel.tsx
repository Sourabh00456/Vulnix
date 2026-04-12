"use client";

export default function LogsPanel({ logs, status }: { logs?: { time: string; msg: string }[]; status?: string }) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeStatus = status ?? "";

  return (
    <div className="bg-surface-container-low rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="label-font text-xs uppercase tracking-widest font-bold">Extraction Stream</h3>
        {safeStatus === "scanning" && (
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
        )}
      </div>
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {safeLogs.map((log, i) => (
          <div key={i} className="flex gap-4 items-start animate-[fadeIn_0.5s_ease-out]">
            <span className="mono text-[10px] text-on-surface-variant pt-1 shrink-0">{log?.time ?? ""}</span>
            <p className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: log?.msg ?? "" }} />
          </div>
        ))}
        {safeLogs.length === 0 && safeStatus === "scanning" && (
          <p className="text-xs text-on-surface-variant">Waiting for logs...</p>
        )}
        {safeLogs.length === 0 && safeStatus !== "scanning" && (
          <p className="text-xs text-on-surface-variant italic">No log entries recorded.</p>
        )}
      </div>
    </div>
  );
}
