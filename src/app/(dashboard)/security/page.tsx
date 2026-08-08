"use client";

import { useEffect, useState } from "react";
import SecurityEventList from "@/components/security/SecurityEventList";

interface SecurityEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  ipAddress: string;
  details: string;
  createdAt: string;
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/security-events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="text-sm text-gray-500">
          Login activity on your account — failed attempts, lockouts, and suspicious IPs
        </p>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading...</p> : <SecurityEventList events={events} />}
    </div>
  );
}
