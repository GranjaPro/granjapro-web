import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Lightbulb, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type FarmHealthInsightLevel = "critical" | "warning" | "success" | "info";

export interface FarmHealthInsight {
  level: FarmHealthInsightLevel;
  title: string;
  action: string;
  metric?: string;
  href: string;
  hrefLabel: string;
}

interface FarmHealthBannerProps {
  score: number;
  summary: string;
  insights: FarmHealthInsight[];
  title?: string;
  emptyMessage?: string;
}

const RING_CIRCUMFERENCE = 175.9;

function getHealthScoreStyle(score: number) {
  if (score >= 80) {
    return {
      gradient: "from-emerald-50 border-emerald-200",
      ring: "text-emerald-500",
      text: "text-emerald-700",
      label: "Excelente",
    };
  }

  if (score >= 60) {
    return {
      gradient: "from-amber-50 border-amber-200",
      ring: "text-amber-500",
      text: "text-amber-700",
      label: "Atenção",
    };
  }

  return {
    gradient: "from-red-50 border-red-200",
    ring: "text-red-500",
    text: "text-red-700",
    label: "Crítico",
  };
}

function getInsightStyle(level: FarmHealthInsightLevel) {
  if (level === "success") {
    return {
      bg: "bg-emerald-100",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    };
  }

  if (level === "info") {
    return {
      bg: "bg-blue-100",
      icon: <Info className="w-3.5 h-3.5 text-blue-600" />,
    };
  }

  return {
    bg: level === "warning" ? "bg-amber-100" : "bg-red-100",
    icon: (
      <AlertTriangle
        className={cn("w-3.5 h-3.5", level === "warning" ? "text-amber-600" : "text-red-600")}
      />
    ),
  };
}

export function FarmHealthBanner({
  score,
  summary,
  insights,
  title = "Saúde da Granja",
  emptyMessage = "Nenhuma informação disponível para hoje.",
}: FarmHealthBannerProps) {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const scoreStyle = getHealthScoreStyle(boundedScore);
  const visibleInsights = insights.slice(0, 3);

  return (
    <div
      className={cn(
        "bg-gradient-to-r to-white rounded-2xl border p-5 transition-all duration-300",
        scoreStyle.gradient,
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 lg:min-w-[280px]">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                className={scoreStyle.ring}
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(boundedScore / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-base font-bold", scoreStyle.text)}>{boundedScore}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-gray-900">{title}</span>
            </div>
            <p className={cn("text-xl font-bold mt-0.5", scoreStyle.text)}>{scoreStyle.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary}</p>
          </div>
        </div>

        <div className="hidden lg:block w-px h-14 bg-gray-200" />

        <div className="flex-1 space-y-2">
          {visibleInsights.map((insight) => {
            const insightStyle = getInsightStyle(insight.level);

            return (
              <div key={`${insight.title}-${insight.href}`} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    insightStyle.bg,
                  )}
                >
                  {insightStyle.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {insight.title}
                    {insight.metric ? ` (${insight.metric})` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      {insight.action}
                    </p>
                    <Link
                      href={insight.href}
                      className="inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {insight.hrefLabel}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {visibleInsights.length === 0 && (
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
