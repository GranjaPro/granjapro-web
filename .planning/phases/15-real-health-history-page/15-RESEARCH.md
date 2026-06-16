# Phase 15: Real Health History Page - Research

**Researched:** 2026-06-14
**Domain:** Supabase client-side integration for health records and mortality timelines in Next.js React client pages.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

**CRITICAL:** These locked decisions are copied verbatim from CONTEXT.md and must be honored by the planner.

### Locked Decisions
- **D-01:** If a flock has no database health records and no mortality records, show a clean empty state card ("Nenhum registro de saúde encontrado para este lote").
- **D-02:** The empty state card will feature a direct redirect button that links to the main Health page (`/dashboard/health?register=true`) with the current flock ID pre-selected in the query parameters so the user can easily log their first record.
- **D-03:** If a flock has mortality records but no health records, the pages will render the full layout rather than the empty state, calculating the health score based on the available mortality data.
- **D-04:** Both the flock details health dashboard (`saude/page.tsx`) and the sanitary history timeline (`historico-sanitario/page.tsx`) will share the same empty state logic and UI layout for design consistency.
- **D-05:** In empty or low-data states, the "Padrões identificados" (Identified Patterns) card will be hidden entirely to avoid cluttering the view with insufficient context.
- **D-06:** Fetch records from the `mortality` database table for the flock and merge them into the timeline as `"mortalidade"` events to keep the history comprehensive.
- **D-07:** Format mortality timeline events with the title `"Mortalidade registrada: X aves"` (displaying the dead bird count) and place the cause of death and notes in the description/observation field.
- **D-08:** Calculate the weekly mortality count and mortality rate KPIs on the flock health page dynamically using database records for the active date range or the last 7 days.
- **D-09:** Include mortality in the health score calculation with a 40% weight, reusing the existing mock logic (where rate <= 2% is a perfect score and rate >= 10% is 0) with real database metrics.
- **D-10:** Generate a standard 12-item checklist (covering temperature, ventilation, feed, water, bedding, behaviour, clinical signs, mortality, egg quality, lighting, biosecurity, and equipment) for database inspection records, defaulting all items to "Ok" (true).
- **D-11:** Dynamically scan the `notes` and `title` fields of inspection/treatment records for keywords (e.g. "pena", "ventilação", "sintoma") to flag specific checklist parameters as false (abnormal).
- **D-12:** If the database status of an inspection is not 'completed' (e.g. 'in_progress', 'scheduled', or 'upcoming'), render all checklist items as unchecked/pending in the UI.
- **D-13:** Calculate the compliance rate percentage dynamically based on the ratio of 'Ok' items to total items, displaying "Pendente" for non-completed inspections.
- **D-14:** Parse treatment duration dynamically from the `notes` field (e.g., matching expressions like "5 dias" or "1 semana") and add it to the start date to compute the end date. Default to "—" (same-day event) if no duration is found.
- **D-15:** Map database status to UI `resultado` as follows: 'completed' -> `"resolvido"`, 'in_progress' -> `"em_tratamento"`, and other statuses -> `"parcial"`.
- **D-16:** Enable full write integration on the flock-specific health page (`saude/page.tsx`) by wiring the Edit modal to trigger actual Supabase `.update()` calls.
- **D-17:** Implement the "Resolve symptom" action by performing an actual Supabase update to set the status of all corresponding in-progress health records that mention the resolved symptom to 'completed'.

### the agent's Discretion
- Standard layout styling for the empty state.
- Keyword lists used for flagging checklist parameters:
  - `"temperatura"` -> Temperature
  - `"ventilação"` or `"ar"` -> Ventilation
  - `"ração"` or `"alimento"` -> Feed
  - `"água"` or `"bebedouro"` -> Water
  - `"cama"` or `"maravalha"` -> Bedding
  - `"comportamento"` or `"canibalismo"` or `"bicagem"` -> Behaviour
  - `"penas"` or `"bico"` or `"espirro"` or `"coriza"` or `"sintoma"` or `"apatia"` -> Clinical signs / behavior
  - `"morte"` or `"mortalidade"` or `"óbito"` -> Mortality
  - `"ovo"` or `"casca"` or `"postura"` -> Egg quality
  - `"luz"` or `"iluminação"` -> Lighting
  - `"biossegurança"` or `"desinfecção"` -> Biosecurity
  - `"equipamento"` or `"exaustor"` or `"comedouro"` -> Equipment

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetching health records | Browser/Client | Database/Storage | Retrieved on-demand from Supabase using custom select filters for `flock_id`. |
| Fetching mortality records | Browser/Client | Database/Storage | Retrieved on-demand from Supabase for merging into the sanitary history timeline. |
| Health score calculations | Browser/Client | — | Dynamically calculated client-side to dynamically reflect changes in filters. |
| Keyword scanning & checklist generation | Browser/Client | — | Standardized checklist parameters mapped on-the-fly inside the client component from unstructured `notes` / `title` fields. |
| Health record updates / edits | Browser/Client | Database/Storage | Executed from edit modals directly to the Supabase client service layer. |
| Batch resolving symptoms | Browser/Client | Database/Storage | Updates all matching symptoms status to 'completed' via Supabase update queries. |
</architectural_responsibility_map>

