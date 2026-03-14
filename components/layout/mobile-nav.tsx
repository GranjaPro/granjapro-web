"use client";

import { useState } from "react";
import { LayoutDashboard, Egg, Wheat, BarChart2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", icon: LayoutDashboard, active: true },
  { label: "Produção", icon: Egg, active: false },
  { label: "Ração", icon: Wheat, active: false },
  { label: "Relatórios", icon: BarChart2, active: false },
  { label: "Menu", icon: Menu, active: false },
];

export function MobileNav() {
  const [active, setActive] = useState(0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 backdrop-blur-sm safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item, i) => (
          <button
            key={item.label}
            onClick={() => setActive(i)}
            className="flex flex-1 flex-col items-center gap-1 py-2 transition-colors"
          >
            <item.icon
              className={cn(
                "h-5 w-5 transition-colors",
                active === i ? "text-brand-600" : "text-gray-400"
              )}
              strokeWidth={active === i ? 2.5 : 1.75}
            />
            <span
              className={cn(
                "text-[10px] font-medium leading-none",
                active === i ? "text-brand-600" : "text-gray-400"
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
