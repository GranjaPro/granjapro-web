"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { getMonthDateRange } from "@/lib/domain/date-filter-range";

export type FilterMode = "dia" | "intervalo" | "mes";

interface DateFilterState {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  rangeStart: Date | null;
  setRangeStart: (d: Date | null) => void;
  rangeEnd: Date | null;
  setRangeEnd: (d: Date | null) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  /** ISO strings for querying: { startDate, endDate } */
  dateRange: { startDate: string; endDate: string };
}

const DateFilterContext = createContext<DateFilterState | null>(null);

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date());
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateRange = useMemo(() => {
    let startDate: string;
    let endDate: string;

    if (filterMode === "dia" && rangeStart) {
      startDate = toLocalDateString(rangeStart);
      endDate = startDate;
    } else if (filterMode === "intervalo" && rangeStart && rangeEnd) {
      startDate = toLocalDateString(rangeStart);
      endDate = toLocalDateString(rangeEnd);
    } else if (filterMode === "mes") {
      ({ startDate, endDate } = getMonthDateRange(selectedDate));
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      startDate = toLocalDateString(start);
      endDate = toLocalDateString(end);
    }

    return { startDate, endDate };
  }, [filterMode, rangeStart, rangeEnd, selectedDate]);

  const value = useMemo<DateFilterState>(
    () => ({
      filterMode,
      setFilterMode,
      rangeStart,
      setRangeStart,
      rangeEnd,
      setRangeEnd,
      selectedDate,
      setSelectedDate,
      dateRange,
    }),
    [filterMode, rangeStart, rangeEnd, selectedDate, dateRange]
  );

  return <DateFilterContext.Provider value={value}>{children}</DateFilterContext.Provider>;
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error("useDateFilter must be used within DateFilterProvider");
  return ctx;
}
