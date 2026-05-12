"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateFilter } from "./date-filter-context";

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function CalendarFilter() {
  const {
    filterMode, setFilterMode,
    rangeStart, setRangeStart,
    rangeEnd, setRangeEnd,
    selectedDate, setSelectedDate,
  } = useDateFilter();

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const calendarLabel = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    if (filterMode === "dia") {
      if (rangeStart) {
        const today = new Date();
        if (sameDay(rangeStart, today)) return `Hoje, ${rangeStart.getDate()} ${months[rangeStart.getMonth()]}`;
        return `${rangeStart.getDate()} ${months[rangeStart.getMonth()]}, ${rangeStart.getFullYear()}`;
      }
      return "Selecionar dia";
    }
    if (filterMode === "intervalo") {
      if (rangeStart && rangeEnd) {
        return `${rangeStart.getDate()} ${months[rangeStart.getMonth()]} — ${rangeEnd.getDate()} ${months[rangeEnd.getMonth()]}`;
      }
      if (rangeStart) return `${rangeStart.getDate()} ${months[rangeStart.getMonth()]} — ...`;
      return "Selecionar período";
    }
    const d = selectedDate;
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, [selectedDate, filterMode, rangeStart, rangeEnd]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [calendarMonth]);

  const isInRange = useCallback((day: Date) => {
    if (filterMode === "dia") return rangeStart ? sameDay(day, rangeStart) : false;
    if (filterMode !== "intervalo" || !rangeStart) return false;
    if (!rangeEnd) return sameDay(day, rangeStart);
    const t = day.getTime();
    const s = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
    const e = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime();
    return t >= s && t <= e;
  }, [filterMode, rangeStart, rangeEnd]);

  const isRangeStart = useCallback((day: Date) => {
    return (filterMode === "intervalo" || filterMode === "dia") && rangeStart && sameDay(day, rangeStart);
  }, [filterMode, rangeStart]);

  const isRangeEnd = useCallback((day: Date) => {
    return (filterMode === "intervalo" || filterMode === "dia") && rangeEnd && sameDay(day, rangeEnd);
  }, [filterMode, rangeEnd]);

  const handleCalDayClick = useCallback((day: Date) => {
    if (filterMode === "dia") {
      setRangeStart(day);
      setRangeEnd(day);
      setCalendarOpen(false);
    } else if (filterMode === "intervalo") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(day);
        setRangeEnd(null);
      } else {
        if (day.getTime() < rangeStart.getTime()) {
          setRangeEnd(rangeStart);
          setRangeStart(day);
        } else {
          setRangeEnd(day);
        }
        setCalendarOpen(false);
      }
    } else {
      setSelectedDate(new Date(day.getFullYear(), day.getMonth(), 1));
      setCalendarOpen(false);
    }
  }, [filterMode, rangeStart, rangeEnd, setRangeStart, setRangeEnd, setSelectedDate]);

  const handleMonthClick = useCallback((monthIndex: number) => {
    setSelectedDate(new Date(calendarMonth.getFullYear(), monthIndex, 1));
    setCalendarOpen(false);
  }, [calendarMonth, setSelectedDate]);

  return (
    <div className="relative" ref={calendarRef}>
      <button
        onClick={() => setCalendarOpen(!calendarOpen)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm dark:bg-slate-950 dark:text-slate-300 dark:border-white/10 dark:hover:bg-slate-900"
      >
        <CalendarDays className="w-4 h-4" />
        {calendarLabel}
      </button>

      {calendarOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 z-50 w-[320px] animate-in fade-in zoom-in-95 duration-150 dark:bg-slate-950 dark:border-white/10 dark:shadow-black/50">
          {/* Mode selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-950 rounded-xl p-1 mb-4">
            {([
              { key: "dia" as const, label: "Dia" },
              { key: "intervalo" as const, label: "Intervalo" },
              { key: "mes" as const, label: "Mês" },
            ]).map((p) => (
              <button
                key={p.key}
                onClick={() => setFilterMode(p.key)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                  filterMode === p.key
                    ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Range hint */}
          {filterMode === "intervalo" && (
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mb-2 text-center">
              {!rangeStart || (rangeStart && rangeEnd) ? "Clique no dia inicial" : "Clique no dia final"}
            </p>
          )}

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </span>
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            </button>
          </div>

          {filterMode === "mes" ? (
            <div className="grid grid-cols-3 gap-2">
              {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => {
                const isSelected = selectedDate.getMonth() === i && selectedDate.getFullYear() === calendarMonth.getFullYear();
                return (
                  <button
                    key={m}
                    onClick={() => handleMonthClick(i)}
                    className={cn(
                      "py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                      isSelected ? "bg-brand-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-0 mb-1">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-slate-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="h-9" />;
                  const today = new Date();
                  const isToday = sameDay(day, today);
                  const inRange = isInRange(day);
                  const isStart = isRangeStart(day);
                  const isEnd = isRangeEnd(day);
                  const isSingle = isStart && isEnd;

                  return (
                    <button
                      key={i}
                      onClick={() => handleCalDayClick(day)}
                      className={cn(
                        "h-9 text-sm font-medium transition-all duration-150 cursor-pointer relative flex items-center justify-center",
                        inRange && !isStart && !isEnd && "bg-brand-50 text-brand-700 dark:bg-slate-900 dark:text-brand-200",
                        isStart && !isSingle && "bg-brand-600 text-white rounded-l-xl",
                        isEnd && !isSingle && "bg-brand-600 text-white rounded-r-xl",
                        isSingle && "bg-brand-600 text-white rounded-xl shadow-sm",
                        !inRange && "hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl",
                      )}
                    >
                      <span className={cn(
                        isToday && !inRange && "w-7 h-7 rounded-full border-2 border-brand-500 flex items-center justify-center",
                      )}>
                        {day.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button
            onClick={() => {
              const today = new Date();
              setRangeStart(today);
              setRangeEnd(today);
              setSelectedDate(today);
              setCalendarMonth(today);
              setFilterMode("dia");
              setCalendarOpen(false);
            }}
            className="w-full mt-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-colors cursor-pointer"
          >
            Hoje
          </button>
        </div>
      )}
    </div>
  );
}
