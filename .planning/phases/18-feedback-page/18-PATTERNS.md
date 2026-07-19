# Phase 18: feedback-page - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/dashboard/feedback/page.tsx` | route/component | request-response CRUD insert | `app/dashboard/agua/page.tsx` + `app/dashboard/select-plan/page.tsx` | role-match |
| `lib/services/feedback.ts` | service | CRUD insert | `lib/services/water.ts` | exact |
| `lib/services/index.ts` | config/barrel | transform | `lib/services/index.ts` | exact |
| `supabase/migrations/00028_feedbacks.sql` | migration | CRUD schema/RLS | `supabase/migrations/00020_water_consumption.sql` + `supabase/migrations/00022_flock_tasks_crud.sql` | exact |
| `lib/database.types.ts` | model/type | transform | `lib/database.types.ts` water/task table entries | exact |
| `app/dashboard/layout.tsx` | component/provider | request-response navigation | `app/dashboard/layout.tsx` sidebar nav | exact |
| `components/dashboard/profile-settings.tsx` | component | event-driven navigation | `components/dashboard/profile-settings.tsx` plan navigation button | exact |

## Pattern Assignments

### `app/dashboard/feedback/page.tsx` (route/component, request-response CRUD insert)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\app\dashboard\agua\page.tsx` and `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\app\dashboard\select-plan\page.tsx`

**Imports pattern** (`app/dashboard/agua/page.tsx` lines 1-16, 39-52):
```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CalendarFilter, useDateFilter } from "@/components/date-filter";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import {
  createWaterRecord,
  type WaterConsumptionRow,
  type WaterConsumptionUpdate,
} from "@/lib/services/water";
```

**Auth/context pattern** (`app/dashboard/agua/page.tsx` lines 203-216):
```typescript
export default function AguaPage() {
  const { farm } = useAuth();
  const [records, setRecords] = useState<WaterConsumptionRow[]>([]);
  const [form, setForm] = useState<WaterForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

**Submit/service-call pattern** (`app/dashboard/agua/page.tsx` lines 581-615):
```typescript
async function saveRecord() {
  if (!farm?.id || !form.date || !form.quantityLiters) return;
  setIsSaving(true);
  try {
    await createWaterRecord({
      farm_id: farm.id,
      date: form.date,
      quantity_liters: quantityLiters,
    });
    setModalOpen(false);
    await loadData();
  } catch (saveError) {
    setError(getErrorMessage(saveError));
  } finally {
    setIsSaving(false);
  }
}
```

**Inline status pattern** (`app/dashboard/select-plan/page.tsx` lines 444-455):
```typescript
{error && (
  <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
    <AlertCircle className="h-4 w-4" />
    {error}
  </div>
)}

