interface SecurityEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  ipAddress: string;
  details: string;
  createdAt: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  low: "text-yellow-500 bg-yellow-950",
  medium: "text-orange-500 bg-orange-950",
  high: "text-red-500 bg-red-950",
  critical: "text-red-400 bg-red-900",
};

const TYPE_LABEL: Record<string, string> = {
  failed_login: "Failed login",
  brute_force_detected: "Brute-force detected",
  excessive_failed_logins: "Excessive failed logins",
  rate_limit_exceeded: "Rate limit exceeded",
  suspicious_ip: "Suspicious IP",
};

export default function SecurityEventList({ events }: { events: SecurityEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No security events recorded yet. Failed login attempts against your account will show
        up here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-sm"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${SEVERITY_STYLE[event.severity]}`}
              >
                {event.severity.toUpperCase()}
              </span>
              <span className="font-medium">{TYPE_LABEL[event.type] ?? event.type}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{event.details}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{event.ipAddress}</p>
            <p>{new Date(event.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
