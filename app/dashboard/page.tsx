import {
  Egg,
  Bird,
  Activity,
  AlertTriangle,
  Wheat,
  Bell,
  ChevronRight,
  Leaf,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TasksChecklist } from "@/components/dashboard/tasks-checklist";
import { FinancialSummary } from "@/components/dashboard/financial-summary";
import { ProductionTrend } from "@/components/dashboard/production-trend";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { BarnsOverview } from "@/components/dashboard/barns-overview";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  mockFarm,
  mockTodayProduction,
  mockTodayMortality,
  mockTodayFeed,
  mockAlerts,
} from "@/lib/mock-data";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight text-gray-900">
                  {mockFarm.name}
                </h1>
                <p className="text-[11px] capitalize text-gray-500">{today}</p>
              </div>
            </div>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              {mockAlerts.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable Content ── */}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4 space-y-5">

        {/* Alerts */}
        {mockAlerts.length > 0 && <AlertsPanel />}

        {/* KPI Grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Hoje</p>
            <button className="flex items-center gap-1 text-xs text-brand-600 font-medium">
              Ver detalhes <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              title="Ovos produzidos"
              value={formatNumber(mockTodayProduction.eggsProduced)}
              subtitle={`${formatNumber(mockTodayProduction.eggsSold)} vendidos`}
              icon={Egg}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
              trend={{ direction: "up", label: "+1.1% vs ontem" }}
              highlight
            />
            <KpiCard
              title="Taxa de postura"
              value={formatPercent(mockTodayProduction.layingRate)}
              subtitle="Meta: 89%"
              icon={Activity}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              trend={{ direction: "neutral", label: "Estável" }}
            />
            <KpiCard
              title="Aves ativas"
              value={formatNumber(mockFarm.activeBirds)}
              subtitle={`de ${formatNumber(mockFarm.totalBirds)} totais`}
              icon={Bird}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
            <KpiCard
              title="Mortalidade hoje"
              value={String(mockTodayMortality.dead)}
              subtitle={`${mockTodayMortality.rate}% da lote`}
              icon={AlertTriangle}
              iconColor="text-red-500"
              iconBg="bg-red-50"
              trend={{ direction: "down", label: "Abaixo da média" }}
            />
          </div>
        </section>

        {/* Feed cost strip */}
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <Wheat className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800">Ração hoje</p>
              <p className="text-[11px] text-amber-600">
                {mockTodayFeed.quantity.toLocaleString("pt-BR")} kg – {mockTodayFeed.type}
              </p>
            </div>
            <p className="text-sm font-bold text-amber-800">
              {formatCurrency(mockTodayFeed.cost)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Production Trend */}
        <ProductionTrend />

        {/* Tasks + Financial (stack on mobile, side by side on larger screens) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TasksChecklist />
          <FinancialSummary />
        </div>

        {/* Barns Overview */}
        <BarnsOverview />
      </main>

      {/* ── Bottom Navigation ── */}
      <MobileNav />
    </div>
  );
}
