"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Box,
  CalendarDays,
  Check,
  MapPin,
  Package,
  Pencil,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Warehouse,
  Wheat,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import {
  createInventoryItem,
  createStorageLocation,
  deleteInventoryItem,
  deleteStorageLocation,
  getFeedInventory,
  getStorageLocations,
  recordInventoryLoss,
  updateInventoryItem,
  updateStorageLocation,
  type FeedInventoryCompatibilityRow,
  type InventoryLossRow,
  type StorageLocationRow,
} from "@/lib/services/inventory";

type ActiveTab = "all" | "feed" | "medicine" | "equipment" | "packaging";
type StorageModalMode = "add" | "edit" | null;
type FeedModalMode = "add" | "edit" | null;
type DeleteTarget =
  | { type: "storage"; id: string; name: string }
  | { type: "feed"; id: string; name: string }
  | null;

type StorageCategory = StorageLocationRow["category"];
type StorageStatus = StorageLocationRow["status"];
type LossReason = InventoryLossRow["reason"];

type StorageForm = {
  name: string;
  category: StorageCategory | "equipment";
  status: StorageStatus;
  isDefault: boolean;
  capacityQuantity: string;
  capacityUnit: string;
};

type FeedForm = {
  name: string;
  locationId: string;
  feedCategory: string;
  feedType: string;
  quantity: string;
  unit: string;
  supplier: string;
  unitCost: string;
  totalCost: string;
  expirationDate: string;
  notes: string;
};

type AdjustmentForm = {
  quantity: string;
  reason: LossReason;
  notes: string;
};

const emptyStorageForm: StorageForm = {
  name: "",
  category: "feed",
  status: "active",
  isDefault: false,
  capacityQuantity: "",
  capacityUnit: "kg",
};

const emptyFeedForm: FeedForm = {
  name: "",
  locationId: "",
  feedCategory: "",
  feedType: "comercial",
  quantity: "",
  unit: "kg",
  supplier: "",
  unitCost: "",
  totalCost: "",
  expirationDate: "",
  notes: "",
};

const emptyAdjustmentForm: AdjustmentForm = {
  quantity: "",
  reason: "manual_adjustment",
  notes: "",
};

const storageCategoryLabels: Record<StorageCategory, string> = {
  feed: "Racao",
  vaccine: "Vacinas",
  packaging: "Embalagens",
};

const inventoryTabs: Array<{ key: ActiveTab; label: string; icon: typeof Package }> = [
  { key: "all", label: "Todos", icon: Package },
  { key: "feed", label: "Racao", icon: Wheat },
  { key: "medicine", label: "Medicamentos", icon: Pill },
  { key: "equipment", label: "Equipamentos", icon: Wrench },
  { key: "packaging", label: "Embalagens", icon: Box },
];

const storageStatusLabels: Record<StorageStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const feedStatusLabels: Record<FeedInventoryCompatibilityRow["status"], string> = {
  normal: "Normal",
  alerta: "Alerta",
  baixo: "Baixo",
};

const lossReasonLabels: Record<LossReason, string> = {
  expiration: "Vencimento",
  damage: "Dano",
  contamination: "Contaminacao",
  humidity: "Umidade",
  sanitary_disposal: "Descarte sanitario",
  manual_adjustment: "Ajuste manual",
  other: "Outro",
};

const feedLocationsOnly = (location: StorageLocationRow) => location.category === "feed";
const DEFAULT_LOCATION_NAME = "Sem local definido";

