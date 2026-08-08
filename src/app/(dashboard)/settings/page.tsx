import NotificationSettingsForm from "@/components/settings/NotificationSettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">Configure how you're notified about incidents</p>
      </div>
      <NotificationSettingsForm />
    </div>
  );
}
