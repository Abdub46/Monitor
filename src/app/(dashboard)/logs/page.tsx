import LogTable from "@/components/logs/LogTable";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Logs</h1>
        <p className="text-sm text-gray-500">Search, filter, and export health check history</p>
      </div>
      <LogTable />
    </div>
  );
}