<research_summary>
## Summary

This phase connects the flock-specific health dashboard and sanitary history timeline to real Supabase tables (`health_records` and `mortality`). The current codebase relies heavily on client component rendering with mock data when no database records exist, or hardcoded fallbacks for flock L003. We need to implement clean data loaders utilizing the Supabase JS client, merge health records and mortality records into a unified chronological list, and handle empty states gracefully.

The primary technical challenges reside in schema normalization (since checklists and treatment durations are stored as unstructured text in the `notes` and `title` fields rather than discrete columns) and client state synchronization. By writing utility functions for parsing durations and scanning notes for anomaly keywords, we can map unstructured DB data into the highly detailed frontend components.

**Primary recommendation:** Fetch `health_records` and `mortality` in parallel via `Promise.all` inside `useEffect` in both `saude/page.tsx` and `historico-sanitario/page.tsx`. Share the unified loading and mapping logic to guarantee UI parity.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.3 | Supabase Client | Official SDK for interacting with the database. |
| lucide-react | ^0.460.0 | Iconography | Standard icon set for UI representation. |
| recharts | ^3.8.0 | Charting | Standard charting library for displaying historical score trends. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side parsing of text | Database-level trigger/columns | Adding columns to `health_records` requires schema migrations which is deferred to preserve schema simplicity. |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
app/dashboard/flocks/detalhes/[loteId]/
├── saude/
│   └── page.tsx                # Health Dashboard (Write & Read Integration)
└── historico-sanitario/
    └── page.tsx                # Sanitary Timeline (Read Integration)
```

### Pattern 1: Merging and Normalizing Timeline Events
We must merge `health_records` and `mortality` rows into a single `TimelineEvent` list sorted by date descending.

```typescript
const unifiedEvents = [
  ...healthRecords.map(r => ({
    id: r.id,
    date: r.date,
    type: r.type as EventType, // 'vaccination' -> 'vacina', 'treatment' -> 'medicamento', 'inspection' -> 'inspecao'
    title: r.title,
    description: r.notes || "",
    employee: r.responsible || "Não informado",
    status: mapStatusToTimeline(r.status)
  })),
  ...mortalityRecords.map(m => ({
    id: m.id,
    date: m.date,
    type: "mortalidade" as const,
    title: `Mortalidade registrada: ${m.dead_birds} aves`,
    description: m.cause || "Causa natural",
    employee: "Registro",
    observation: m.notes || undefined,
    status: "concluido" as const
  }))
].sort((a, b) => b.date.localeCompare(a.date));
```

### Pattern 2: Keyword Anomaly Scanner for Checklists
Since checklists are not stored in database records, we generate them dynamically:

```typescript
const KEYWORDS = {
  temperature: ["temperatura", "calor", "frio", "graus"],
  ventilation: ["ventilação", "ar", "exaustor", "abafado"],
  feed: ["ração", "alimento", "comer", "nutrição"],
  water: ["água", "bebedouro", "vazamento"],
  bedding: ["cama", "maravalha", "umidade"],
  behaviour: ["comportamento", "canibalismo", "bicagem", "estresse"],
  clinicalSigns: ["penas", "bico", "espirro", "coriza", "sintoma", "apatia", "doença"],
  mortality: ["morte", "mortalidade", "óbito"],
  eggQuality: ["ovo", "casca", "postura"],
  lighting: ["luz", "iluminação"],
  biosecurity: ["biossegurança", "desinfecção", "visita"],
  equipment: ["equipamento", "exaustor", "comedouro", "bebedouro"]
};

