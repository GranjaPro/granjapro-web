import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { mockMonthFinancial } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export function FinancialSummary() {
  const { revenue, expenses, profit, revenueGoal } = mockMonthFinancial;
  const revenueProgress = Math.min((revenue / revenueGoal) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-800">
          Financeiro – Março
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
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
