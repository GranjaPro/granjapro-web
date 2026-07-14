# Phase 22: Storage Locations and Inventory Database - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 22-storage-locations-and-inventory-database
**Areas discussed:** Storage location model, Inventory traceability, Automatic financial expenses, Safe storage location deletion, Inventory losses

---

## Storage Location Model

| Option | Description | Selected |
|--------|-------------|----------|
| Obrigatorio | Every item must have `location_id`; best traceability but stricter migration/UX. | |
| Opcional | Allows stock without a location; weaker aggregates. | |
| Local padrao automatico | Create default location(s) per farm to absorb unorganized or migrated items. | x |

**User's choice:** Local padrao automatico.
**Notes:** The decision was refined to category-specific default locations.

| Option | Description | Selected |
|--------|-------------|----------|
| Espaco fisico simples | Name, location/description, and status. | |
| Espaco com capacidade | Location with capacity metadata and aggregate-friendly fields. | |
| Espaco por categoria fixa | Location accepts one inventory category only. | x |

**User's choice:** Espaco por categoria fixa.
**Notes:** Feed, vaccine, and packaging items should be kept in matching storage location categories.

---

## Inventory Traceability

| Option | Description | Selected |
|--------|-------------|----------|
| Minimo operacional | Name, quantity, unit, location, status. | |
| Compra e controle | Minimum plus supplier, cost, and entry date. | |
| Rastreabilidade completa | Purchase/control fields plus lot, expiration where applicable, minimum stock, and notes. | x |

**User's choice:** Rastreabilidade completa.
**Notes:** Expiration is required for vaccines and optional for feed/packaging.

| Option | Description | Selected |
|--------|-------------|----------|
| Campos comuns iguais em todas | Simpler schema but weak domain semantics. | |
| Campos comuns + especificos por tabela | Shared fields plus typed table-specific columns. | x |
| Campos comuns + JSON extra | Flexible but weak for typing, filters, and reports. | |

**User's choice:** Campos comuns + especificos por tabela.
**Notes:** This matches the specialization goal and avoids loose JSON/`any` patterns.

---

## Automatic Financial Expenses

| Option | Description | Selected |
|--------|-------------|----------|
| Na entrada/compra do estoque | Purchased inventory immediately creates an expense. | x |
| Na perda de estoque | Only stock losses create financial impact. | |
| Nos dois, com referencias diferentes | Purchases and losses both create financial transactions. | |

**User's choice:** Na entrada/compra do estoque.
**Notes:** Losses remain operational stock records and do not create new financial expenses by default.

| Option | Description | Selected |
|--------|-------------|----------|
| Trigger no banco | Database trigger creates or updates expense regardless of insert source. | x |
| Service no app | TypeScript service creates expenses, but direct DB inserts may bypass it. | |
| Manual pelo usuario | No automatic finance integration. | |

**User's choice:** Trigger no banco.
**Notes:** References should be idempotent, table-specific, and tied to the inventory item id.

| Option | Description | Selected |
|--------|-------------|----------|
| Atualizar a despesa automaticamente | Changes to purchase fields update the linked transaction. | x |
| Nao atualizar | Original transaction remains immutable. | |
| Criar ajuste separado | Changes create adjustment transactions. | |

**User's choice:** Atualizar a despesa automaticamente.
**Notes:** Keep one linked expense per purchased inventory item.

---

## Safe Storage Location Deletion

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear exclusao | Error until user moves or clears items. | |
| Arquivar/desativar local | Preserve history by marking location inactive. | x |
| Mover automaticamente para local padrao | Delete location and move items to default. | |

**User's choice:** Arquivar/desativar local.
**Notes:** Future UI can hide inactive locations by default.

| Option | Description | Selected |
|--------|-------------|----------|
| Permitir delete fisico | If no links exist, physical delete is allowed. | x |
| Sempre desativar | Never physically delete locations. | |
| Voce decide | Planner chooses simplest implementation. | |

**User's choice:** Permitir delete fisico.
**Notes:** Physical deletion is only allowed for totally empty locations with no history.

---

## Inventory Losses

| Option | Description | Selected |
|--------|-------------|----------|
| Motivos essenciais | Expiration, damage, manual adjustment, other. | |
| Motivos operacionais completos | Expiration, damage, contamination, humidity, sanitary disposal, manual adjustment, other. | x |
| Motivo livre | Free-text reason only. | |

**User's choice:** Motivos operacionais completos.
**Notes:** Controlled reasons support future alerts and reporting.

| Option | Description | Selected |
|--------|-------------|----------|
| Reduzir automaticamente | Loss reduces item quantity in the same operation. | x |
| So registrar historico | User adjusts stock separately. | |
| Depende do motivo | Some reasons reduce stock; manual adjustment may increase/decrease. | |

**User's choice:** Reduzir automaticamente.
**Notes:** Keeps balances reliable.

---

## the agent's Discretion

- Exact SQL function, trigger, enum, and helper names.
- The simplest typed linkage strategy for `inventory_losses`, provided it preserves table specificity and avoids loose JSON.
- Whether default storage locations are created through backfill, trigger, helper function, or service bootstrap.

## Deferred Ideas

None.
