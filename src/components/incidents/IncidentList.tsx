"use client";

import { useState } from "react";

interface Diagnosis {
  rootCause: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  recommendedFix: string;
  repairSteps: string[];
  preventionTips: string[];
}

interface Incident {
  id: string;
  applicationName: string;
  startedAt: string;
  resolvedAt: string | null;
  status: "open" | "resolved";
  reason: string;
  diagnosis: Diagnosis | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "text-yellow-500 border-yellow-900",
  medium: "text-orange-500 border-orange-900",
  high: "text-red-500 border-red-900",
  critical: "text-red-400 border-red-800",
};

export default function IncidentList({ incidents }: { incidents: Incident[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (incidents.length === 0) {
    return <p className="text-sm text-gray-500">No incidents recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => {
        const isOpen = expandedId === incident.id;
        const severityClass = incident.diagnosis
          ? SEVERITY_COLOR[incident.diagnosis.severity]
          : "text-gray-400 border-gray-800";

        return (
          <div
            key={incident.id}
            className={`rounded-lg border bg-gray-900 p-4 ${severityClass.split(" ")[1]}`}
          >
            <button
              onClick={() => setExpandedId(isOpen ? null : incident.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{incident.applicationName}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      incident.status === "open"
                        ? "bg-red-950 text-red-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {incident.status}
                  </span>
                  {incident.diagnosis && (
                    <span className={`text-xs ${severityClass.split(" ")[0]}`}>
                      {incident.diagnosis.severity.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(incident.startedAt).toLocaleString()} · {incident.reason}
                </p>
              </div>
              <span className="text-xs text-gray-500">{isOpen ? "Hide" : "Details"}</span>
            </button>

            {isOpen && (
              <div className="mt-3 pt-3 border-t border-gray-800 text-sm space-y-3">
                {incident.diagnosis ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Root cause · {incident.diagnosis.confidence}% confidence
                      </p>
                      <p>{incident.diagnosis.rootCause}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Recommended fix</p>
                      <p>{incident.diagnosis.recommendedFix}</p>
                    </div>
                    {incident.diagnosis.repairSteps.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Repair steps</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-300">
                          {incident.diagnosis.repairSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {incident.diagnosis.preventionTips.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Prevention</p>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-300">
                          {incident.diagnosis.preventionTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    AI diagnosis not available for this incident.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
