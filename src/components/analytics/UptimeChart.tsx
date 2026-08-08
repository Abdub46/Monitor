interface Metrics {
  applicationName: string;
  uptimePercentDaily: number;
  uptimePercentWeekly: number;
  uptimePercentMonthly: number;
}

function barColor(pct: number) {
  if (pct >= 99.5) return "bg-green-600";
  if (pct >= 97) return "bg-yellow-600";
  return "bg-red-600";
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 text-gray-500">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full ${barColor(pct)}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-14 text-right text-gray-400">{pct}%</span>
    </div>
  );
}

export default function UptimeChart({ metrics }: { metrics: Metrics[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-4">
      <h3 className="font-medium text-sm">Uptime by application</h3>
      {metrics.map((m) => (
        <div key={m.applicationName} className="space-y-1.5">
          <p className="text-sm">{m.applicationName}</p>
          <Bar label="24h" pct={m.uptimePercentDaily} />
          <Bar label="7d" pct={m.uptimePercentWeekly} />
          <Bar label="30d" pct={m.uptimePercentMonthly} />
        </div>
      ))}
    </div>
  );
}
