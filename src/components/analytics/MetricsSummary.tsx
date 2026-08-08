interface Metrics {
  applicationName: string;
  uptimePercentDaily: number;
  uptimePercentWeekly: number;
  uptimePercentMonthly: number;
  averageResponseTimeMs: number;
  incidentCount: number;
  mttrMinutes: number | null;
  mtbfHours: number | null;
  mostCommonErrors: { error: string; count: number }[];
}

function uptimeColor(pct: number) {
  if (pct >= 99.5) return "text-green-500";
  if (pct >= 97) return "text-yellow-500";
  return "text-red-500";
}

export default function MetricsSummary({ metrics }: { metrics: Metrics[] }) {
  if (metrics.length === 0) {
    return <p className="text-sm text-gray-500">Add an application to see analytics.</p>;
  }

  return (
    <div className="space-y-4">
      {metrics.map((m) => (
        <div key={m.applicationName} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="font-medium mb-3">{m.applicationName}</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Uptime (24h)</p>
              <p className={`text-lg font-semibold ${uptimeColor(m.uptimePercentDaily)}`}>
                {m.uptimePercentDaily}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Uptime (7d)</p>
              <p className={`text-lg font-semibold ${uptimeColor(m.uptimePercentWeekly)}`}>
                {m.uptimePercentWeekly}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Uptime (30d)</p>
              <p className={`text-lg font-semibold ${uptimeColor(m.uptimePercentMonthly)}`}>
                {m.uptimePercentMonthly}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg response</p>
              <p className="text-lg font-semibold">{m.averageResponseTimeMs}ms</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">MTTR</p>
              <p className="text-lg font-semibold">
                {m.mttrMinutes != null ? `${m.mttrMinutes}m` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">MTBF</p>
              <p className="text-lg font-semibold">
                {m.mtbfHours != null ? `${m.mtbfHours}h` : "—"}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            {m.incidentCount} incident{m.incidentCount === 1 ? "" : "s"} in the last 30 days
          </p>

          {m.mostCommonErrors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-1.5">Most common errors</p>
              <ul className="space-y-1 text-xs text-gray-400">
                {m.mostCommonErrors.map((e, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span className="truncate">{e.error}</span>
                    <span className="text-gray-500 flex-shrink-0">×{e.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
