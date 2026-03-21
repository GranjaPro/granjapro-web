"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Building2, Egg, ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";

const steps = ["Granja", "Galpões", "Produção"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Farm info
  const [farmName, setFarmName] = useState("");
  const [producerName, setProducerName] = useState("");
  const [productionSystem, setProductionSystem] = useState("Convencional");
  const [mainBreed, setMainBreed] = useState("");

  // Step 2: Barns
  const [barnCount, setBarnCount] = useState(1);
  const [totalBirds, setTotalBirds] = useState(0);

  // Step 3: Production preferences
  const [sellsDirectly, setSellsDirectly] = useState(true);
  const [financialTracking, setFinancialTracking] = useState(true);

  const systems = ["Convencional", "Cage-Free", "Free Range", "Caipira", "Orgânico"];

  const canProceed = () => {
    if (step === 0) return farmName.trim() && producerName.trim();
    if (step === 1) return barnCount > 0 && totalBirds > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      // Create farm
      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .insert({
          name: farmName,
          producer_name: producerName,
          production_system: productionSystem,
          total_birds: totalBirds,
          main_breed: mainBreed,
          sells_eggs_directly: sellsDirectly,
          financial_tracking: financialTracking,
          owner_id: user.id,
        })
        .select()
        .single();

      if (farmError) throw farmError;

      // Update profile with farm_id
      await supabase
        .from("profiles")
        .update({ farm_id: farmData.id })
        .eq("id", user.id);

      // Create barns
      const birdsPerBarn = Math.floor(totalBirds / barnCount);
      const barnInserts = Array.from({ length: barnCount }, (_, i) => ({
        farm_id: farmData.id,
        name: `Galpão ${i + 1}`,
        capacity: birdsPerBarn + (i === 0 ? totalBirds % barnCount : 0),
        current_birds: birdsPerBarn + (i === 0 ? totalBirds % barnCount : 0),
        production_system: productionSystem,
        status: "active" as const,
      }));

      const { error: barnsError } = await supabase
        .from("barns")
        .insert(barnInserts);

      if (barnsError) throw barnsError;

      // Create default daily tasks
      const today = new Date().toISOString().split("T")[0];
      const defaultTasks = [
        { farm_id: farmData.id, title: "Coletar ovos", date: today, scheduled_time: "06:00" },
        { farm_id: farmData.id, title: "Alimentar aves", date: today, scheduled_time: "07:00" },
        { farm_id: farmData.id, title: "Limpeza dos bebedouros", date: today, scheduled_time: "09:00" },
        { farm_id: farmData.id, title: "Inspeção sanitária", date: today, scheduled_time: "10:00" },
      ];

      await supabase.from("tasks").insert(defaultTasks);

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao criar granja. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              i < step && "bg-brand-600 text-white",
              i === step && "bg-brand-600 text-white ring-4 ring-brand-100",
              i > step && "bg-gray-100 text-gray-400"
            )}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-sm font-medium hidden sm:block",
              i <= step ? "text-gray-900" : "text-gray-400"
            )}>{s}</span>
            {i < steps.length - 1 && (
              <div className={cn("w-12 h-0.5 rounded-full", i < step ? "bg-brand-500" : "bg-gray-200")} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Farm Info */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                <Bird className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dados da Granja</h2>
                <p className="text-sm text-gray-500">Informações básicas sobre sua propriedade</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da granja</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Ex: Granja São Pedro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do produtor</label>
              <input
                type="text"
                value={producerName}
                onChange={(e) => setProducerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Raça principal</label>
              <input
                type="text"
                value={mainBreed}
                onChange={(e) => setMainBreed(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Ex: Hy-Line Brown"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sistema de produção</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {systems.map((sys) => (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => setProductionSystem(sys)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer",
                      productionSystem === sys
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {sys}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Barns */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Estrutura</h2>
                <p className="text-sm text-gray-500">Quantos galpões e aves você possui</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de galpões</label>
              <input
                type="number"
                min={1}
                max={50}
                value={barnCount}
                onChange={(e) => setBarnCount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Total de aves</label>
              <input
                type="number"
                min={1}
                value={totalBirds || ""}
                onChange={(e) => setTotalBirds(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Ex: 15000"
              />
            </div>

            {barnCount > 0 && totalBirds > 0 && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                <p className="text-sm text-brand-800">
                  <span className="font-bold">{barnCount} galpões</span> serão criados com aproximadamente{" "}
                  <span className="font-bold">{Math.floor(totalBirds / barnCount).toLocaleString("pt-BR")} aves</span> cada.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Production Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Egg className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Produção</h2>
                <p className="text-sm text-gray-500">Configurações de produção e vendas</p>
              </div>
            </div>

            <div
              onClick={() => setSellsDirectly(!sellsDirectly)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                sellsDirectly ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Vende ovos diretamente?</p>
                <p className="text-xs text-gray-500 mt-0.5">Para mercados, restaurantes ou consumidores diretos</p>
              </div>
              <div className={cn(
                "w-11 h-6 rounded-full transition-colors flex items-center px-0.5",
                sellsDirectly ? "bg-brand-600" : "bg-gray-300"
              )}>
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow transition-transform",
                  sellsDirectly && "translate-x-5"
                )} />
              </div>
            </div>

            <div
              onClick={() => setFinancialTracking(!financialTracking)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                financialTracking ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Controle financeiro?</p>
                <p className="text-xs text-gray-500 mt-0.5">Acompanhar receitas, despesas e lucro</p>
              </div>
              <div className={cn(
                "w-11 h-6 rounded-full transition-colors flex items-center px-0.5",
                financialTracking ? "bg-brand-600" : "bg-gray-300"
              )}>
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow transition-transform",
                  financialTracking && "translate-x-5"
                )} />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Resumo</h4>
              <p className="text-sm text-gray-600"><span className="font-medium">Granja:</span> {farmName}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Produtor:</span> {producerName}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Sistema:</span> {productionSystem}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Raça:</span> {mainBreed || "—"}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Galpões:</span> {barnCount}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Aves:</span> {totalBirds.toLocaleString("pt-BR")}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors cursor-pointer"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || !canProceed()}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  Finalizar
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
