"use client";

import { useEffect, useState } from "react";
import IncidentList from "@/components/incidents/IncidentList";
import { IncidentDTO } from "@/types";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/incidents")
      .then((res) => res.json())
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Incidents</h1>
        <p className="text-sm text-gray-500">History across all your applications</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <IncidentList incidents={incidents} />
      )}
    </div>
  );
}