function generateChecklistFromText(title: string, notes: string) {
  const combined = `${title} ${notes}`.toLowerCase();
  const items = [
    { item: "Temperatura do galpão", key: "temperature" },
    { item: "Ventilação", key: "ventilation" },
    { item: "Consumo de ração", key: "feed" },
    { item: "Consumo de água", key: "water" },
    { item: "Condição das camas", key: "bedding" },
    { item: "Comportamento das aves", key: "behaviour" },
    { item: "Sinais clínicos", key: "clinicalSigns" },
    { item: "Mortalidade diária", key: "mortality" },
    { item: "Qualidade dos ovos", key: "eggQuality" },
    { item: "Iluminação", key: "lighting" },
    { item: "Biossegurança", key: "biosecurity" },
    { item: "Equipamentos", key: "equipment" }
  ];

  return items.map(i => {
    const keywords = KEYWORDS[i.key as keyof typeof KEYWORDS];
    const isAbnormal = keywords.some(kw => combined.includes(kw));
    return {
      item: i.item,
      ok: !isAbnormal // Default to true (Ok) unless keyword matches
    };
  });
}
```

### Anti-Patterns to Avoid
- **Hardcoded flock checks:** Avoid checking `if (flockRes.data.code === "L003")` to load mock data. All flocks should query live database tables and fall back to the empty state when empty.
- **Direct local state manipulation without DB writes:** Any status updates (like resolving a symptom or updating a record in the edit modal) must perform Supabase `.update()` calls first, and only update local state upon API success.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date Formatting | Custom string split logic | `new Date(dateStr + 'T00:00:00').toLocaleDateString(...)` | Avoid time-zone shifting bugs where UTC conversions shift dates by one day. |
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Timezone Offsets in Date Formatting
**What goes wrong:** Displayed dates show one day before the actual database date (e.g. database `2026-06-14` is rendered as `13/06/2026`).
**Why it happens:** Passing date-only strings (like `"2026-06-14"`) into `new Date()` triggers UTC parsing, which shifts dates back depending on local timezone offset.
**How to avoid:** Always append time information or format locally: `new Date(dateStr + "T00:00:00")`.

### Pitfall 2: Supabase Query Scope
**What goes wrong:** Loading health records from other farms because `farm_id` query is missing.
**Why it happens:** Forgetting to filter by `farm_id` when executing database calls.
**How to avoid:** Always include `.eq("farm_id", currentFarm.id)` in all queries and updates.
</common_pitfalls>

<code_examples>
## Code Examples

### Querying Unified Flock Sanitary Data
```typescript
const supabase = createClient();
const [healthRes, mortalityRes] = await Promise.all([
  supabase
    .from("health_records")
    .select("id, title, date, type, status, responsible, notes")
    .eq("farm_id", currentFarmId)
    .eq("flock_id", loteId)
    .order("date", { ascending: false }),
  supabase
    .from("mortality")
    .select("id, date, dead_birds, cause, notes")
    .eq("farm_id", currentFarmId)
    .eq("flock_id", loteId)
    .order("date", { ascending: false })
]);
```

### Resolving Symptoms in Database
```typescript
const supabase = createClient();
const { error } = await supabase
  .from("health_records")
  .update({ status: "completed" })
  .eq("farm_id", currentFarmId)
  .eq("flock_id", loteId)
  .eq("status", "in_progress")
  .ilike("notes", `%${symptom}%`); // case-insensitive match on notes containing the resolved symptom
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock/hardcoded views | Database-driven dynamic state | 2026 | Enables real-time logging and analytics sync. |
</sota_updates>

<open_questions>
## Open Questions

1. **How should the dynamic duration parsing parse "1 semana"?**
   - What we know: It should default to Same-Day if not found.
   - Recommendation: Use a helper regex to look for digits followed by `"dia"`, `"semana"`, etc. Treat `"semana"` as 7 days, `"dias"` as literal days.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `supabase/migrations/00010_health_records.sql` - Health records table and RLS policies.
- `app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` - Existing page code.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Supabase Client, React client-side fetching
- Ecosystem: Next.js Pages / App router components
- Patterns: Keyword text analysis, dynamic UI mapping

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH
- Code examples: HIGH

**Research date:** 2026-06-14
**Valid until:** 2026-07-14
</metadata>

---

*Phase: 15-real-health-history-page*
*Research completed: 2026-06-14*
*Ready for planning: yes*
