import { ApplicationDTO } from "@/types";

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; border: string }
> = {
  online: { label: "Online", dot: "bg-status-online", border: "border-green-900" },
  slow: { label: "Slow", dot: "bg-status-slow", border: "border-yellow-900" },
  offline: { label: "Offline", dot: "bg-status-offline", border: "border-red-900" },
};

function formatRelativeTime(iso?: string) {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export default function StatusCard({
  app,
  onDelete,
  onToggle,
}: {
  app: ApplicationDTO;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const status = app.latestStatus ?? null;
  const config = status ? STATUS_CONFIG[status] : null;

  return (
    <div
      className={`rounded-lg border bg-gray-100 dark:bg-gray-900 p-4 ${
        config?.border ?? "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{app.name}</h3>
          <p className="text-xs text-gray-500">{app.environment}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`h-2 w-2 rounded-full ${config?.dot ?? "bg-gray-400 dark:bg-gray-600"}`} />
          {config?.label ?? "No data yet"}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <dt>Response time</dt>
        <dd className="text-right text-gray-800 dark:text-gray-200">
          {app.latestResponseTimeMs != null ? `${app.latestResponseTimeMs}ms` : "—"}
        </dd>
        <dt>Last checked</dt>
        <dd className="text-right text-gray-800 dark:text-gray-200">{formatRelativeTime(app.lastCheckedAt)}</dd>
        <dt>Interval</dt>
        <dd className="text-right text-gray-800 dark:text-gray-200">{app.monitoringIntervalSeconds}s</dd>
      </dl>

      {status === "offline" && app.latestError && (
        <p className="mt-2 text-xs text-red-500 break-words">{app.latestError}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs">
        <button
          onClick={() => onToggle(app.id, !app.isActive)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          {app.isActive ? "Pause monitoring" : "Resume monitoring"}
        </button>
        <button
          onClick={() => onDelete(app.id)}
          className="text-red-500 hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
