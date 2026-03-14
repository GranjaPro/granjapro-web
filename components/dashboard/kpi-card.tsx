import * as React from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "neutral";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    direction: TrendDirection;
    label: string;
  };
  highlight?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-600",
  iconBg = "bg-brand-50",
  trend,
  highlight,
}: KpiCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trend?.direction === "up"
      ? "text-green-600"
      : trend?.direction === "down"
        ? "text-red-500"
        : "text-gray-400";

  return (
    <Card className={cn(highlight && "border-brand-200 bg-brand-50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={cn("mt-1 text-2xl font-bold leading-tight", highlight && "text-brand-700")}>
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 truncate">{subtitle}</p>
            )}
            {trend && (
              <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn("flex-shrink-0 rounded-xl p-2.5", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
