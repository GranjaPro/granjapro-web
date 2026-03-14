import { AlertTriangle, Info, X } from "lucide-react";
import { mockAlerts } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function AlertsPanel() {
  if (mockAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {mockAlerts.map((alert) => {
        const isWarning = alert.type === "warning";
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-xl p-3",
              isWarning ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"
            )}
          >
            {isWarning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium leading-snug", isWarning ? "text-amber-800" : "text-blue-800")}>
                {alert.message}
              </p>
              <p className={cn("mt-0.5 text-[10px]", isWarning ? "text-amber-500" : "text-blue-400")}>
                {alert.time}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
