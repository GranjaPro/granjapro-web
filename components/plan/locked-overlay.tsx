"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradePopup } from "./upgrade-popup";
import type { PlanType } from "./plan-provider";

interface LockedOverlayProps {
  message: string;
  targetPlan: Exclude<PlanType, "essencial">;
  children: React.ReactNode;
  className?: string;
}

export function LockedOverlay({ message, targetPlan, children, className }: LockedOverlayProps) {
  const [hovered, setHovered] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <div
        className={cn("relative cursor-pointer", className)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setShowUpgrade(true)}
      >
        <div className="blur-[6px] pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-950/65 rounded-xl transition-all duration-300">
          <div className={cn(
            "w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-900 flex items-center justify-center mb-2 transition-all duration-300",
            hovered && "bg-amber-100 dark:bg-slate-900 scale-110"
          )}>
            {hovered ? (
              <LockOpen className="w-5 h-5 text-amber-600 transition-all duration-300" />
            ) : (
              <Lock className="w-5 h-5 text-gray-400 dark:text-slate-400 transition-all duration-300" />
            )}
          </div>
          <p className={cn(
            "text-xs font-semibold text-center px-4 transition-all duration-300 max-w-[200px]",
            hovered ? "text-amber-700 dark:text-amber-200 opacity-100 translate-y-0" : "text-transparent opacity-0 -translate-y-1"
          )}>
            {message}
          </p>
        </div>
      </div>
      <UpgradePopup open={showUpgrade} onClose={() => setShowUpgrade(false)} targetPlan={targetPlan} />
    </>
  );
}
