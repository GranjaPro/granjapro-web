import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useDateFilter } from "@/components/date-filter";
import { useAuth } from "@/components/auth/auth-provider";
import { getFinancialSummaryInRange, type FinancialSummaryData } from "@/lib/services/finances";

export function FinancialSummary() {
  const { farm } = useAuth();
  const { dateRange, filterMode } = useDateFilter();
  const [data, setData] = useState<FinancialSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farm?.id) return;

    async function fetchData() {
      setLoading(true);
      try {
        const summary = await getFinancialSummaryInRange(farm!.id, dateRange.startDate, endDate);
        setData(summary);
      } catch (err) {
        console.error("Error fetching financial summary:", err);
      } finally {
        setLoading(false);
      }
    }

    const { startDate, endDate } = dateRange;
    fetchData();
  }, [farm?.id, dateRange]);

  const revenue = data?.revenue ?? 0;
  const expenses = data?.expenses ?? 0;
  const profit = data?.profit ?? 0;
  const revenueGoal = data?.revenueGoal ?? 20000;
  const revenueProgress = Math.min((revenue / revenueGoal) * 100, 100);

  const monthLabel = filterMode === "mes" ? "Este Mês" : filterMode === "dia" ? "Hoje" : "Esta Semana";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-800">
          Financeiro – {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 relative min-h-[160px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Receita</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(revenue)}</span>
        </div>

        <div className="ml-9 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Meta: {formatCurrency(revenueGoal)}</span>
            <span>{revenueProgress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all"
              style={{ width: `${revenueProgress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            </div>
            <span className="text-xs text-gray-500">Despesas</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(expenses)}</span>
        </div>

        <div className="rounded-xl bg-brand-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-700">Lucro estimado</span>
            </div>
            <span className="text-base font-bold text-brand-700">{formatCurrency(profit)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
