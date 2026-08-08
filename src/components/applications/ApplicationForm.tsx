"use client";

import { useState } from "react";

export default function ApplicationForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    healthEndpoint: "",
    expectedStatusCode: 200,
    monitoringIntervalSeconds: 60,
    environment: "production",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: [] }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create application");
      return;
    }

    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3 mb-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1 text-gray-400">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
            placeholder="Nutrition App"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-400">Environment</label>
          <select
            value={form.environment}
            onChange={(e) => update("environment", e.target.value)}
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-400">URL</label>
          <input
            required
            type="url"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-400">Health endpoint</label>
          <input
            required
            type="url"
            value={form.healthEndpoint}
            onChange={(e) => update("healthEndpoint", e.target.value)}
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
            placeholder="https://example.com/api/health"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-400">Expected status code</label>
          <input
            type="number"
            value={form.expectedStatusCode}
            onChange={(e) => update("expectedStatusCode", Number(e.target.value))}
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-400">Interval (seconds)</label>
          <input
            type="number"
            min={30}
            value={form.monitoringIntervalSeconds}
            onChange={(e) => update("monitoringIntervalSeconds", Number(e.target.value))}
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add application"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-800 px-4 py-2 text-sm text-gray-400 hover:text-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
