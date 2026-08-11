"use client";

import { useEffect, useState, useCallback } from "react";
import { ApplicationDTO } from "@/types";
import StatusGrid from "@/components/dashboard/StatusGrid";
import ApplicationForm from "@/components/applications/ApplicationForm";

export default function DashboardPage() {
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadApplications = useCallback(async () => {
    const res = await fetch("/api/applications");
    if (res.ok) {
      const data = await res.json();
      setApplications(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApplications();
    // Poll for updated status every 30s so cards reflect the latest
    // health check without a manual refresh.
    const interval = setInterval(loadApplications, 30000);
    return () => clearInterval(interval);
  }, [loadApplications]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    setApplications((apps) => apps.filter((a) => a.id !== id));
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setApplications((apps) =>
      apps.map((a) => (a.id === id ? { ...a, isActive } : a))
    );
  }

  const counts = applications.reduce(
    (acc, app) => {
      const status = app.latestStatus ?? "unknown";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {counts.online ?? 0} online · {counts.slow ?? 0} slow · {counts.offline ?? 0} offline
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          {showForm ? "Close" : "Add application"}
        </button>
      </div>

      {showForm && (
        <ApplicationForm
          onCreated={() => {
            setShowForm(false);
            loadApplications();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <StatusGrid
          applications={applications}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
