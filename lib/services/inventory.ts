import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type StorageLocationRow = Tables<"storage_locations">;
export type FeedInventoryRow = Tables<"feed_inventory">;
export type MedicineInventoryRow = Tables<"medicine_inventory">;
export type PackagingInventoryRow = Tables<"packaging_inventory">;
export type EquipmentInventoryRow = Tables<"equipment_inventory">;
export type InventoryLossRow = Tables<"inventory_losses">;
export type InventoryCategory = "feed" | "medicine" | "packaging" | "equipment";

export type StorageLocationInput = {
  farm_id: string;
  name: string;
  category: StorageLocationRow["category"];
  status?: StorageLocationRow["status"];
  is_default?: boolean;
  notes?: string | null;
};

export type FeedInventoryCompatibilityRow = FeedInventoryRow & {
  category: string;
  type: string;
  location: string | null;
  location_id: string;
  arrival_date: string;
  inventory_table: InventoryCategory;
};

export type FeedInventoryCompatibilityInput = {
  farm_id: string;
  location_id?: string;
  name: string;
  category?: string | null;
  type?: string | null;
  feed_category?: string | null;
  feed_type?: string | null;
  quantity?: number;
  unit: string;
  status?: FeedInventoryRow["status"];
  supplier?: string | null;
  location?: string | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  inventory_value?: number | null;
  entry_date?: string | null;
  arrival_date?: string | null;
  lot_number?: string | null;
  minimum_quantity?: number;
  expiration_date?: string | null;
  notes?: string | null;
  inventory_table?: InventoryCategory;
};

type InventorySelectedRow = {
  id: string;
  created_at: string;
  updated_at: string;
  farm_id: string;
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  status: "normal" | "alerta" | "baixo";
  supplier: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  entry_date: string;
  lot_number: string | null;
  minimum_quantity: number;
  expiration_date: string | null;
  notes: string | null;
  storage_locations?: Pick<StorageLocationRow, "name"> | null;
  // Specific fields
  feed_category?: string | null;
  feed_type?: string | null;
  target_disease?: string | null;
  package_type?: string | null;
  equipment_category?: string | null;
  equipment_type?: string | null;
};

const DEFAULT_STORAGE_LOCATION_NAME = "Sem local definido";

function assertNonNegativeNumber(label: string, value: number | null | undefined): void {
  if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`${label} não pode ser negativo.`);
  }
}

function getPositivePurchaseCost(input: FeedInventoryCompatibilityInput): number {
  assertNonNegativeNumber("A quantidade", input.quantity);
  assertNonNegativeNumber("O custo unitário", input.unit_cost);
  assertNonNegativeNumber("O custo total", input.total_cost ?? input.inventory_value);

  const explicitTotal = input.total_cost ?? input.inventory_value;
  const calculatedTotal = (input.quantity ?? 0) * (input.unit_cost ?? 0);
  const purchaseCost = explicitTotal && explicitTotal > 0 ? explicitTotal : calculatedTotal;
  if (!Number.isFinite(purchaseCost) || purchaseCost <= 0) {
    throw new Error("Informe um custo total maior que zero para criar o item de estoque.");
  }

  return purchaseCost;
}

function getEntryDate(input: FeedInventoryCompatibilityInput) {
  return input.entry_date ?? input.arrival_date ?? new Date().toISOString().split("T")[0];
}

type InventoryInsert =
  | TablesInsert<"feed_inventory">
  | TablesInsert<"medicine_inventory">
  | TablesInsert<"packaging_inventory">
  | TablesInsert<"equipment_inventory">;

type InventoryUpdate =
  | TablesUpdate<"feed_inventory">
  | TablesUpdate<"medicine_inventory">
  | TablesUpdate<"packaging_inventory">
  | TablesUpdate<"equipment_inventory">;

