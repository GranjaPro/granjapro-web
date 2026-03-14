import { Plus, Egg, Wheat, AlertTriangle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  {
    label: "Produção",
    icon: Egg,
    color: "bg-brand-600 hover:bg-brand-700 text-white",
  },
  {
    label: "Ração",
    icon: Wheat,
    color: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  {
    label: "Mortalidade",
    icon: AlertTriangle,
    color: "bg-red-500 hover:bg-red-600 text-white",
  },
  {
    label: "Venda",
    icon: ShoppingCart,
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
];

export function QuickActions() {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-gray-700">Registrar</p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors ${action.color}`}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
