import { Building2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { mockBarns } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function BarnsOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-800">Galpões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {mockBarns.map((barn) => {
          const isWarning = barn.status === "warning";
          return (
            <div
              key={barn.id}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3",
                isWarning ? "bg-amber-50" : "bg-gray-50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                  isWarning ? "bg-amber-100" : "bg-brand-100"
                )}
              >
                <Building2
                  className={cn("h-4 w-4", isWarning ? "text-amber-600" : "text-brand-600")}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800">{barn.name}</span>
                  {isWarning ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {barn.birds.toLocaleString("pt-BR")} aves
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isWarning ? "text-amber-600" : "text-brand-600"
                    )}
                  >
                    {barn.layingRate}%
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full rounded-full bg-gray-200">
                  <div
                    className={cn(
                      "h-1 rounded-full transition-all",
                      isWarning ? "bg-amber-400" : "bg-brand-500"
                    )}
                    style={{ width: `${barn.layingRate}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
