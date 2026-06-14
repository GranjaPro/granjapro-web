"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getPlanOrNull,
  hasMinimumPlan,
  isTrialActive,
  isTrialExpired,
  requiresPlanSelection,
  type PlanType,
} from "@/lib/plans";
import { useAuth } from "@/components/auth/auth-provider";
import ProfileSettings from "@/components/dashboard/profile-settings";
import { DateFilterProvider } from "@/components/date-filter";
import { PlanProvider, usePlan } from "@/components/plan/plan-provider";
import { ActivePlanBadge, RequiredPlanBadge } from "@/components/plan/plan-badge";
import { UpgradePopup } from "@/components/plan/upgrade-popup";
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  Building2,
  Bird,
  Egg,
  Wheat,
  HeartPulse,
  Skull,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Wrench,
  Bot,
  FileText,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  LogOut,
  Loader2,
  CreditCard,
  CalendarClock,
  Eye,
  EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const OnboardingPage = dynamic(() => import("./onboarding/page"), { ssr: false });
const DASHBOARD_THEME_KEY = "granjapro-dashboard-theme";
type DashboardTheme = "light" | "dark";
type SidebarNavItem =
  | { type: "divider" }
  | { label: string; href: string; icon: LucideIcon; minimumPlan?: PlanType };
type SidebarNavLink = Extract<SidebarNavItem, { href: string }>;

const ROUTE_PLAN_REQUIREMENTS: Record<string, PlanType> = {
  "/dashboard/workers": "pro",
  "/dashboard/reports": "pro",
};

