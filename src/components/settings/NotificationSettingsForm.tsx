"use client";

import { useEffect, useState } from "react";
import { requestPushToken, isFirebaseConfigured } from "@/lib/firebaseClient";

interface Settings {
  notificationPreferences: {
    emailEnabled: boolean;
    telegramEnabled: boolean;
    pushEnabled: boolean;
  };
  telegramChatId: string;
  pushTokenCount: number;
}

export default function NotificationSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((res) => res.json())
      .then(setSettings);
  }, []);

  async function saveSettings(patch: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      setSettings((s) => (s ? { ...s, ...data } : s));
      setMessage("Saved");
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage("Failed to save");
    }
  }

  async function handleEnablePush() {
    setPushBusy(true);
    const token = await requestPushToken();
    setPushBusy(false);

    if (!token) {
      setMessage(
        "Couldn't enable push. Check that Firebase is configured and notification permission was granted."
      );
      return;
    }

    await fetch("/api/notifications/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    await saveSettings({ pushEnabled: true });
    setSettings((s) => (s ? { ...s, pushTokenCount: s.pushTokenCount + 1 } : s));
  }

  if (!settings) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Email</h3>
            <p className="text-xs text-gray-500">Sent to your account email</p>
          </div>
          <input
            type="checkbox"
            checked={settings.notificationPreferences.emailEnabled}
            onChange={(e) => saveSettings({ emailEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Telegram</h3>
            <p className="text-xs text-gray-500">Requires your chat ID below</p>
          </div>
          <input
            type="checkbox"
            checked={settings.notificationPreferences.telegramEnabled}
            onChange={(e) => saveSettings({ telegramEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-400">
            Chat ID (message @userinfobot on Telegram to get yours)
          </label>
          <input
            defaultValue={settings.telegramChatId}
            onBlur={(e) => saveSettings({ telegramChatId: e.target.value })}
            placeholder="123456789"
            className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Push notifications</h3>
            <p className="text-xs text-gray-500">
              {settings.pushTokenCount > 0
                ? `${settings.pushTokenCount} device(s) registered`
                : "No devices registered yet"}
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.notificationPreferences.pushEnabled}
            onChange={(e) => saveSettings({ pushEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </div>
        {isFirebaseConfigured() ? (
          <button
            onClick={handleEnablePush}
            disabled={pushBusy}
            className="text-xs rounded-md border border-gray-700 px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50"
          >
            {pushBusy ? "Requesting permission..." : "Register this device"}
          </button>
        ) : (
          <p className="text-xs text-gray-500">
            Push isn't configured yet — add Firebase env vars to enable it.
          </p>
        )}
      </div>

      {message && <p className="text-xs text-gray-400">{message}</p>}
      {saving && <p className="text-xs text-gray-500">Saving...</p>}
    </div>
  );
}
