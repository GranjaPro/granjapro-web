import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { mockProductionTrend } from "@/lib/mock-data";

export function ProductionTrend() {
  const max = Math.max(...mockProductionTrend.map((d) => d.eggs));
  const min = Math.min(...mockProductionTrend.map((d) => d.eggs));
  const range = max - min || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-800">
          Produção – Últimos 7 dias
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-1.5 h-20">
          {mockProductionTrend.map((day, i) => {
            const height = ((day.eggs - min) / range) * 60 + 20;
            const isToday = i === mockProductionTrend.length - 1;
            return (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: 72 }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${isToday ? "bg-brand-600" : "bg-brand-200"}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${isToday ? "text-brand-700 font-bold" : "text-gray-400"}`}
                >
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Taxa média: 88.2%</span>
          <span className="font-semibold text-brand-600">Hoje: 13.200 ovos</span>
        </div>
      </CardContent>
    </Card>
  );
}
