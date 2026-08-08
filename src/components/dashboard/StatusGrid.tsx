import { ApplicationDTO } from "@/types";
import StatusCard from "./StatusCard";

export default function StatusGrid({
  applications,
  onDelete,
  onToggle,
}: {
  applications: ApplicationDTO[];
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  if (applications.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No applications yet. Add one to start monitoring.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {applications.map((app) => (
        <StatusCard key={app.id} app={app} onDelete={onDelete} onToggle={onToggle} />
      ))}
    </div>
  );
}