{checkoutNotice && (
  <div className="flex items-center gap-2 rounded-lg border border-brand-400/30 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-100">
    {syncingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
    {checkoutNotice}
  </div>
)}
```

**Form control pattern** (`app/dashboard/agua/page.tsx` lines 1212-1233, 1247-1255):
```typescript
<Field label="Lote">
  <select
    value={form.flockId}
    onChange={(event) => setForm({ ...form, flockId: event.target.value })}
    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white dark:bg-slate-800 cursor-pointer"
  >
    <option value="">Sem lote</option>
  </select>
</Field>

<button
  onClick={saveRecord}
  disabled={isSaving || !form.date || Number(form.quantityLiters) <= 0}
  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 transition-colors cursor-pointer shadow-sm shadow-brand-600/20 disabled:cursor-not-allowed disabled:bg-gray-300"
>
  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
  Salvar
</button>
```

**Star/icon pattern** (`app/dashboard/flocks/detalhes/[loteId]/operacional/page.tsx` lines 39-48, 97-103):
```typescript
import {
  Heart,
  Star,
  type LucideIcon,
} from "lucide-react";

const taskIconMap = {
  star: { icon: Star, label: "Importante", color: "text-yellow-600", bg: "bg-yellow-50" },
};
```

**Planner notes:** Implement as a client route. Use explicit `FeedbackCategory` union from the locked category list. Use `user` and `farm` from `useAuth()`; disable submit when either context is unavailable. On success, clear local state and keep route unchanged. Do not add an API route.

---

### `lib/services/feedback.ts` (service, CRUD insert)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\lib\services\water.ts`

**Imports/types pattern** (`lib/services/water.ts` lines 1-6):
```typescript
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type WaterConsumptionRow = Database["public"]["Tables"]["water_consumption"]["Row"];
export type WaterConsumptionInsert = Database["public"]["Tables"]["water_consumption"]["Insert"];
export type WaterConsumptionUpdate = Database["public"]["Tables"]["water_consumption"]["Update"];
```

**Insert pattern** (`lib/services/water.ts` lines 39-48):
```typescript
export async function createWaterRecord(record: WaterConsumptionInsert): Promise<WaterConsumptionRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("water_consumption")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Planner notes:** Create only the insert helper unless a later plan needs reads. Use `FeedbackRow` and `FeedbackInsert`; avoid `Record<string, any>` even where older services use it.

---

### `lib/services/index.ts` (config/barrel, transform)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\lib\services\index.ts`

**Barrel export pattern** (`lib/services/index.ts` lines 1-7, 21-24):
```typescript
export { getFarm, getUserFarm, createFarm, updateFarm } from "./farms";
export { getBarns, getBarn, createBarn, updateBarn, deleteBarn } from "./barns";
export { getWaterByDateRange, getWaterByFlock, createWaterRecord, updateWaterRecord, deleteWaterRecord } from "./water";
export {
  createTask,
  updateTask,
} from "./tasks";
export { getEquipmentByFarm, createEquipment, updateEquipment, deleteEquipment } from "./equipment";
```

**Planner notes:** If the feedback service is consumed through the barrel, append a focused export such as `export { createFeedback, type FeedbackInsert, type FeedbackRow } from "./feedback";`. Keep the change atomic.

---

### `supabase/migrations/00028_feedbacks.sql` (migration, CRUD schema/RLS)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\supabase\migrations\00020_water_consumption.sql` and `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\supabase\migrations\00022_flock_tasks_crud.sql`

**Table/FK/RLS pattern** (`supabase/migrations/00020_water_consumption.sql` lines 1-15):
```sql
-- ============================================
-- Migration 00020: Add water consumption table
-- ============================================

create table if not exists public.water_consumption (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  flock_id uuid references public.flocks on delete set null,
  date date not null,
  quantity_liters numeric(10,2) not null
);

alter table public.water_consumption enable row level security;
```

**Insert policy pattern** (`supabase/migrations/00020_water_consumption.sql` lines 24-29):
```sql
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'water_consumption' and policyname = 'Users can insert water consumption in their farm') then
    create policy "Users can insert water consumption in their farm" on public.water_consumption for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;
```

**Enum/check constraint pattern** (`supabase/migrations/00022_flock_tasks_crud.sql` lines 3-11):
```sql
alter table public.tasks
  add column if not exists flock_id uuid references public.flocks(id) on delete cascade,
  add column if not exists category text not null default 'geral'
    check (category in ('coleta', 'alimentacao', 'limpeza', 'inspecao', 'saude', 'geral')),
  add column if not exists priority text not null default 'media'
    check (priority in ('alta', 'media', 'baixa')),
  add column if not exists notes text;
```

**Owned/member farm policy pattern** (`supabase/migrations/00022_flock_tasks_crud.sql` lines 28-39):
```sql
create policy "Users can view task exceptions from owned farms"
  on public.task_exceptions for select
  using (
    exists (
      select 1 from public.farms
      where farms.id = task_exceptions.farm_id
        and (
          farms.owner_id = auth.uid()
          or farms.id in (select profiles.farm_id from public.profiles where profiles.id = auth.uid())
        )
    )
  );
```

**Index pattern** (`supabase/migrations/00020_water_consumption.sql` lines 45-46):
```sql
create index if not exists idx_water_consumption_farm_date on public.water_consumption(farm_id, date);
create index if not exists idx_water_consumption_flock_id on public.water_consumption(flock_id);
```

**Planner notes:** Current latest migration is `00027_fix_medicine_inventory_location_trigger.sql`, so use `00028_feedbacks.sql` if still available at execution time. Include `user_id uuid references auth.users(id) on delete cascade not null`, `farm_id uuid references public.farms(id) on delete cascade not null`, `rating integer not null check (rating between 1 and 5)`, category check for the five locked values, optional `description text`, and insert-only user/farm RLS for this phase.

---

### `lib/database.types.ts` (model/type, transform)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\lib\database.types.ts`

**Table shape pattern** (`lib/database.types.ts` lines 688-716):
```typescript
water_consumption: {
  Row: {
    id: string;
    created_at: string;
    farm_id: string;
    barn_id: string | null;
    flock_id: string | null;
    date: string;
    quantity_liters: number;
  };
  Insert: {
    id?: string;
    created_at?: string;
    farm_id: string;
    barn_id?: string | null;
    flock_id?: string | null;
    date: string;
    quantity_liters: number;
  };
  Update: {
    id?: string;
    created_at?: string;
    farm_id?: string;
    barn_id?: string | null;
    flock_id?: string | null;
    date?: string;
    quantity_liters?: number;
  };
};
```

**String-union pattern** (`lib/database.types.ts` lines 952-981):
```typescript
tasks: {
  Row: {
    category: "coleta" | "alimentacao" | "limpeza" | "inspecao" | "saude" | "geral";
    priority: "alta" | "media" | "baixa";
    recurrence: "diaria" | "semanal" | "mensal" | "unica";
    notes: string | null;
  };
  Insert: {
    category?: "coleta" | "alimentacao" | "limpeza" | "inspecao" | "saude" | "geral";
    priority?: "alta" | "media" | "baixa";
    recurrence?: "diaria" | "semanal" | "mensal" | "unica";
    notes?: string | null;
  };
};
```

**Helper type pattern** (`lib/database.types.ts` lines 1270-1280):
```typescript
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
```

**Planner notes:** Add a `feedbacks` table entry inside `Database["public"]["Tables"]`; do not add `any`. Category should be the explicit Portuguese product-feedback union from Phase 18.

---

### `app/dashboard/layout.tsx` (component/provider, request-response navigation)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\app\dashboard\layout.tsx`

**Imports/type pattern** (`app/dashboard/layout.tsx` lines 23-60):
```typescript
import {
  LayoutDashboard,
  Building2,
  Bird,
  Egg,
  type LucideIcon,
} from "lucide-react";

type SidebarNavItem =
  | { type: "divider" }
  | { label: string; href: string; icon: LucideIcon; minimumPlan?: PlanType };
```

**Nav data pattern** (`app/dashboard/layout.tsx` lines 69-88):
```typescript
const sidebarNav: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "divider" as const },
  { label: "Galpoes", href: "/dashboard/barns", icon: Building2 },
  { label: "Assistente IA", href: "/dashboard/ai", icon: Bot },
  { label: "Funcionarios", href: "/dashboard/workers", icon: Users, minimumPlan: "pro" },
  { label: "Relatorios", href: "/dashboard/reports", icon: FileText, minimumPlan: "pro" },
];
```

**Rendering/active pattern** (`app/dashboard/layout.tsx` lines 381-435):
```typescript
{sidebarNav.map((item, i) => {
  if ("type" in item && item.type === "divider") {
    return <div key={`div-${i}`} className="my-2.5 mx-2 border-t border-white/[0.06]" />;
  }
  const navItem = item as SidebarNavLink;
  const isActive = pathname === navItem.href;
  const Icon = navItem.icon;
  const itemClass = cn(
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer w-full text-left",
    isActive
      ? "bg-brand-500/90 text-white shadow-lg shadow-brand-500/20"
      : "text-brand-300/80 hover:bg-white/[0.07] hover:text-white"
  );
  return (
    <Link key={navItem.href} href={navItem.href} onClick={() => setSidebarOpen(false)} className={itemClass}>
      <Icon className={cn("w-[18px] h-[18px] flex-shrink-0 transition-colors", isActive ? "text-white" : "text-brand-400/70 group-hover:text-brand-300")} />
      {!collapsed && <span className="truncate flex-1">{navItem.label}</span>}
    </Link>
  );
})}
```

**Planner notes:** Append `Feedback` at the end of `sidebarNav` after `Relatorios`, before the separate account/sign-out block. Import one Lucide feedback icon, preferably `MessageSquare`.

---

### `components/dashboard/profile-settings.tsx` (component, event-driven navigation)

**Analog:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\components\dashboard\profile-settings.tsx`

**Imports/navigation pattern** (`components/dashboard/profile-settings.tsx` lines 1-8, 38-41):
```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import ModalPortal from "@/components/ui/modal-portal";

export default function ProfileSettings({ open, onClose }: ProfileSettingsProps) {
  const router = useRouter();
  const { user, profile, farm, signOut, refreshProfile } = useAuth();
```

**Close-then-route pattern** (`components/dashboard/profile-settings.tsx` lines 105-108):
```typescript
const handleOpenPlanSelection = () => {
  onClose();
  router.push("/dashboard/select-plan");
};
```

**Modal guard/mount pattern** (`components/dashboard/profile-settings.tsx` lines 206-224, 736):
```typescript
if (!open) return null;

return (
  <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
    </div>
  </ModalPortal>
);
```

**Button pattern** (`components/dashboard/profile-settings.tsx` lines 521-527):
```typescript
<button
  onClick={handleOpenPlanSelection}
  className="flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-600 cursor-pointer"
>
  <CreditCard className="h-4 w-4" />
  Ver e alterar plano
</button>
```

**Planner notes:** Add `handleOpenFeedback` next to `handleOpenPlanSelection`, call `onClose()` first, then `router.push("/dashboard/feedback")`. Place one `Enviar feedback` button inside the existing modal UI; do not expand tabs or introduce a new modal.

## Shared Patterns

### Authenticated farm context

**Source:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\app\dashboard\agua\page.tsx` lines 203-216
**Apply to:** `app/dashboard/feedback/page.tsx`

Use `useAuth()` for `user`/`farm` context and keep submit disabled until required context exists. Do not manually re-query auth in the page.

### Supabase service error propagation

**Source:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\lib\services\water.ts` lines 39-48
**Apply to:** `lib/services/feedback.ts`, `app/dashboard/feedback/page.tsx`

```typescript
const { data, error } = await supabase
  .from("water_consumption")
  .insert(record)
  .select()
  .single();

if (error) throw error;
return data;
```

Page code should catch thrown service errors and display a generic inline retry message.

### RLS farm ownership/membership checks

**Source:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\supabase\migrations\00022_flock_tasks_crud.sql` lines 28-39 and `supabase/migrations/00020_water_consumption.sql` lines 24-29
**Apply to:** `supabase/migrations/00028_feedbacks.sql`

Use database RLS as the authority. For feedback, strengthen the insert `with check` to include `user_id = auth.uid()` plus allowed `farm_id`; do not rely on client validation alone.

### Inline status banners

**Source:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\app\dashboard\select-plan\page.tsx` lines 444-455
**Apply to:** `app/dashboard/feedback/page.tsx`

Use existing red and brand/emerald banner classes for submit error and success confirmation. Keep status in page; do not redirect after success.

### Local UI primitives and button styles

**Source:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\components\ui\button.tsx` lines 6-47 and `components/ui/card.tsx` lines 4-43
**Apply to:** `app/dashboard/feedback/page.tsx`, `components/dashboard/profile-settings.tsx`

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
);
```

Use local primitives only if they reduce duplication; otherwise copy existing inline dashboard classes.

### Strict TypeScript table-derived types

**Source:** `C:\Users\Bernardo Timo\OneDrive\Desktop\GranjaPro\lib\database.types.ts` lines 1270-1280
**Apply to:** `lib/services/feedback.ts`, `app/dashboard/feedback/page.tsx`

Derive service types from `Database["public"]["Tables"]["feedbacks"]`; no `any`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| None | - | - | Every planned file has at least one role/data-flow analog in the current codebase. |

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `supabase/migrations/`
**Files scanned:** 171 files from `rg --files`
**Pattern extraction date:** 2026-07-19
**Required inputs read:** `gsd-pattern-mapper.toml`, `AGENTS.md`, `18-CONTEXT.md`, `18-RESEARCH.md`, `18-UI-SPEC.md`, `18-VALIDATION.md`
**Project skill directories:** `.codex/skills` and `.agents/skills` were not present in this repository.
**Latest migration observed:** `supabase/migrations/00027_fix_medicine_inventory_location_trigger.sql`
**Source-edit constraint:** No application source files modified; this artifact is the only written file.
