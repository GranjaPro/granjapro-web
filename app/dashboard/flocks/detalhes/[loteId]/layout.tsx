"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import type { Tables } from "@/lib/database.types";

type TreatmentRecord = Pick<
  Tables<"health_records">,
  | "id"
  | "date"
  | "title"
  | "active_ingredient"
  | "brand_name"
  | "withdrawal_period_days"
  | "disposal_destination"
>;

interface FlockDetailsLayoutProps {
  children: ReactNode;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getWithdrawalEndDate(record: TreatmentRecord) {
  const withdrawalDays = record.withdrawal_period_days ?? 0;
  return toIsoDate(addDays(new Date(`${record.date}T00:00:00`), withdrawalDays));
}

export default function FlockDetailsLayout({ children }: FlockDetailsLayoutProps) {
  const params = useParams();
  const loteId = String(params.loteId ?? "");
  const { farm } = useAuth();
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);

  useEffect(() => {
    if (!farm || !loteId) return;

    let cancelled = false;
    const farmId = farm.id;
    const supabase = createClient();

    async function fetchActiveTreatments() {
      const { data, error } = await supabase
        .from("health_records")
        .select(
          "id, date, title, active_ingredient, brand_name, withdrawal_period_days, disposal_destination",
        )
        .eq("farm_id", farmId)
        .eq("flock_id", loteId)
        .eq("type", "treatment")
        .gt("withdrawal_period_days", 0)
        .order("date", { ascending: false });

      if (!cancelled && !error) {
        setTreatments((data as TreatmentRecord[] | null) ?? []);
      }
    }

    fetchActiveTreatments();
    return () => {
      cancelled = true;
    };
  }, [farm, loteId]);

  const activeWithdrawal = useMemo(() => {
    const today = toIsoDate(new Date());
    return treatments.find((record) => {
      const endDate = getWithdrawalEndDate(record);
      return record.date <= today && today <= endDate;
    });
  }, [treatments]);

  return (
    <>
      {activeWithdrawal && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold">
              Lote sob Carência Sanitária — Ovos impróprios para consumo
            </p>
            <p className="mt-1 text-sm">
              {activeWithdrawal.brand_name ?? activeWithdrawal.title}
              {activeWithdrawal.active_ingredient
                ? ` (${activeWithdrawal.active_ingredient})`
                : ""}{" "}
              exige descarte até {formatDate(getWithdrawalEndDate(activeWithdrawal))}.
            </p>
            {activeWithdrawal.disposal_destination && (
              <p className="mt-1 text-xs font-medium">
                Destino do descarte: {activeWithdrawal.disposal_destination}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
