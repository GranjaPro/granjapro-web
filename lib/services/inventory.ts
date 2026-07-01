import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type StorageLocationRow = Tables<"storage_locations">;
export type FeedInventoryRow = Tables<"feed_inventory">;
export type VaccineInventoryRow = Tables<"vaccine_inventory">;
export type PackagingInventoryRow = Tables<"packaging_inventory">;
export type InventoryLossRow = Tables<"inventory_losses">;
export type StorageLocationInput = {
  farm_id: string;
  name: string;
  category: StorageLocationRow["category"];
  status?: StorageLocationRow["status"];
  is_default?: boolean;
  notes?: string | null;
};

export type InventoryLossInput = {
  farm_id: string;
  feed_inventory_id: string;
  location_id: string;
  quantity: number;
  reason: InventoryLossRow["reason"];
  notes?: string | null;
};

export type FeedInventoryCompatibilityRow = FeedInventoryRow & {
  category: string;
  type: string;
  location: string | null;
  location_id: string;
  arrival_date: string;
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
};

type FeedInventorySelectedRow = FeedInventoryRow & {
  storage_locations?: Pick<StorageLocationRow, "name"> | null;
};

const DEFAULT_FEED_LOCATION_NAME = "Sem local definido - Racao";
const DEFAULT_STORAGE_LOCATION_NAME = "Sem local definido";

function isMissingSpecializedInventoryTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table 'public.feed_inventory'") === true
  );
}

function getFeedCategory(input: FeedInventoryCompatibilityInput) {
  return input.feed_category ?? input.category ?? input.type ?? "Racao";
}

function getFeedType(input: FeedInventoryCompatibilityInput) {
  return input.feed_type ?? input.type ?? input.category ?? "racao";
}

function getEntryDate(input: FeedInventoryCompatibilityInput) {
  return input.entry_date ?? input.arrival_date ?? new Date().toISOString().split("T")[0];
}

function mapFeedInventoryRow(row: FeedInventorySelectedRow): FeedInventoryCompatibilityRow {
  const feedType = row.feed_type ?? row.feed_category ?? "racao";

  return {
    ...row,
    category: row.feed_category ?? feedType,
    type: feedType,
    location: row.storage_locations?.name ?? null,
    arrival_date: row.entry_date,
  };
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

  const { data: legacyFeedLocation, error: legacyLookupError } = await supabase
    .from("storage_locations")
    .select("*")
    .eq("farm_id", farmId)
    .eq("category", category)
    .eq("name", DEFAULT_FEED_LOCATION_NAME)
    .maybeSingle();

  if (legacyLookupError) throw legacyLookupError;
  if (!preferredName?.trim() && legacyFeedLocation) return legacyFeedLocation as StorageLocationRow;

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

async function getOrCreateFeedLocation(farmId: string, preferredName?: string | null) {
  return getOrCreateStorageLocation(farmId, "feed", preferredName);
}

function normalizeFeedInsert(input: FeedInventoryCompatibilityInput, locationId: string): TablesInsert<"feed_inventory"> {
  const totalCost = input.total_cost ?? input.inventory_value ?? null;

  return {
    farm_id: input.farm_id,
    location_id: locationId,
    name: input.name,
    feed_category: getFeedCategory(input),
    feed_type: getFeedType(input),
    quantity: input.quantity ?? 0,
    unit: input.unit,
    status: input.status ?? "normal",
    supplier: input.supplier ?? null,
    unit_cost: input.unit_cost ?? null,
    total_cost: totalCost,
    entry_date: getEntryDate(input),
    lot_number: input.lot_number ?? null,
    minimum_quantity: input.minimum_quantity ?? 0,
    expiration_date: input.expiration_date ?? null,
    notes: input.notes ?? null,
  };
}

function normalizeFeedUpdate(input: Partial<FeedInventoryCompatibilityInput>, locationId?: string): TablesUpdate<"feed_inventory"> {
  const update: TablesUpdate<"feed_inventory"> = {
    name: input.name,
    feed_category: input.feed_category ?? input.category ?? input.type,
    feed_type: input.feed_type ?? input.type ?? input.category,
    quantity: input.quantity,
    unit: input.unit,
    status: input.status,
    supplier: input.supplier,
    unit_cost: input.unit_cost,
    total_cost: input.total_cost ?? input.inventory_value,
    entry_date: input.entry_date ?? input.arrival_date ?? undefined,
    lot_number: input.lot_number,
    minimum_quantity: input.minimum_quantity,
    expiration_date: input.expiration_date,
    notes: input.notes,
  };

  if (locationId) update.location_id = locationId;

  return Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined),
  ) as TablesUpdate<"feed_inventory">;
}

export async function getFeedInventory(farmId: string): Promise<FeedInventoryCompatibilityRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .select("*, storage_locations(name)")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });

  if (error) {
    if (isMissingSpecializedInventoryTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as FeedInventorySelectedRow[]).map(mapFeedInventoryRow);
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
  const location = input.location_id
    ? ({ id: input.location_id } as Pick<StorageLocationRow, "id">)
    : await getOrCreateFeedLocation(input.farm_id, input.location);

  const { data, error } = await supabase
    .from("feed_inventory")
    .insert(normalizeFeedInsert(input, location.id))
    .select("*, storage_locations(name)")
    .single();

  if (error) {
    if (isMissingSpecializedInventoryTable(error)) {
      throw new Error("O estoque de racao ainda nao esta disponivel no banco deste projeto.");
    }
    throw error;
  }

  return mapFeedInventoryRow(data as FeedInventorySelectedRow);
}

export async function updateInventoryItem(id: string, updates: Partial<FeedInventoryCompatibilityInput>) {
  const supabase = createClient();
  const location = updates.location_id
    ? ({ id: updates.location_id } as Pick<StorageLocationRow, "id">)
    : updates.farm_id && updates.location !== undefined
      ? await getOrCreateFeedLocation(updates.farm_id, updates.location)
      : undefined;

  const { data, error } = await supabase
    .from("feed_inventory")
    .update(normalizeFeedUpdate(updates, location?.id))
    .eq("id", id)
    .select("*, storage_locations(name)")
    .single();

  if (error) {
    if (isMissingSpecializedInventoryTable(error)) {
      throw new Error("O estoque de racao ainda nao esta disponivel no banco deste projeto.");
    }
    throw error;
  }

  return mapFeedInventoryRow(data as FeedInventorySelectedRow);
}

export async function deleteInventoryItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feed_inventory")
    .delete()
    .eq("id", id);

  if (error) {
    if (isMissingSpecializedInventoryTable(error)) {
      throw new Error("O estoque de racao ainda nao esta disponivel no banco deste projeto.");
    }
    throw error;
  }
}

export async function recordInventoryLoss(input: InventoryLossInput): Promise<InventoryLossRow> {
  const supabase = createClient();
  const newLoss: TablesInsert<"inventory_losses"> = {
    farm_id: input.farm_id,
    location_id: input.location_id,
    inventory_type: "feed",
    feed_inventory_id: input.feed_inventory_id,
    quantity: input.quantity,
    reason: input.reason,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from("inventory_losses")
    .insert(newLoss)
    .select("*")
    .single();

  if (error) throw error;
  return data as InventoryLossRow;
}
