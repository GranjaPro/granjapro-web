"use client";

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";

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

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [filterMode, setFilterMode] = useState<FilterMode>("dia");
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date());
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateRange = useMemo(() => {
    let startDate: string;
    let endDate: string;

    if (filterMode === "dia" && rangeStart) {
      startDate = rangeStart.toISOString().split("T")[0];
      endDate = startDate;
    } else if (filterMode === "intervalo" && rangeStart && rangeEnd) {
      startDate = rangeStart.toISOString().split("T")[0];
      endDate = rangeEnd.toISOString().split("T")[0];
    } else if (filterMode === "mes") {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      startDate = new Date(year, month, 1).toISOString().split("T")[0];
      endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
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
