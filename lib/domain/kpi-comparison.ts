const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type KpiVariationDirection = "up" | "down" | "neutral";
export type ComparisonPeriodMode = "dia" | "intervalo" | "mes";

export interface KpiVariation {
  label: string;
  direction: KpiVariationDirection;
}

interface ComparisonPeriodInput {
  mode: ComparisonPeriodMode;
  startDate: string;
  endDate: string;
  todayDate: string;
}

export interface ComparisonPeriod {
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MILLISECONDS);
}

function getPreviousMonthPeriod(currentStart: Date, currentEnd: Date, isOngoingMonth: boolean): ComparisonPeriod {
  const year = currentStart.getUTCFullYear();
  const month = currentStart.getUTCMonth();
  const previousStart = new Date(Date.UTC(year, month - 1, 1));
  const previousMonthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const previousEndDay = isOngoingMonth
    ? Math.min(currentEnd.getUTCDate(), previousMonthLastDay)
    : previousMonthLastDay;
  const previousEnd = new Date(Date.UTC(year, month - 1, previousEndDay));

  return {
    currentEndDate: formatDate(currentEnd),
    previousStartDate: formatDate(previousStart),
    previousEndDate: formatDate(previousEnd),
  };
}

export function getComparisonPeriod({
  mode,
  startDate,
  endDate,
  todayDate,
}: ComparisonPeriodInput): ComparisonPeriod {
  const currentStart = parseDate(startDate);
  const requestedEnd = parseDate(endDate);
  const today = parseDate(todayDate);
  const currentEnd = currentStart <= today && requestedEnd > today ? today : requestedEnd;

  if (mode === "mes") {
    return getPreviousMonthPeriod(currentStart, currentEnd, currentEnd < requestedEnd);
  }

  const durationDays = Math.floor((currentEnd.getTime() - currentStart.getTime()) / DAY_IN_MILLISECONDS) + 1;
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(durationDays - 1));

  return {
    currentEndDate: formatDate(currentEnd),
    previousStartDate: formatDate(previousStart),
    previousEndDate: formatDate(previousEnd),
  };
}

export function calculateKpiVariation(currentValue: number, previousValue: number): KpiVariation {
  if (previousValue === 0) {
    return currentValue === 0
      ? { label: "0,0%", direction: "neutral" }
      : { label: "Novo", direction: "neutral" };
  }

  const percentage = calculateRelativePercentageDifference(currentValue, previousValue);
  if (Math.abs(percentage) < 0.05) {
    return { label: "0,0%", direction: "neutral" };
  }

  const formattedPercentage = Math.abs(percentage).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return {
    label: `${percentage > 0 ? "+" : "-"}${formattedPercentage}%`,
    direction: percentage > 0 ? "up" : "down",
  };
}

export function calculateRelativePercentageDifference(currentValue: number, referenceValue: number): number {
  if (referenceValue === 0) return 0;
  return ((currentValue - referenceValue) / Math.abs(referenceValue)) * 100;
}