const sidebarNav: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "divider" as const },
  { label: "Galpões", href: "/dashboard/barns", icon: Building2 },
  { label: "Lotes", href: "/dashboard/flocks", icon: Layers },
  { label: "Produção", href: "/dashboard/production", icon: Egg },
  { label: "Ração", href: "/dashboard/racao", icon: Wheat },
  { label: "Saúde", href: "/dashboard/health", icon: HeartPulse },
  { label: "Mortalidade", href: "/dashboard/mortality", icon: Skull },
  { label: "Finanças", href: "/dashboard/finances", icon: DollarSign },
  { label: "Clientes", href: "/dashboard/customers", icon: Users },
  { label: "Vendas", href: "/dashboard/sales", icon: ShoppingCart },
  { label: "Estoque", href: "/dashboard/inventory", icon: Package },
  { label: "Equipamentos", href: "/dashboard/equipment", icon: Wrench },
  { type: "divider" as const },
  { label: "Assistente IA", href: "/dashboard/ai", icon: Bot },
  { label: "Funcionários", href: "/dashboard/workers", icon: Users, minimumPlan: "pro" },
  { label: "Relatórios", href: "/dashboard/reports", icon: FileText, minimumPlan: "pro" },
];

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const pathname = usePathname();
  const { plan, hideAdvancedFeatures, setHideAdvancedFeatures } = usePlan();
  const { user, profile, farm, loading, signOut, refreshProfile } = useAuth();
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(DASHBOARD_THEME_KEY) === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(DASHBOARD_THEME_KEY);
    const nextTheme: DashboardTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("dashboard-dark", theme === "dark");
    root.style.colorScheme = theme;

    return () => {
      root.classList.remove("dark", "dashboard-dark");
      root.style.colorScheme = "";
    };
  }, [theme]);

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const customEvent = event as CustomEvent<DashboardTheme>;
      setTheme(customEvent.detail === "dark" ? "dark" : "light");
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === DASHBOARD_THEME_KEY) {
        setTheme(event.newValue === "dark" ? "dark" : "light");
      }
    }

    window.addEventListener("dashboard-theme-change", handleThemeChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("dashboard-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleName = profile?.role === "owner" ? "Proprietário" : profile?.role === "manager" ? "Gerente" : "Funcionário";

  const isOnboardingRoute = pathname === "/dashboard/onboarding";
  const isPlanSelectionRoute = pathname === "/dashboard/select-plan";
  const isAiRoute = pathname === "/dashboard/ai";
  const persistedPlan = getPlanOrNull(profile?.plan);
  const requiredPlanForRoute = ROUTE_PLAN_REQUIREMENTS[pathname];
  const needsPlanSelection = !loading && Boolean(user) && !isPlanSelectionRoute && requiresPlanSelection(profile);
  const routePlanBlocked =
    !loading &&
    Boolean(user) &&
    !isPlanSelectionRoute &&
    Boolean(requiredPlanForRoute) &&
    (!persistedPlan || !hasMinimumPlan(persistedPlan, requiredPlanForRoute));
  const needsOnboarding =
    !loading && user && !isPlanSelectionRoute && !requiresPlanSelection(profile) && (!farm || isOnboardingRoute);
  const trialActive = !loading && Boolean(user) && isTrialActive(profile);
  const trialDaysRemaining =
    trialActive && profile?.trial_ends_at
      ? Math.min(7, Math.max(1, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))))
      : 0;
  const hideShellForPlanSelection = isPlanSelectionRoute && (!profile || profile.plan === null);
  const canToggleAdvancedFeatures = Boolean(persistedPlan && persistedPlan !== "premium");

  useEffect(() => {
    if (needsPlanSelection) {
      window.location.replace("/dashboard/select-plan");
    }
  }, [needsPlanSelection]);

  useEffect(() => {
    if (routePlanBlocked) {
      window.location.replace("/dashboard/select-plan");
    }
  }, [routePlanBlocked]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400" />
      </div>
    );
  }

  if (needsPlanSelection || routePlanBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400" />
      </div>
    );
  }

  return (
    <DateFilterProvider>
    {hideShellForPlanSelection ? (
      <div className="min-h-screen bg-[#f8faf9] text-gray-900 dark:bg-slate-950 dark:text-slate-100">
        <main className="min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    ) : (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => { if (collapsed) setSidebarHovered(true); }}
        onMouseLeave={() => setSidebarHovered(false)}
        className={cn(
          "fixed top-0 left-0 z-40 h-full bg-brand-900 flex flex-col transition-all duration-300 ease-in-out",
          collapsed ? "lg:w-[68px]" : "lg:w-[244px]",
          sidebarOpen ? "w-[244px] translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className={cn(
          "flex items-center h-16 border-b border-white/[0.08] flex-shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-5"
        )}>
          {collapsed ? (
            /* Collapsed: show logo by default, on sidebar hover swap to expand button */
            <div className="flex items-center justify-center w-8 h-8">
              {sidebarHovered ? (
                <button
                  onClick={() => { setCollapsed(false); setSidebarHovered(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-400/60 hover:bg-white/[0.08] hover:text-brand-300 transition-all cursor-pointer"
                >
                  <PanelLeftOpen className="w-[18px] h-[18px]" />
                </button>
              ) : (
                <Link href="/dashboard" className="flex items-center justify-center cursor-pointer">
                  <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bird className="w-[18px] h-[18px] text-white" />
                  </div>
                </Link>
              )}
            </div>
          ) : (
            /* Expanded: show logo + text + collapse button */
            <>
              <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden cursor-pointer">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bird className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[13px] text-white block leading-tight tracking-tight">Granja Pro</span>
                  <span className="text-[10px] text-brand-400 block leading-tight">Gestão Avícola</span>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-brand-400/60 hover:bg-white/[0.08] hover:text-brand-300 transition-all cursor-pointer flex-shrink-0"
              >
                <PanelLeftClose className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin">
          {sidebarNav.map((item, i) => {
            if ("type" in item && item.type === "divider") {
              return <div key={`div-${i}`} className="my-2.5 mx-2 border-t border-white/[0.06]" />;
            }
            const navItem = item as SidebarNavLink;
            if (hideAdvancedFeatures && navItem.minimumPlan && !hasMinimumPlan(plan, navItem.minimumPlan)) {
              return null;
            }
            const isActive = pathname === navItem.href;
            const isLocked = navItem.minimumPlan ? !hasMinimumPlan(plan, navItem.minimumPlan) : false;
            const Icon = navItem.icon;
            const itemClass = cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer w-full text-left",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-brand-500/90 text-white shadow-lg shadow-brand-500/20"
                : "text-brand-300/80 hover:bg-white/[0.07] hover:text-white"
            );
            const itemContent = (
              <>
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                    isActive ? "text-white" : "text-brand-400/70 group-hover:text-brand-300"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {!collapsed && (
                  <span className="truncate flex-1">{navItem.label}</span>
                )}
                {!collapsed && navItem.minimumPlan && (
                  <RequiredPlanBadge requiredPlan={navItem.minimumPlan} className="flex-shrink-0" />
                )}
              </>
            );
            if (isLocked) {
              return (
                <button
                  key={navItem.href}
                  onClick={() => { setSidebarOpen(false); setUpgradeOpen(true); }}
                  className={itemClass}
                >
                  {itemContent}
                </button>
              );
            }
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                onClick={() => setSidebarOpen(false)}
                className={itemClass}
              >
                {itemContent}
              </Link>
            );
          })}
        </nav>

        {/* Sign out button */}
        <div className={cn(
          "border-t border-white/[0.08] p-3 flex-shrink-0",
          collapsed && "px-2"
        )}>
          <Link
            href="/dashboard/select-plan"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "group mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-brand-300/80 hover:bg-white/[0.07] hover:text-white transition-all duration-200 w-full cursor-pointer",
              collapsed && "justify-center px-0"
            )}
          >
            <CreditCard className="w-[18px] h-[18px] text-brand-400/70 group-hover:text-brand-300 flex-shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="truncate">Meu plano</span>}
          </Link>
          <button
            onClick={signOut}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-brand-300/80 hover:bg-white/[0.07] hover:text-white transition-all duration-200 w-full cursor-pointer",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-[18px] h-[18px] text-brand-400/70 group-hover:text-brand-300 flex-shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="truncate">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className={cn(
        "h-screen flex flex-col transition-all duration-300 ease-in-out relative",
        collapsed ? "lg:pl-[68px]" : "lg:pl-[244px]"
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/70 dark:bg-slate-950/82 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              {persistedPlan && (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/dashboard/select-plan"
                    className="inline-flex transition-colors hover:opacity-80"
                  >
                    <ActivePlanBadge
                      plan={persistedPlan}
                      trialDaysRemaining={trialActive ? trialDaysRemaining : undefined}
                    />
                  </Link>
                  {canToggleAdvancedFeatures && (
                    <button
                      type="button"
                      aria-pressed={hideAdvancedFeatures}
                      onClick={() => setHideAdvancedFeatures(!hideAdvancedFeatures)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer",
                        hideAdvancedFeatures
                          ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          : "border-gray-200 bg-white text-gray-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      )}
                    >
                      {hideAdvancedFeatures ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {hideAdvancedFeatures ? "Mostrar funcionalidades avançadas" : "Ocultar funcionalidades avançadas"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100/80 text-gray-500 hover:bg-gray-100 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/12 transition-colors cursor-pointer">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 ring-[1.5px] ring-white dark:ring-slate-950" />
              </button>
              <div className="hidden sm:block w-px h-7 bg-gray-200/80 dark:bg-white/10 mx-1" />
              <button
                onClick={() => setProfileOpen(true)}
                className="hidden sm:flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
                    <span className="text-[11px] font-bold text-white">{initials}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 leading-tight">{displayName}</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 leading-tight">{roleName}</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={cn("flex-1 p-4 sm:p-6 lg:p-8 dashboard-scroll", isAiRoute ? "overflow-hidden" : "overflow-y-auto")}>
          {trialActive && !needsOnboarding && !needsPlanSelection && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-300" />
                <div>
                  <p className="text-sm font-bold">Teste Premium ativo</p>
                  <p className="text-xs text-amber-800 dark:text-amber-200/80">
                    Restam {trialDaysRemaining} dia{trialDaysRemaining === 1 ? "" : "s"}. Ao terminar, seu plano sera removido e voce devera escolher um plano.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/select-plan"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-600 px-3 text-xs font-bold text-white transition hover:bg-amber-500"
              >
                Alterar plano
              </Link>
            </div>
          )}
          {!isOnboardingRoute && !needsOnboarding && !needsPlanSelection && children}
        </main>
      </div>

      {/* Onboarding: blur entire shell + overlay */}
      {needsOnboarding && (
        <>
          {/* Blur layer over sidebar + header + content */}
          <div className="fixed inset-0 z-40 backdrop-blur-[3px] bg-white/30 dark:bg-slate-950/55 pointer-events-none" />
          {/* Onboarding on top */}
          <div className="fixed inset-0 z-50 overflow-hidden">
            <OnboardingPage />
          </div>
        </>
      )}

      {/* Profile Settings Modal */}
      <ProfileSettings open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Upgrade Popup */}
      <UpgradePopup open={upgradeOpen} onClose={() => setUpgradeOpen(false)} targetPlan="pro" />
    </div>
    )}
    </DateFilterProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </PlanProvider>
  );
}
