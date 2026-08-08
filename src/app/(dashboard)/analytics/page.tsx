"use client";

import { useEffect, useState } from "react";
import MetricsSummary from "@/components/analytics/MetricsSummary";
import UptimeChart from "@/components/analytics/UptimeChart";

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

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-gray-500">Uptime, response times, and reliability metrics</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <UptimeChart metrics={metrics} />
          <MetricsSummary metrics={metrics} />
        </>
      )}
    </div>
  );
}
