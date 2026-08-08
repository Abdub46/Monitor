"use client";

import { useEffect, useState, useCallback } from "react";

interface LogRow {
  timestamp: string;
  application: string;
  status: string;
  responseTimeMs: number;
  httpStatusCode: number | string;
  error: string;
}

const STATUS_COLOR: Record<string, string> = {
  online: "text-green-500",
  slow: "text-yellow-500",
  offline: "text-red-500",
};

export default function LogTable() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);

    const res = await fetch(`/api/logs?${params.toString()}`);
    if (res.ok) {
      setLogs(await res.json());
    }
    setLoading(false);
  }, [status, search]);

  useEffect(() => {
    const timeout = setTimeout(loadLogs, 300); // debounce search typing
    return () => clearTimeout(timeout);
  }, [loadLogs]);

  function handleDownload() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("format", "csv");
    window.location.href = `/api/logs?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md bg-gray-900 border border-gray-800 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="online">Online</option>
          <option value="slow">Slow</option>
          <option value="offline">Offline</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search error message..."
          className="rounded-md bg-gray-900 border border-gray-800 px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <button
          onClick={handleDownload}
          className="text-sm rounded-md border border-gray-700 px-3 py-2 hover:bg-gray-800"
        >
          Download CSV
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">No logs match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Application</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Response</th>
                <th className="text-left px-3 py-2">HTTP</th>
                <th className="text-left px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{log.application}</td>
                  <td className={`px-3 py-2 ${STATUS_COLOR[log.status] ?? ""}`}>{log.status}</td>
                  <td className="px-3 py-2">{log.responseTimeMs}ms</td>
                  <td className="px-3 py-2">{log.httpStatusCode || "—"}</td>
                  <td className="px-3 py-2 text-gray-400 max-w-xs truncate">{log.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