function mapInventoryRow(row: InventorySelectedRow, table: InventoryCategory, defaultCategory: string): FeedInventoryCompatibilityRow {
  let category = defaultCategory;
  let type = "";

  if (table === "feed") {
    category = row.feed_category ?? defaultCategory;
    type = row.feed_type ?? "";
  } else if (table === "medicine") {
    type = row.target_disease ?? "";
  } else if (table === "packaging") {
    type = row.package_type ?? "";
  } else if (table === "equipment") {
    type = row.equipment_type ?? "";
  }

  const mappedRow = {
    ...row,
    feed_category: category,
    feed_type: type,
    category,
    type,
    location: row.storage_locations?.name ?? null,
    arrival_date: row.entry_date,
    inventory_table: table,
  };

  return mappedRow as FeedInventoryCompatibilityRow;
}

async function getOrCreateStorageLocation(
  farmId: string,
  category: StorageLocationRow["category"],
  preferredName?: string | null,
) {
  const supabase = createClient();
  const locationName = preferredName?.trim() || DEFAULT_STORAGE_LOCATION_NAME;

  const { data: existingLocation, error: lookupError } = await supabase
    .from("storage_locations")
    .select("*")
    .eq("farm_id", farmId)
    .eq("category", category)
    .eq("name", locationName)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingLocation) return existingLocation as StorageLocationRow;

  const { data: defaultLocation, error: defaultError } = await supabase
    .from("storage_locations")
    .select("*")
    .eq("farm_id", farmId)
    .eq("category", category)
    .eq("is_default", true)
    .maybeSingle();

  if (defaultError) throw defaultError;
  if (!preferredName?.trim() && defaultLocation) return defaultLocation as StorageLocationRow;

  const newLocation: TablesInsert<"storage_locations"> = {
    farm_id: farmId,
    name: locationName,
    category,
    is_default: !preferredName?.trim(),
  };

  const { data: createdLocation, error: createError } = await supabase
    .from("storage_locations")
    .insert(newLocation)
    .select("*")
    .single();

  if (createError) throw createError;
  return createdLocation as StorageLocationRow;
}

