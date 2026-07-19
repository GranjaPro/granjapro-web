# Phase 24: vaccines-and-packaging-ui - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase melhora somente a UI que mostra registros, agendamentos e rastreabilidade de vacinas já armazenados em `health_records`. O foco é tirar a experiência de vacinação da dependência exclusiva do componente "Agenda de vacinação" em `/dashboard/health` e permitir que o componente "Histórico de vacinação" em `/dashboard/flocks/detalhes/[loteId]/historico-sanitario` também seja uma superfície de edição.

Vacinas não devem ser tratadas como estoque da granja. Na operação real, vacinas são agendadas e aplicadas por agente externo, então o produto deve registrar planejamento, datas, status e rastreabilidade sanitária, não entrada/saída de estoque de vacina.

</domain>

<decisions>
## Implementation Decisions

### Vaccine Scope Redirect
- **D-01:** Vacinas saem do escopo de inventário da Phase 24. A fase não deve criar ou melhorar UI de estoque para vacinas/medicamentos.
- **D-02:** A Phase 24 deve focar no fluxo de vacinação dentro da área de Saúde: registros, agenda, rastreabilidade, edição e reagendamento.
- **D-03:** Embalagens não fazem parte deste recorte revisado da Phase 24. O planner deve tratar qualquer UI de embalagens como fora do escopo desta fase.

### Vaccination History Editing
- **D-04:** O componente "Histórico de vacinação" em `/dashboard/flocks/detalhes/[loteId]/historico-sanitario` deve ganhar uma ação explícita de edição por linha, usando ícone de lápis.
- **D-05:** O botão de edição deve reutilizar o modal/formulário de vacinação já existente, seguindo o padrão da página `/dashboard/health`, em vez de criar um segundo fluxo divergente.
- **D-06:** Qualquer vacina no histórico pode ser editada, independentemente do status. Isso inclui vacinas concluídas, agendadas, próximas ou em andamento.
- **D-07:** Reagendamentos devem acontecer editando a data e/ou o status do próprio registro em `health_records`.

### Derived UI Consistency
- **D-08:** Depois de editar uma vacina pelo Histórico de vacinação, a alteração deve refletir em todas as leituras derivadas de `health_records`: o próprio histórico, a Agenda de vacinação, métricas de cobertura vacinal e indicadores de vacinas atrasadas/próximas/concluídas.
- **D-09:** O planner deve garantir que a tela afetada recarregue ou atualize os dados derivados após salvar a edição, evitando inconsistência visual entre histórico, agenda e métricas.

### Traceability Preservation
- **D-10:** A rastreabilidade atual do componente "Histórico de vacinação" é considerada boa e deve ser preservada.
- **D-11:** Para a edição ser completa, o planner deve buscar os campos completos de vacinação em `health_records`, não apenas os campos resumidos usados hoje no histórico (`id`, `title`, `date`, `type`, `status`, `responsible`, `notes`).

### the agent's Discretion
- O planner pode escolher a forma mais simples de reutilizar o formulário existente, desde que evite duplicação grande de lógica e mantenha o fluxo consistente com `/dashboard/health`.
- O planner pode ajustar microcopy e layout do botão de edição para ficar coerente com o padrão visual atual da página de histórico sanitário.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` - Objetivos do produto, restrições mobile-first, Supabase-only e foco MVP.
- `.planning/milestones/v1.3-ROADMAP.md` - Goal original da Phase 24 e contexto do milestone v1.3.
- `.planning/STATE.md` - Estado atual do milestone e decisões acumuladas.

### Prior Health Decisions
- `.planning/phases/15-real-health-history-page/15-CONTEXT.md` - Decisões de rastreabilidade de vacinas/tratamentos em `health_records`.
- `.planning/phases/15-real-health-history-page/15-02-SUMMARY.md` - Fechamento de gaps sanitários, incluindo status de vacinação e edição na página geral de saúde.

### Code Entry Points
- `app/dashboard/health/page.tsx` - Página geral de Saúde; contém o componente "Agenda de vacinação" e o modal/formulário de registros de saúde já reutilizável como referência.
- `app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx` - Página de histórico sanitário do lote; contém o componente "Histórico de vacinação" que deve ganhar edição por linha.
- `app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` - Página de saúde do lote; referência de agenda e apresentação de vacinação no detalhe do lote.

### Data and Services
- `lib/services/health.ts` - Serviço existente para `health_records`, incluindo criação, atualização, deleção e agenda de vacinação.
- `lib/database.types.ts` - Tipos de `health_records`, incluindo campos de rastreabilidade sanitária.
- `supabase/migrations/00010_health_records.sql` - Schema original e RLS de `health_records`.
- `supabase/migrations/00021_health_and_inspections.sql` - Campos adicionais de rastreabilidade para vacinas/tratamentos e inspeções.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/dashboard/health/page.tsx`: já possui modal de adicionar/editar registro de saúde com tipo "Vacinação", campos de rastreabilidade e status.
- `lib/services/health.ts`: já expõe `updateHealthRecord`, `getVaccineSchedule` e operações sobre `health_records`.
- `ModalPortal`: padrão já usado nas páginas de Saúde e Inventário para formulários modais.
- Ícones `Pencil`, `Syringe`, `Check` e padrões de ações por linha já existem em páginas/tabelas do app.

### Established Patterns
- Registros sanitários usam `health_records` com `type = "vaccination"` para vacinas.
- Status de vacinação já usa `completed`, `in_progress`, `scheduled` e `upcoming`.
- Páginas client-side carregam dados via Supabase no `useEffect` e recalculam listas/métricas derivadas com `useMemo`.
- A UI do projeto usa ações explícitas com ícones em listas/tabelas para editar registros.

### Integration Points
- O `select` de `health_records` no histórico sanitário atualmente busca poucos campos e deve ser ampliado para suportar edição completa.
- O "Histórico de vacinação" deve chamar o fluxo de edição a partir de cada linha.
- Após salvar, a página deve atualizar `healthRecords` e recalcular histórico, agenda/cobertura e demais métricas derivadas.
- Mudanças de status/data devem afetar tanto vacinas concluídas quanto agendadas/próximas.

</code_context>

<specifics>
## Specific Ideas

- Vacinas são trazidas/aplicadas por um agente externo; a granja registra agendamento, aplicação e rastreabilidade, não estoque.
- O componente "Histórico de vacinação" dentro de `detalhes/[loteId]/historico-sanitario` já está visualmente bom para rastreabilidade, mas precisa permitir edição.
- A edição por linha deve usar um ícone de lápis.
- Reagendamento deve ser possível editando datas/status.

</specifics>

<deferred>
## Deferred Ideas

- UI de embalagens no inventário fica fora deste recorte revisado da Phase 24 e deve ser planejada em outra fase ou reavaliada no roadmap.
- Qualquer estoque de vacina/medicamento fica fora do escopo; vacinas devem continuar no domínio sanitário.

</deferred>

---

*Phase: 24-vaccines-and-packaging-ui*
*Context gathered: 2026-07-19*