type StorageCapacity = {
  quantity: string;
  unit: string;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numberOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getFeedStockPercent(item: FeedInventoryCompatibilityRow) {
  const minimumQuantity = Number(item.minimum_quantity);
  const quantity = Number(item.quantity);
  if (minimumQuantity <= 0) return quantity > 0 ? 100 : 0;
  return Math.min(100, Math.round((quantity / minimumQuantity) * 100));
}

function daysUntil(date: string | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function parseStorageCapacity(notes: string | null): StorageCapacity {
  if (!notes) return { quantity: "", unit: "kg" };

  try {
    const parsed: unknown = JSON.parse(notes);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "quantity" in parsed &&
      "unit" in parsed &&
      typeof parsed.quantity === "string" &&
      typeof parsed.unit === "string"
    ) {
      return { quantity: parsed.quantity, unit: parsed.unit };
    }
  } catch {
    return { quantity: notes, unit: "" };
  }

  return { quantity: notes, unit: "" };
}

function serializeStorageCapacity(form: StorageForm) {
  if (!form.capacityQuantity.trim()) return null;
  return JSON.stringify({
    quantity: form.capacityQuantity.trim(),
    unit: form.capacityUnit.trim() || "un",
  });
}

function formatStorageCapacity(notes: string | null) {
  const capacity = parseStorageCapacity(notes);
  if (!capacity.quantity) return "Nao informada";
  return `${capacity.quantity}${capacity.unit ? ` ${capacity.unit}` : ""}`;
}

function isDefaultStorageLocation(location: StorageLocationRow) {
  return location.is_default || location.name.toLowerCase().startsWith(DEFAULT_LOCATION_NAME.toLowerCase());
}

export default function EstoquePage() {
  const { farm } = useAuth();
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [search, setSearch] = useState("");
  const [storageLocations, setStorageLocations] = useState<StorageLocationRow[]>([]);
  const [feedItems, setFeedItems] = useState<FeedInventoryCompatibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storageModal, setStorageModal] = useState<StorageModalMode>(null);
  const [feedModal, setFeedModal] = useState<FeedModalMode>(null);
  const [storageForm, setStorageForm] = useState<StorageForm>(emptyStorageForm);
  const [feedForm, setFeedForm] = useState<FeedForm>(emptyFeedForm);
  const [editingStorage, setEditingStorage] = useState<StorageLocationRow | null>(null);
  const [editingFeed, setEditingFeed] = useState<FeedInventoryCompatibilityRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [adjustingFeed, setAdjustingFeed] = useState<FeedInventoryCompatibilityRow | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(emptyAdjustmentForm);
  const [lowStockThreshold, setLowStockThreshold] = useState("25");
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const feedLocations = useMemo(() => storageLocations.filter(feedLocationsOnly), [storageLocations]);

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) return;

    setLoading(true);
    try {
      const [locations, feed] = await Promise.all([
        getStorageLocations(currentFarm.id),
        getFeedInventory(currentFarm.id),
      ]);
      setStorageLocations(locations);
      setFeedItems(feed);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const savedThreshold = window.localStorage.getItem("inventoryLowStockThreshold");
    if (savedThreshold) setLowStockThreshold(savedThreshold);
  }, []);

  const visibleStorageLocations = storageLocations.filter((location) => {
    if (activeTab === "feed") return location.category === "feed";
    if (activeTab === "medicine") return location.category === "vaccine";
    if (activeTab === "packaging") return location.category === "packaging";
    if (activeTab === "equipment") return location.category === ("equipment" as any); // allow if it exists
    return true;
  });

  const filteredStorage = visibleStorageLocations.filter((location) => {
    const normalizedSearch = search.toLowerCase();
    return (
      location.name.toLowerCase().includes(normalizedSearch) ||
      storageCategoryLabels[location.category].toLowerCase().includes(normalizedSearch)
    );
  });

  const visibleFeedItems = activeTab === "all" || activeTab === "feed" ? feedItems : [];
  const filteredFeed = visibleFeedItems.filter((item) => {
    const normalizedSearch = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(normalizedSearch) ||
      (item.location ?? "").toLowerCase().includes(normalizedSearch) ||
      (item.feed_category ?? "").toLowerCase().includes(normalizedSearch)
    );
  });

  const totalFeedValue = feedItems.reduce((sum, item) => sum + Number(item.total_cost ?? 0), 0);
  const thresholdPercent = numberOrUndefined(lowStockThreshold) ?? 25;
  const lowStockCount = feedItems.filter((item) => getFeedStockPercent(item) <= thresholdPercent).length;
  const activeStorageCount = storageLocations.filter((location) => location.status === "active").length;
  const averageOccupancy = feedItems.length > 0
    ? Math.round(feedItems.reduce((sum, item) => sum + getFeedStockPercent(item), 0) / feedItems.length)
    : 0;
  const expiringFeedItems = feedItems
    .filter((item) => item.expiration_date)
    .map((item) => ({ item, days: daysUntil(item.expiration_date) }))
    .sort((left, right) => left.days - right.days);
  const expiringSoonCount = expiringFeedItems.filter(({ days }) => days <= 30).length;
  const alertCount = lowStockCount + expiringSoonCount;

  function openAddStorage() {
    setStorageForm(emptyStorageForm);
    setEditingStorage(null);
    setStorageModal("add");
  }

  function openEditStorage(location: StorageLocationRow) {
    const capacity = parseStorageCapacity(location.notes);
    setStorageForm({
      name: location.name,
      category: location.category,
      status: location.status,
      isDefault: location.is_default,
      capacityQuantity: capacity.quantity,
      capacityUnit: capacity.unit || "kg",
    });
    setEditingStorage(location);
    setStorageModal("edit");
  }

  function openAddFeed() {
    setFeedForm({ ...emptyFeedForm, locationId: "" });
    setEditingFeed(null);
    setFeedModal("add");
  }

  function openEditFeed(item: FeedInventoryCompatibilityRow) {
    setFeedForm({
      name: item.name,
      locationId: item.location_id,
      feedCategory: item.feed_category ?? "",
      feedType: item.feed_type ?? "comercial",
      quantity: String(item.quantity),
      unit: item.unit,
      supplier: item.supplier ?? "",
      unitCost: item.unit_cost === null ? "" : String(item.unit_cost),
      totalCost: item.total_cost === null ? "" : String(item.total_cost),
      expirationDate: item.expiration_date ?? "",
      notes: item.notes ?? "",
    });
    setEditingFeed(item);
    setFeedModal("edit");
  }

  function openAdjustFeed(item: FeedInventoryCompatibilityRow) {
    setAdjustingFeed(item);
    setAdjustmentForm(emptyAdjustmentForm);
  }

  async function saveStorageLocation() {
    const currentFarm = farmRef.current;
    const trimmedName = storageForm.name.trim();
    if (!currentFarm || !trimmedName) return;

    setSaving(true);
    try {
      const payload = {
        farm_id: currentFarm.id,
        name: trimmedName,
        category: storageForm.category,
        status: storageForm.status,
        is_default: storageForm.isDefault,
        notes: serializeStorageCapacity(storageForm),
      };

      if (storageModal === "add") {
        await createStorageLocation(payload);
      } else if (editingStorage) {
        await updateStorageLocation(editingStorage.id, payload);
      }

      setStorageModal(null);
      await fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function saveFeedItem() {
    const currentFarm = farmRef.current;
    const trimmedName = feedForm.name.trim();
    if (!currentFarm || !trimmedName) return;

    setSaving(true);
    try {
      const payload = {
        farm_id: currentFarm.id,
        name: trimmedName,
        location_id: feedForm.locationId || undefined,
        feed_category: feedForm.feedCategory.trim() || null,
        feed_type: feedForm.feedType.trim() || null,
        quantity: numberOrUndefined(feedForm.quantity) ?? 0,
        unit: feedForm.unit,
        status: "normal" as const,
        supplier: feedForm.supplier.trim() || null,
        unit_cost: numberOrUndefined(feedForm.unitCost) ?? null,
        total_cost: numberOrUndefined(feedForm.totalCost) ?? null,
        lot_number: null,
        minimum_quantity: 0,
        expiration_date: feedForm.expirationDate || null,
        notes: feedForm.notes.trim() || null,
      };

      if (feedModal === "add") {
        await createInventoryItem(payload);
      } else if (editingFeed) {
        await updateInventoryItem(editingFeed.id, payload);
      }

      setFeedModal(null);
      await fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      if (deleteTarget.type === "storage") {
        const location = storageLocations.find((item) => item.id === deleteTarget.id);
        if (location && isDefaultStorageLocation(location)) {
          setDeleteTarget(null);
          return;
        }
        await deleteStorageLocation(deleteTarget.id);
      } else {
        await deleteInventoryItem(deleteTarget.id);
      }
      setDeleteTarget(null);
      await fetchData();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Erro ao excluir o item. Ele pode estar sendo referenciado em outros registros.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAdjustment() {
    const currentFarm = farmRef.current;
    const quantity = numberOrUndefined(adjustmentForm.quantity) ?? 0;
    if (!currentFarm || !adjustingFeed || quantity <= 0) return;

    setSaving(true);
    try {
      await recordInventoryLoss({
        farm_id: currentFarm.id,
        feed_inventory_id: adjustingFeed.id,
        location_id: adjustingFeed.location_id,
        quantity,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes.trim() || null,
      });
      setAdjustingFeed(null);
      await fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  const canCreateFeedItem = activeTab === "all" || activeTab === "feed";
  const actionLabel = canCreateFeedItem ? "Novo Item" : "Novo Local";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 shadow-lg shadow-brand-500/20">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Estoque</h1>
            <p className="mt-0.5 text-sm text-gray-500">Gerencie locais de armazenamento e estoque de racao</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={openAddStorage}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Warehouse className="h-4 w-4" />
            Novo Local
          </button>
          <button
            type="button"
            onClick={canCreateFeedItem ? openAddFeed : openAddStorage}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <MetricCard icon={Package} label="Valor em estoque" value={formatCurrency(totalFeedValue)} />
        <MetricCard icon={Warehouse} label="Espacos" value={`${activeStorageCount}/${storageLocations.length}`} />
        <MetricCard icon={Box} label="Ocupacao" value={`${averageOccupancy}%`} tone={averageOccupancy <= thresholdPercent ? "warning" : "neutral"} />
        <MetricCard icon={ShieldAlert} label="Alertas" value={String(alertCount)} tone={alertCount > 0 ? "warning" : "ok"} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 sm:w-auto">
          {inventoryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex min-w-28 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 transition-all focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/20 sm:ml-auto sm:w-80">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar estoque..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setThresholdModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Alerta {thresholdPercent}%
        </button>
      </div>

      <InventoryContent
        activeTab={activeTab}
        loading={loading}
        storageLocations={filteredStorage}
        feedItems={filteredFeed}
        feedLocations={feedLocations}
        lowStockThreshold={thresholdPercent}
        onEditStorage={openEditStorage}
        onDeleteStorage={(location) => setDeleteTarget({ type: "storage", id: location.id, name: location.name })}
        onEditFeed={openEditFeed}
        onAdjustFeed={openAdjustFeed}
        onDeleteFeed={(item) => setDeleteTarget({ type: "feed", id: item.id, name: item.name })}
      />

      {storageModal && (
        <StorageLocationModal
          mode={storageModal}
          form={storageForm}
          saving={saving}
          onChange={setStorageForm}
          onClose={() => setStorageModal(null)}
          onSave={saveStorageLocation}
        />
      )}

      {feedModal && (
        <FeedItemModal
          mode={feedModal}
          form={feedForm}
          locations={feedLocations}
          saving={saving}
          onChange={setFeedForm}
          onClose={() => setFeedModal(null)}
          onSave={saveFeedItem}
        />
      )}

      {adjustingFeed && (
        <AdjustmentModal
          item={adjustingFeed}
          form={adjustmentForm}
          saving={saving}
          onChange={setAdjustmentForm}
          onClose={() => setAdjustingFeed(null)}
          onSave={saveAdjustment}
        />
      )}

      {errorMessage && (
        <ModalShell title="Atenção" onClose={() => setErrorMessage(null)} size="sm">
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {errorMessage}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setErrorMessage(null)}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        </ModalShell>
      )}

      {thresholdModalOpen && (
        <LowStockThresholdModal
          value={lowStockThreshold}
          saving={saving}
          onChange={setLowStockThreshold}
          onClose={() => setThresholdModalOpen(false)}
          onSave={() => {
            window.localStorage.setItem("inventoryLowStockThreshold", lowStockThreshold);
            setThresholdModalOpen(false);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          saving={saving}
          onClose={() => setDeleteTarget(null)}
          onDelete={deleteSelected}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Package;
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "ok";
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-gray-200 hover:shadow-lg hover:shadow-gray-200/50">
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            tone === "warning" && "bg-amber-50",
            tone === "ok" && "bg-emerald-50",
            tone === "neutral" && "bg-brand-50",
          )}
        >
          <Icon
            className={cn(
              "h-4.5 w-4.5",
              tone === "warning" && "text-amber-600",
              tone === "ok" && "text-emerald-600",
              tone === "neutral" && "text-brand-600",
            )}
          />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold leading-none tracking-tight text-gray-900">{value}</p>
    </div>
  );
}

function InventoryContent({
  activeTab,
  loading,
  storageLocations,
  feedItems,
  feedLocations,
  lowStockThreshold,
  onEditStorage,
  onDeleteStorage,
  onEditFeed,
  onAdjustFeed,
  onDeleteFeed,
}: {
  activeTab: ActiveTab;
  loading: boolean;
  storageLocations: StorageLocationRow[];
  feedItems: FeedInventoryCompatibilityRow[];
  feedLocations: StorageLocationRow[];
  lowStockThreshold: number;
  onEditStorage: (location: StorageLocationRow) => void;
  onDeleteStorage: (location: StorageLocationRow) => void;
  onEditFeed: (item: FeedInventoryCompatibilityRow) => void;
  onAdjustFeed: (item: FeedInventoryCompatibilityRow) => void;
  onDeleteFeed: (item: FeedInventoryCompatibilityRow) => void;
}) {
  if (activeTab === "medicine" || activeTab === "equipment" || activeTab === "packaging") {
    return (
      <StorageTab
        loading={loading}
        locations={storageLocations}
        onEdit={onEditStorage}
        onDelete={onDeleteStorage}
      />
    );
  }

  return (
    <div className="space-y-5">
      {activeTab === "all" && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Locais de armazenamento</h2>
          <StorageTab loading={loading} locations={storageLocations} onEdit={onEditStorage} onDelete={onDeleteStorage} compact />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900">{activeTab === "feed" ? "Racao" : "Itens de estoque"}</h2>
        <FeedTab
          loading={loading}
          items={feedItems}
          locations={feedLocations}
          lowStockThreshold={lowStockThreshold}
          onEdit={onEditFeed}
          onAdjust={onAdjustFeed}
          onDelete={onDeleteFeed}
        />
      </section>
    </div>
  );
}

function StorageTab({
  loading,
  locations,
  onEdit,
  onDelete,
  compact = false,
}: {
  loading: boolean;
  locations: StorageLocationRow[];
  onEdit: (location: StorageLocationRow) => void;
  onDelete: (location: StorageLocationRow) => void;
  compact?: boolean;
}) {
  if (loading) return <EmptyState text="Carregando locais..." />;
  if (locations.length === 0) return <EmptyState text="Nenhum local encontrado." />;

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", compact ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {locations.map((location) => (
        <div key={location.id} className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-gray-200 hover:shadow-lg hover:shadow-gray-200/50">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <Warehouse className="h-5 w-5 text-brand-600" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-gray-900">{location.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{storageCategoryLabels[location.category]}</p>
              </div>
            </div>
            <CardActions
              onEdit={() => onEdit(location)}
              onDelete={() => onDelete(location)}
              deleteDisabled={isDefaultStorageLocation(location)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone={location.status === "active" ? "ok" : "muted"}>{storageStatusLabels[location.status]}</Badge>
            {location.is_default && <Badge tone="brand">Padrao</Badge>}
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Capacidade</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{formatStorageCapacity(location.notes)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedTab({
  loading,
  items,
  locations,
  lowStockThreshold,
  onEdit,
  onAdjust,
  onDelete,
}: {
  loading: boolean;
  items: FeedInventoryCompatibilityRow[];
  locations: StorageLocationRow[];
  lowStockThreshold: number;
  onEdit: (item: FeedInventoryCompatibilityRow) => void;
  onAdjust: (item: FeedInventoryCompatibilityRow) => void;
  onDelete: (item: FeedInventoryCompatibilityRow) => void;
}) {
  if (loading) return <EmptyState text="Carregando racao..." />;
  if (locations.length === 0) return <EmptyState text="Cadastre um local de racao antes de criar itens." />;
  if (items.length === 0) return <EmptyState text="Nenhum item de racao encontrado." />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const stockPercent = getFeedStockPercent(item);
        const isLow = stockPercent <= lowStockThreshold;
        return (
          <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-gray-200 hover:shadow-lg hover:shadow-gray-200/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <Wheat className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-gray-900">{item.name}</h3>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{item.location || "Sem local"}</span>
                  </div>
                </div>
              </div>
              <CardActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 px-3 py-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quantidade</p>
                <p className="mt-1 text-sm font-bold text-gray-900">
                  {Number(item.quantity).toLocaleString("pt-BR")} <span className="text-[10px] text-gray-400">{item.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Valor</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(Number(item.total_cost ?? 0))}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={isLow ? "warning" : "ok"}>{isLow ? `Estoque baixo (${stockPercent}%)` : feedStatusLabels[item.status]}</Badge>
              <Badge tone="muted">{item.feed_category || "Racao"}</Badge>
              {item.expiration_date && <Badge tone="muted">Vence {new Date(`${item.expiration_date}T00:00:00`).toLocaleDateString("pt-BR")}</Badge>}
            </div>

          </div>
        );
      })}
    </div>
  );
}

function CardActions({
  onEdit,
  onDelete,
  deleteDisabled = false,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteDisabled ? "Locais padrao nao podem ser excluidos" : "Excluir"}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "brand" | "muted" | "ok" | "warning" }) {
  return (
    <span
      className={cn(
        "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
        tone === "brand" && "bg-brand-50 text-brand-700",
        tone === "muted" && "bg-gray-100 text-gray-500",
        tone === "ok" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-sm text-gray-400">{text}</div>;
}

function StorageLocationModal({
  mode,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  mode: Exclude<StorageModalMode, null>;
  form: StorageForm;
  saving: boolean;
  onChange: (form: StorageForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell title={mode === "add" ? "Novo local de armazenamento" : "Editar local"} onClose={onClose}>
      <div className="space-y-4">
        <TextField label="Nome" value={form.name} onChange={(name) => onChange({ ...form, name })} placeholder="Ex: Silo principal" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Categoria"
            value={form.category}
            onChange={(category) => onChange({ ...form, category: category as StorageCategory })}
            options={[
              ["feed", "Racao"],
              ["vaccine", "Vacinas"],
              ["packaging", "Embalagens"],
            ]}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(status) => onChange({ ...form, status: status as StorageStatus })}
            options={[
              ["active", "Ativo"],
              ["inactive", "Inativo"],
            ]}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Quantidade da capacidade"
            type="number"
            value={form.capacityQuantity}
            onChange={(capacityQuantity) => onChange({ ...form, capacityQuantity })}
            placeholder="Ex: 50"
          />
          <SelectField
            label="Unidade da capacidade"
            value={form.capacityUnit}
            onChange={(capacityUnit) => onChange({ ...form, capacityUnit })}
            options={[
              ["kg", "kg"],
              ["g", "g"],
              ["mg", "mg"],
              ["l", "l"],
              ["ml", "ml"],
              ["un", "un"],
            ]}
          />
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={form.isDefault} onChange={(event) => onChange({ ...form, isDefault: event.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
          Local padrao desta categoria
        </label>
      </div>
      <ModalActions saving={saving} onClose={onClose} onSave={onSave} />
    </ModalShell>
  );
}

function FeedItemModal({
  mode,
  form,
  locations,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  mode: Exclude<FeedModalMode, null>;
  form: FeedForm;
  locations: StorageLocationRow[];
  saving: boolean;
  onChange: (form: FeedForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell title={mode === "add" ? "Novo item de racao" : "Editar item de racao"} onClose={onClose}>
      <div className="space-y-4">
        <TextField label="Nome" value={form.name} onChange={(name) => onChange({ ...form, name })} placeholder="Ex: Racao postura" />
        <SelectField
          label="Local de armazenamento"
          value={form.locationId}
          onChange={(locationId) => onChange({ ...form, locationId })}
          options={[
            ["", "Sem local definido"],
            ...locations.map((location) => [location.id, location.name] as [string, string]),
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Categoria" value={form.feedCategory} onChange={(feedCategory) => onChange({ ...form, feedCategory })} placeholder="Ex: Postura" />
          <SelectField
            label="Tipo"
            value={form.feedType}
            onChange={(feedType) => onChange({ ...form, feedType })}
            options={[
              ["comercial", "Comercial"],
              ["milho_mix", "Milho Mix"],
              ["formula_custom", "Fórmula Custom"],
              ["soja_blend", "Soja Blend"],
            ]}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Quantidade" type="number" value={form.quantity} onChange={(quantity) => onChange({ ...form, quantity })} placeholder="0" />
          <SelectField
            label="Unidade"
            value={form.unit}
            onChange={(unit) => onChange({ ...form, unit })}
            options={[
              ["kg", "kg"],
              ["g", "g"],
              ["mg", "mg"],
              ["l", "l"],
              ["ml", "ml"],
              ["un", "un"],
            ]}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Custo unitario" type="number" value={form.unitCost} onChange={(unitCost) => {
            const numUnit = Number(unitCost);
            const numQty = Number(form.quantity);
            const total = numQty > 0 && numUnit > 0 ? (numUnit * numQty).toFixed(2) : form.totalCost;
            onChange({ ...form, unitCost, totalCost: total });
          }} placeholder="0,00" />
          <TextField label="Valor total" type="number" value={form.totalCost} onChange={(totalCost) => {
            const numTotal = Number(totalCost);
            const numQty = Number(form.quantity);
            const unit = numQty > 0 && numTotal > 0 ? (numTotal / numQty).toFixed(2) : form.unitCost;
            onChange({ ...form, totalCost, unitCost: unit });
          }} placeholder="0,00" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Fornecedor" value={form.supplier} onChange={(supplier) => onChange({ ...form, supplier })} placeholder="Opcional" />
          <TextField label="Vencimento" type="date" value={form.expirationDate} onChange={(expirationDate) => onChange({ ...form, expirationDate })} />
        </div>
        <TextArea label="Observacoes" value={form.notes} onChange={(notes) => onChange({ ...form, notes })} placeholder="Notas sobre o item..." />
      </div>
      <ModalActions
        saving={saving}
        onClose={onClose}
        onSave={onSave}
        saveDisabled={
          !form.name.trim() ||
          !form.locationId ||
          !form.feedCategory.trim() ||
          !form.feedType ||
          !form.quantity ||
          !form.unit ||
          (!form.unitCost && !form.totalCost) ||
          !form.expirationDate
        }
      />
    </ModalShell>
  );
}

function AdjustmentModal({
  item,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  item: FeedInventoryCompatibilityRow;
  form: AdjustmentForm;
  saving: boolean;
  onChange: (form: AdjustmentForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell title="Ajustar / registrar perda" onClose={onClose}>
      <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
        {item.name} tem {Number(item.quantity).toLocaleString("pt-BR")} {item.unit} em estoque.
      </div>
      <div className="space-y-4">
        <TextField label="Quantidade perdida/ajustada" type="number" value={form.quantity} onChange={(quantity) => onChange({ ...form, quantity })} placeholder="0" />
        <SelectField
          label="Motivo"
          value={form.reason}
          onChange={(reason) => onChange({ ...form, reason: reason as LossReason })}
          options={Object.entries(lossReasonLabels)}
        />
        <TextArea label="Observacoes" value={form.notes} onChange={(notes) => onChange({ ...form, notes })} placeholder="Detalhes da perda ou ajuste..." />
      </div>
      <ModalActions saving={saving} onClose={onClose} onSave={onSave} saveLabel="Registrar" />
    </ModalShell>
  );
}

function LowStockThresholdModal({
  value,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell title="Configurar alerta de estoque" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Itens de racao serao marcados como baixo estoque quando ficarem abaixo deste percentual.
        </div>
        <TextField
          label="Percentual minimo"
          type="number"
          value={value}
          onChange={onChange}
          placeholder="25"
        />
      </div>
      <ModalActions saving={saving} onClose={onClose} onSave={onSave} />
    </ModalShell>
  );
}

function DeleteModal({
  target,
  saving,
  onClose,
  onDelete,
}: {
  target: NonNullable<DeleteTarget>;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <ModalShell title="Confirmar exclusao" onClose={onClose} size="sm">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm text-gray-500">
          Tem certeza que deseja excluir <span className="font-semibold text-gray-800">{target.name}</span>?
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 pt-2">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
          Cancelar
        </button>
        <button type="button" onClick={onDelete} disabled={saving} className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-60">
          Excluir
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  size = "lg",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "lg";
}) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
        <div
          className={cn("max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl", size === "sm" ? "max-w-sm" : "max-w-2xl")}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-5">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ModalActions({
  saving,
  onClose,
  onSave,
  saveLabel = "Salvar",
  saveDisabled = false,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
        Cancelar
      </button>
      <button type="button" onClick={onSave} disabled={saving || saveDisabled} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed">
        <Check className="h-4 w-4" />
        {saveLabel}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}
