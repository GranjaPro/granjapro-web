import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, Lightbulb, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantInsight, AssistantInsightLevel } from "@/lib/domain/assistant-insight";

interface AssistantInsightListProps {
  insights: AssistantInsight[];
  emptyMessage?: string;
  className?: string;
}

const LEVEL_STYLES: Record<AssistantInsightLevel, { card: string; iconWrap: string; text: string }> = {
  critical: { card: "bg-red-50/50 border-l-red-500", iconWrap: "bg-red-100", text: "text-red-600" },
  warning: { card: "bg-amber-50/50 border-l-amber-500", iconWrap: "bg-amber-100", text: "text-amber-600" },
  success: { card: "bg-emerald-50/50 border-l-emerald-500", iconWrap: "bg-emerald-100", text: "text-emerald-600" },
  info: { card: "bg-blue-50/50 border-l-blue-500", iconWrap: "bg-blue-100", text: "text-blue-600" },
};

function InsightIcon({ level }: { level: AssistantInsightLevel }) {
  if (level === "success") return <TrendingUp className="w-2.5 h-2.5" />;
  if (level === "info") return <Info className="w-2.5 h-2.5" />;
  return <AlertTriangle className="w-2.5 h-2.5" />;
}

export function AssistantInsightList({
  insights,
  emptyMessage = "Sem insights disponíveis para o período.",
  className,
}: AssistantInsightListProps) {
  if (insights.length === 0) {
    return (
      <div className="py-8 text-center">
        <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 overflow-y-auto pr-1", className)} style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
      {insights.map((insight) => {
        const style = LEVEL_STYLES[insight.level];
        return (
          <div key={insight.id} className={cn("p-3.5 rounded-xl border-l-[3px]", style.card)}>
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", style.iconWrap, style.text)}>
                <InsightIcon level={insight.level} />
              </div>
              <span className="text-sm font-semibold text-gray-800">{insight.title}</span>
              {insight.metric && (
                <span className="ml-auto text-[10px] font-semibold text-gray-500">
                  {insight.metric.label}: {insight.metric.value}
                </span>
              )}
            </div>
            <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <p className={cn("text-xs font-medium", style.text)}>→ {insight.action}</p>
              <Link href={insight.href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                {insight.hrefLabel}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