export async function getFeedInventory(farmId: string): Promise<FeedInventoryCompatibilityRow[]> {
  const supabase = createClient();
  
  const [feed, medicine, packaging, equipment] = await Promise.all([
    supabase.from("feed_inventory").select("*, storage_locations(name)").eq("farm_id", farmId),
    supabase.from("medicine_inventory").select("*, storage_locations(name)").eq("farm_id", farmId),
    supabase.from("packaging_inventory").select("*, storage_locations(name)").eq("farm_id", farmId),
    supabase.from("equipment_inventory").select("*, storage_locations(name)").eq("farm_id", farmId),
  ]);

  if (feed.error) throw feed.error;
  if (medicine.error) throw medicine.error;
  if (packaging.error) throw packaging.error;
  if (equipment.error) throw equipment.error;

  const items: FeedInventoryCompatibilityRow[] = [];

  if (feed.data) {
    items.push(...feed.data.map((row) => mapInventoryRow(row as unknown as InventorySelectedRow, "feed", "Ração")));
  }
  if (medicine.data) {
    items.push(...medicine.data.map((row) => mapInventoryRow(row as unknown as InventorySelectedRow, "medicine", "Medicamentos")));
  }
  if (packaging.data) {
    items.push(...packaging.data.map((row) => mapInventoryRow(row as unknown as InventorySelectedRow, "packaging", "Embalagens")));
  }
  if (equipment.data) {
    items.push(...equipment.data.map((row) => mapInventoryRow(row as unknown as InventorySelectedRow, "equipment", "Equipamentos")));
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStorageLocations(farmId: string): Promise<StorageLocationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("storage_locations")
    .select("*")
    .eq("farm_id", farmId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StorageLocationRow[];
}

export async function createStorageLocation(input: StorageLocationInput): Promise<StorageLocationRow> {
  const supabase = createClient();
  const newLocation: TablesInsert<"storage_locations"> = {
    farm_id: input.farm_id,
    name: input.name,
    category: input.category,
    status: input.status ?? "active",
    is_default: input.is_default ?? false,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from("storage_locations")
    .insert(newLocation)
    .select("*")
    .single();

  if (error) throw error;
  return data as StorageLocationRow;
}

export async function updateStorageLocation(
  id: string,
  updates: Partial<StorageLocationInput>,
): Promise<StorageLocationRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("storage_locations")
    .update({
      name: updates.name,
      category: updates.category,
      status: updates.status,
      is_default: updates.is_default,
      notes: updates.notes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as StorageLocationRow;
}

export async function deleteStorageLocation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("storage_locations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createInventoryItem(input: FeedInventoryCompatibilityInput) {
  const supabase = createClient();
  const table = input.inventory_table ?? "feed";
  const purchaseCost = getPositivePurchaseCost(input);
  
  let locationId = input.location_id;
  if (!locationId) {
    const loc = await getOrCreateStorageLocation(input.farm_id, table, input.location);
    locationId = loc.id;
  }

  const baseInsert = {
    farm_id: input.farm_id,
    location_id: locationId,
    name: input.name,
    quantity: input.quantity ?? 0,
    unit: input.unit,
    status: input.status ?? "normal",
    supplier: input.supplier ?? null,
    unit_cost: input.unit_cost ?? null,
    total_cost: purchaseCost,
    entry_date: getEntryDate(input),
    lot_number: input.lot_number ?? null,
    minimum_quantity: input.minimum_quantity ?? 0,
    expiration_date: input.expiration_date ?? null,
    notes: input.notes ?? null,
  };

  let insertData: InventoryInsert = {
    ...baseInsert,
    feed_category: input.feed_category ?? input.category,
    feed_type: input.feed_type ?? input.type,
  };

  if (table === "feed") {
    insertData = {
      ...baseInsert,
      feed_category: input.feed_category ?? input.category,
      feed_type: input.feed_type ?? input.type,
    };
  } else if (table === "medicine") {
    insertData = {
      ...baseInsert,
      quantity: input.quantity ?? 0,
      unit: input.unit,
      entry_date: getEntryDate(input),
      expiration_date: input.expiration_date ?? getEntryDate(input),
      target_disease: input.type,
    };
  } else if (table === "packaging") {
    insertData = {
      ...baseInsert,
      package_type: input.type,
    };
  } else if (table === "equipment") {
    insertData = {
      ...baseInsert,
      equipment_category: input.category,
      equipment_type: input.type,
      expiration_date: null,
    };
  }

  if (table === "feed") {
    const { data, error } = await supabase.from("feed_inventory").insert(insertData as TablesInsert<"feed_inventory">).select("*, storage_locations(name)").single();
    if (error) throw error;
    return mapInventoryRow(data as unknown as InventorySelectedRow, table, input.category || table);
  }

  if (table === "medicine") {
    const { data, error } = await supabase.from("medicine_inventory").insert(insertData as TablesInsert<"medicine_inventory">).select("*, storage_locations(name)").single();
    if (error) throw error;
    return mapInventoryRow(data as unknown as InventorySelectedRow, table, input.category || table);
  }

  if (table === "packaging") {
    const { data, error } = await supabase.from("packaging_inventory").insert(insertData as TablesInsert<"packaging_inventory">).select("*, storage_locations(name)").single();
    if (error) throw error;
    return mapInventoryRow(data as unknown as InventorySelectedRow, table, input.category || table);
  }

  const { data, error } = await supabase.from("equipment_inventory").insert(insertData as TablesInsert<"equipment_inventory">).select("*, storage_locations(name)").single();
  if (error) throw error;
  return mapInventoryRow(data as unknown as InventorySelectedRow, table, input.category || table);
}

export async function updateInventoryItem(id: string, updates: Partial<FeedInventoryCompatibilityInput>) {
  const supabase = createClient();
  const table = updates.inventory_table ?? "feed";

  assertNonNegativeNumber("A quantidade", updates.quantity);
  assertNonNegativeNumber("O custo unitário", updates.unit_cost);
  assertNonNegativeNumber("O custo total", updates.total_cost ?? updates.inventory_value);

  let locationId = updates.location_id;
  if (!locationId && updates.farm_id && updates.location !== undefined) {
    const loc = await getOrCreateStorageLocation(updates.farm_id, table, updates.location);
    locationId = loc.id;
  }

  const baseUpdate: InventoryUpdate = {
    name: updates.name,
    quantity: updates.quantity,
    unit: updates.unit,
    status: updates.status,
    supplier: updates.supplier,
    unit_cost: updates.unit_cost,
    total_cost: updates.total_cost ?? updates.inventory_value,
    entry_date: updates.entry_date ?? updates.arrival_date ?? undefined,
    lot_number: updates.lot_number,
    minimum_quantity: updates.minimum_quantity,
    expiration_date: updates.expiration_date,
    notes: updates.notes,
  };

  if (locationId) baseUpdate.location_id = locationId;

  if (table === "feed") {
    (baseUpdate as TablesUpdate<"feed_inventory">).feed_category = updates.feed_category ?? updates.category ?? updates.type;
    (baseUpdate as TablesUpdate<"feed_inventory">).feed_type = updates.feed_type ?? updates.type ?? updates.category;
  } else if (table === "medicine") {
    (baseUpdate as TablesUpdate<"medicine_inventory">).target_disease = updates.type;
  } else if (table === "packaging") {
    (baseUpdate as TablesUpdate<"packaging_inventory">).package_type = updates.type;
  } else if (table === "equipment") {
    (baseUpdate as TablesUpdate<"equipment_inventory">).equipment_category = updates.category;
    (baseUpdate as TablesUpdate<"equipment_inventory">).equipment_type = updates.type;
    baseUpdate.expiration_date = null;
  }

  const cleanUpdate = Object.fromEntries(
    Object.entries(baseUpdate).filter(([, value]) => value !== undefined),
  );

  if (table === "feed") {
    const { data, error } = await supabase.from("feed_inventory").update(cleanUpdate as TablesUpdate<"feed_inventory">).eq("id", id).select("*, storage_locations(name)").single();
    if (error) throw error;
    return mapInventoryRow(data as unknown as InventorySelectedRow, table, updates.category || table);
  }

  if (table === "medicine") {
    const { data, error } = await supabase.from("medicine_inventory").update(cleanUpdate as TablesUpdate<"medicine_inventory">).eq("id", id).select("*, storage_locations(name)").single();
    if (error) throw error;
    return mapInventoryRow(data as unknown as InventorySelectedRow, table, updates.category || table);
  }

  if (table === "packaging") {
    const { data, error } = await supabase.from("packaging_inventory").update(cleanUpdate as TablesUpdate<"packaging_inventory">).eq("id", id).select("*, storage_locations(name)").single();
    if (error) throw error;
    return mapInventoryRow(data as unknown as InventorySelectedRow, table, updates.category || table);
  }

  const { data, error } = await supabase.from("equipment_inventory").update(cleanUpdate as TablesUpdate<"equipment_inventory">).eq("id", id).select("*, storage_locations(name)").single();
  if (error) throw error;
  return mapInventoryRow(data as unknown as InventorySelectedRow, table, updates.category || table);
}

export async function deleteInventoryItem(id: string, table: InventoryCategory = "feed") {
  const supabase = createClient();

  if (table === "feed") {
    const { error } = await supabase.from("feed_inventory").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  if (table === "medicine") {
    const { error } = await supabase.from("medicine_inventory").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  if (table === "packaging") {
    const { error } = await supabase.from("packaging_inventory").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("equipment_inventory").delete().eq("id", id);
  if (error) throw error;
}
