"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
} from "lucide-react";

const sidebarNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "divider" as const },
  { label: "Galpões", href: "/dashboard/galpoes", icon: Building2 },
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
  { label: "Funcionários", href: "/dashboard/workers", icon: Users },
  { label: "Assistente IA", href: "/dashboard/ai", icon: Bot },
  { label: "Relatórios", href: "/dashboard/reports", icon: FileText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8faf9]">
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
            const navItem = item as { label: string; href: string; icon: any };
            const isActive = pathname === navItem.href;
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-brand-500/90 text-white shadow-lg shadow-brand-500/20"
                    : "text-brand-300/80 hover:bg-white/[0.07] hover:text-white"
                )}
              >
                <navItem.icon
                  className={cn(
                    "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                    isActive ? "text-white" : "text-brand-400/70 group-hover:text-brand-300"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {!collapsed && <span className="truncate">{navItem.label}</span>}
              </Link>
            );
          })}
        </nav>


      </aside>

      {/* Main content area */}
      <div className={cn(
        "min-h-screen transition-all duration-300 ease-in-out",
        collapsed ? "lg:pl-[68px]" : "lg:pl-[244px]"
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200/60">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 bg-gray-100/80 rounded-xl px-3.5 py-2 w-72 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100/80 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 ring-[1.5px] ring-white" />
              </button>
              <div className="hidden sm:block w-px h-7 bg-gray-200/80 mx-1" />
              <button className="hidden sm:flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-100/80 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
                  <span className="text-[11px] font-bold text-white">JS</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">João Silva</p>
                  <p className="text-[11px] text-gray-400 leading-tight">Administrador</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
