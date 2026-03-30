"use client";

import { useState, useEffect, useRef } from "react";
import { Bird, Building2, Egg, ChevronRight, ChevronLeft, Loader2, Check, Sparkles, Target, TrendingUp, DollarSign, BarChart3, Wheat, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";

const steps = ["Granja", "Produção", "Venda", "Objetivos", "Resumo"];

export default function OnboardingPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [farmName, setFarmName] = useState("");
  const [birdRange, setBirdRange] = useState("");
  const [barnCount, setBarnCount] = useState(1);
  const [totalBirds, setTotalBirds] = useState(0);
  const [eggsPerDay, setEggsPerDay] = useState(0);
  const [dontKnowEggs, setDontKnowEggs] = useState(false);
  const [racaoReais, setRacaoReais] = useState(0);
  const [dontKnowRacaoReais, setDontKnowRacaoReais] = useState(false);
  const [racaoKg, setRacaoKg] = useState(0);
  const [dontKnowRacaoKg, setDontKnowRacaoKg] = useState(false);
  const [sellChannels, setSellChannels] = useState<string[]>([]);
  const [sellOutros, setSellOutros] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [birdsError, setBirdsError] = useState("");
  const stepContentRef = useRef<HTMLDivElement>(null);

  const goToStep = (next: number) => {
    const dir = next > step ? 1 : -1;
    const el = stepContentRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = `translateX(${dir * 40}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        el.style.opacity = "1";
        el.style.transform = "translateX(0)";
      });
    }
    setStep(next);
  };

  const birdRanges = [
    { label: "Até 100", icon: "🐣" },
    { label: "100 - 500", icon: "🐔" },
    { label: "500 - 1000", icon: "🏠" },
    { label: "1000+", icon: "🏭" },
  ];

  const canProceed = () => {
    if (step === 0) return farmName.trim() && birdRange;
    return true;
  };

  const createFarm = async (name: string, birds?: number) => {
    if (!user) {
      setError("Usuário não autenticado. Faça login novamente.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Produtor";

      // 1. Create farm
      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .insert({ name, owner_id: user.id, producer_name: displayName, total_birds: birds ?? 0 })
        .select()
        .single();
      if (farmError) throw new Error(`Erro ao criar granja: ${farmError.message}`);

      // 2. Link profile to farm
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ farm_id: farmData.id })
        .eq("id", user.id);
      if (profileError) {
        // Fallback: upsert profile
        const { error: upsertErr } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email ?? "",
          full_name: displayName,
          farm_id: farmData.id,
        });
        if (upsertErr) throw new Error(`Erro ao vincular perfil: ${upsertErr.message}`);
      }

      // 3. Verify profile was linked before redirecting
      const { data: checkProfile } = await supabase
        .from("profiles")
        .select("farm_id")
        .eq("id", user.id)
        .single();

      if (!checkProfile?.farm_id) {
        throw new Error("Perfil não foi vinculado à granja. Tente novamente.");
      }

      // 4. Non-critical: create barns and tasks
      try {
        if (birds && barnCount > 0) {
          const birdsPerBarn = Math.floor(birds / barnCount);
          const barnInserts = Array.from({ length: barnCount }, (_, i) => ({
            farm_id: farmData.id,
            name: `Galpão ${i + 1}`,
            capacity: birdsPerBarn + (i === 0 ? birds % barnCount : 0),
            current_birds: birdsPerBarn + (i === 0 ? birds % barnCount : 0),
            status: "active" as const,
          }));
          await supabase.from("barns").insert(barnInserts);
        }
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("tasks").insert([
          { farm_id: farmData.id, title: "Coletar ovos", date: today, scheduled_time: "06:00" },
          { farm_id: farmData.id, title: "Alimentar aves", date: today, scheduled_time: "07:00" },
          { farm_id: farmData.id, title: "Limpeza dos bebedouros", date: today, scheduled_time: "09:00" },
          { farm_id: farmData.id, title: "Inspeção sanitária", date: today, scheduled_time: "10:00" },
        ]);
      } catch (e) {
        console.warn("Non-critical onboarding error (barns/tasks):", e);
      }

      // 5. Redirect to dashboard
      window.location.replace("/dashboard");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "Erro ao criar granja.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">

      <div className="relative w-full max-w-xl">
        {/* Progress - Mobile */}
        <div className="mb-6 sm:hidden">
          <div className="flex items-center gap-1 mb-3">
            {steps.map((_, i) => (
              <div key={i} className={cn(
                "h-1 rounded-full flex-1 transition-all duration-500",
                i <= step ? "bg-brand-500" : "bg-white/60"
              )} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white/90">{steps[step]}</p>
            <p className="text-xs text-white/50">{step + 1} de {steps.length}</p>
          </div>
        </div>

        {/* Progress - Desktop */}
        <div className="hidden sm:flex items-center justify-center mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "rounded-full flex items-center justify-center font-bold transition-all duration-300",
                  i < step && "w-8 h-8 bg-brand-500 text-white text-xs",
                  i === step && "w-9 h-9 bg-brand-600 text-white text-sm ring-[3px] ring-brand-200/50 shadow-lg shadow-brand-500/20",
                  i > step && "w-7 h-7 bg-white/80 text-gray-400 text-xs border border-gray-200"
                )}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs transition-all duration-300 whitespace-nowrap text-gray-900",
                  i === step ? "font-semibold" : "font-medium"
                )}>{s}</span>
              </div>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-16 h-[2px] rounded-full mx-3 mb-5 transition-all duration-500",
                  i < step ? "bg-brand-500" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/[0.04] border border-gray-100/80 p-7 mt-4 max-h-[calc(100vh-200px)] overflow-y-auto scroll-smooth onboarding-scroll">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              {error}
            </div>
          )}

          <div ref={stepContentRef}>

          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bird className="w-7 h-7 text-brand-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Bem-vindo ao Granja Pro</h2>
                <p className="text-sm text-gray-500 mt-1">Vamos iniciar a configuração da sua granja em poucos passos</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da granja</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all"
                  placeholder="Ex: Granja São Pedro"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5"> Quantas aves você tem hoje?</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {birdRanges.map((range) => (
                    <button
                      key={range.label}
                      type="button"
                      onClick={() => { setBirdRange(range.label); setTotalBirds(0); setBirdsError(""); }}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer",
                        birdRange === range.label
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10"
                          : "border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <span className="text-lg">{range.icon}</span>
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  birdRange ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
                )}>
                  <div className="overflow-hidden">
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Número aproximado de aves <em className="text-gray-400 font-normal">(opcional)</em></label>
                      <input
                        type="number"
                        min={0}
                        value={totalBirds || ""}
                        onChange={(e) => { setTotalBirds(Number(e.target.value)); setBirdsError(""); }}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                        placeholder={birdRange === "Até 100" ? "Ex: 80" : birdRange === "100 - 500" ? "Ex: 300" : birdRange === "500 - 1000" ? "Ex: 750" : "Ex: 1500"}
                      />
                      {birdsError && <p className="text-xs text-red-500 mt-1.5">{birdsError}</p>}
                      <p className="text-xs text-gray-400 mt-2">👉 Usamos isso para calcular produção, ração e lucro estimado</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Produção */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Egg className="w-7 h-7 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Produção</h2>
                <p className="text-sm text-gray-500 mt-1">Nos conte sobre sua produção atual</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantos ovos sua granja produz por dia (em média)?</label>
                <input
                  type="number"
                  min={0}
                  value={dontKnowEggs ? "" : (eggsPerDay || "")}
                  onChange={(e) => { const v = Number(e.target.value); const maxBirds = totalBirds > 0 ? totalBirds : birdRange === "Até 100" ? 100 : birdRange === "100 - 500" ? 500 : birdRange === "500 - 1000" ? 1000 : 100000; setEggsPerDay(v < 0 ? 0 : v > maxBirds ? maxBirds : v); }}
                  disabled={dontKnowEggs}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all",
                    dontKnowEggs && "opacity-40 cursor-not-allowed bg-gray-100"
                  )}
                  placeholder={`Ex: ${totalBirds > 0 ? Math.round(totalBirds * 0.85) : birdRange === "Até 100" ? 80 : birdRange === "100 - 500" ? 350 : birdRange === "500 - 1000" ? 750 : 500}`}
                />
                <label className="flex items-center gap-2 mt-2 px-4 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontKnowEggs}
                    onChange={(e) => { setDontKnowEggs(e.target.checked); if (e.target.checked) setEggsPerDay(0); }}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 accent-brand-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Não sei</span>
                </label>
              </div>

            </div>
          )}

          {/* Step 3: Venda */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Venda</h2>
                <p className="text-sm text-gray-500 mt-1">Selecione seus canais de venda</p>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Comércios", desc: "Padarias, mercearias, lojas" },
                  { label: "Mercados", desc: "Supermercados e atacados" },
                  { label: "Direto", desc: "Venda direta ao consumidor" },
                  { label: "Distribuidor", desc: "Revendedores e intermediários" },
                  { label: "Indústria", desc: "Fábricas e processadoras" },
                  { label: "Outros", desc: "Outros canais de venda" },
                ].map((channel) => {
                  const selected = sellChannels.includes(channel.label);
                  return (
                    <button
                      key={channel.label}
                      type="button"
                      onClick={() => setSellChannels(selected ? sellChannels.filter(c => c !== channel.label) : [...sellChannels, channel.label])}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                        selected
                          ? "border-brand-500 bg-brand-50/60 shadow-sm shadow-brand-500/10"
                          : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                        selected ? "bg-brand-600 border-brand-600" : "border-gray-300"
                      )}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold transition-colors", selected ? "text-gray-900" : "text-gray-700")}>{channel.label}</p>
                        <p className="text-xs text-gray-400">{channel.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {sellChannels.length > 0 && (
                <p className="text-xs text-gray-400 text-center">{sellChannels.length} {sellChannels.length === 1 ? "canal selecionado" : "canais selecionados"}</p>
              )}
            </div>
          )}

          {/* Step 4: Objetivos */}
          {step === 3 && (() => {
            const goals = [
              { label: "Aumentar lucro", impact: "+18%", desc: "Otimize preços e margens" },
              { label: "Reduzir custos", impact: "+12%", desc: "Economize em ração e insumos" },
              { label: "Organizar a granja", impact: "+8%", desc: "Controle total da operação" },
              { label: "Entender a produção", impact: "+15%", desc: "Dados claros para decidir melhor" },
            ];
            const totalImpact = goals.reduce((acc, g) => acc + (objectives.includes(g.label) ? parseInt(g.impact) : 0), 0);
            return (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Target className="w-7 h-7 text-violet-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Objetivos</h2>
                  <p className="text-sm text-gray-500 mt-1">O que você quer melhorar?</p>
                </div>

                <div className="space-y-2.5">
                  {goals.map((goal) => {
                    const active = objectives.includes(goal.label);
                    return (
                      <button
                        key={goal.label}
                        type="button"
                        onClick={() => setObjectives(active ? objectives.filter(o => o !== goal.label) : [...objectives, goal.label])}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                          active
                            ? "border-brand-500 bg-brand-50/60"
                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            active ? "bg-brand-600 border-brand-600" : "border-gray-300"
                          )}>
                            {active && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="text-left">
                            <p className={cn("text-sm font-semibold", active ? "text-gray-900" : "text-gray-700")}>{goal.label}</p>
                            <p className="text-xs text-gray-500">{goal.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>
            );
          })()}

          {/* Step 5: Resultado */}
          {step === 4 && (() => {
            // Estimate bird count from range
            const birdEstimate = totalBirds > 0 ? totalBirds : birdRange === "Até 100" ? 80 : birdRange === "100 - 500" ? 300 : birdRange === "500 - 1000" ? 750 : 1500;
            const CONSUMO_KG_DIA = 0.11; // 110g per chicken per day
            const PRECO_RACAO_KG = 2.00; // R$/kg average in Brasil
            const PRECO_OVO = 0.65; // R$ per egg average

            // Production
            const eggs = dontKnowEggs ? Math.round(birdEstimate * 0.85) : eggsPerDay;
            const taxaPostura = birdEstimate > 0 ? Math.round((eggs / birdEstimate) * 100) : 0;
            const eggsMonth = eggs * 30;

            // Feed cost
            const racaoKgMonth = Math.round(birdEstimate * CONSUMO_KG_DIA * 30);
            const racaoCustoMonth = Math.round(racaoKgMonth * PRECO_RACAO_KG * 100) / 100;

            // Revenue & profit
            const receitaMonth = Math.round(eggsMonth * PRECO_OVO * 100) / 100;
            const lucroMonth = Math.round((receitaMonth - racaoCustoMonth) * 100) / 100;

            const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            // Score calculation (0-100)
            // Production: 45pts
            const prodScore = taxaPostura >= 92 ? 45 : taxaPostura >= 88 ? 40 : taxaPostura >= 84 ? 34 : taxaPostura >= 80 ? 26 : taxaPostura >= 75 ? 18 : taxaPostura >= 70 ? 10 : 4;
            // Sales: 20pts (average of selected channels)
            const channelScores: Record<string, number> = { "Comércios": 17, "Direto": 20, "Mercados": 14, "Distribuidor": 10, "Indústria": 7, "Outros": 12 };
            const salesScore = sellChannels.length > 0 ? Math.round(sellChannels.reduce((sum, ch) => sum + (channelScores[ch] || 0), 0) / sellChannels.length) : 0;
            // Objectives: 20pts (5 per objective, max 20)
            const objScore = Math.min(objectives.length * 5, 20);
            // Data quality: 15pts
            const dataFields = [totalBirds > 0, !dontKnowEggs && eggsPerDay > 0, sellChannels.length > 0, objectives.length > 0];
            const filledCount = dataFields.filter(Boolean).length;
            const dataScore = filledCount === 4 ? 15 : filledCount === 3 ? 11 : filledCount === 2 ? 7 : 3;
            let score = Math.min(prodScore + salesScore + objScore + dataScore, 100);
            const scoreLabel = score >= 95 ? "Alto Desempenho" : score >= 85 ? "Muito Bom" : score >= 75 ? "Ok" : score >= 50 ? "Abaixo do Ideal" : "Crítico";
            const scoreColor = score >= 95 ? "#059669" : score >= 85 ? "#22c55e" : score >= 75 ? "#eab308" : score >= 50 ? "#f59e0b" : "#ef4444";
            const circumference = 2 * Math.PI * 54;
            const strokeDashoffset = circumference - (score / 100) * circumference;

            // Ideal production (87.5% = midpoint of 85-90% normal rate)
            const IDEAL_POSTURA = 0.875;
            const idealEggsDay = Math.round(birdEstimate * IDEAL_POSTURA);
            const idealReceitaMonth = Math.round(idealEggsDay * 30 * PRECO_OVO * 100) / 100;
            const idealLucroMonth = Math.round((idealReceitaMonth - racaoCustoMonth) * 100) / 100;
            const diffLucro = Math.round((idealLucroMonth - lucroMonth) * 100) / 100;
            const isAboveIdeal = taxaPostura >= 85;

            const consumoKgDia = Math.round(birdEstimate * CONSUMO_KG_DIA * 100) / 100;
            const custoRacaoDia = Math.round(consumoKgDia * PRECO_RACAO_KG * 100) / 100;

            const cards = [
              { label: "Taxa de postura", value: `${taxaPostura}%`, sub: "Eficiência produtiva das aves", icon: Egg, color: "amber" },
              { label: "Consumo estimado de ração/dia", value: `${consumoKgDia.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg`, sub: "Baseado em 110g por ave", icon: Wheat, color: "amber" },
              { label: "Custo estimado de ração/mês", value: fmt(racaoCustoMonth), sub: "Maior custo operacional", icon: DollarSign, color: "red" },
              { label: "Produção mensal de ovos", value: `${eggsMonth.toLocaleString("pt-BR")} ovos`, sub: "Projeção para 30 dias", icon: BarChart3, color: "emerald" },
              { label: "Receita estimada", value: fmt(receitaMonth), sub: "Baseado no preço médio do ovo", icon: DollarSign, color: "emerald" },
              { label: "Lucro estimado", value: fmt(lucroMonth), sub: lucroMonth >= 0 ? "Margem positiva" : "Margem negativa", icon: BarChart3, color: lucroMonth >= 0 ? "brand" : "red" },
            ];

            const potencialEconomiaRacao = Math.round(racaoCustoMonth * 0.12 * 100) / 100;
            const potencialEconomiaMortalidade = Math.round(receitaMonth * 0.05 * 100) / 100;
            const potencialEconomiaTotal = Math.round((potencialEconomiaRacao + potencialEconomiaMortalidade) * 100) / 100;

            return (
              <div className="space-y-4">
                {/* Financial card — Aumentar lucro OR Reduzir custos */}
                {(objectives.includes("Aumentar lucro") || objectives.includes("Reduzir custos")) && (() => {
                  const tierBg = score >= 95 ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300/80" : score >= 85 ? "bg-green-50 border-green-200/80" : score >= 75 ? "bg-yellow-50 border-yellow-200/80" : score >= 50 ? "bg-amber-50 border-amber-200/80" : "bg-red-50 border-red-200/80";
                  const tierBanner = score >= 95 ? "bg-gradient-to-r from-emerald-600 to-green-500" : score >= 85 ? "bg-green-500" : score >= 75 ? "bg-yellow-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
                  const tierText = score >= 95 ? "text-emerald-700" : score >= 85 ? "text-green-600" : score >= 75 ? "text-yellow-600" : score >= 50 ? "text-amber-600" : "text-red-500";
                  const tierBorder = score >= 95 ? "border-emerald-200/60" : score >= 85 ? "border-green-200/60" : score >= 75 ? "border-yellow-200/60" : score >= 50 ? "border-amber-200/60" : "border-red-200/60";
                  const tierTrack = score >= 95 ? "#a7f3d0" : score >= 85 ? "#bbf7d0" : score >= 75 ? "#fef08a" : score >= 50 ? "#fde68a" : "#fecaca";
                  const tierIcon = score >= 95 ? "text-emerald-400" : score >= 85 ? "text-green-400" : score >= 75 ? "text-yellow-400" : score >= 50 ? "text-amber-400" : "text-red-400";
                  const margin = receitaMonth > 0 ? Math.round((lucroMonth / receitaMonth) * 100) : 0;
                  const marginMsg = margin >= 50 ? "Sua operação está altamente eficiente" : margin >= 40 ? "Sua granja está com boa margem" : margin >= 20 ? "Sua granja é lucrativa, mas pode melhorar" : "Sua granja pode estar operando no prejuízo";
                  const bannerMsg = isAboveIdeal ? "Sua granja está no caminho certo" : "Sua granja está abaixo do potencial";
                  const displayValue = isAboveIdeal ? lucroMonth : diffLucro > 0 ? diffLucro : Math.abs(lucroMonth);
                  const displayDaily = Math.round(displayValue / 30 * 100) / 100;
                  const valueMsg = isAboveIdeal ? "Seu lucro estimado" : "Você pode estar perdendo";

                  return (
                    <div className={cn("rounded-2xl overflow-hidden border", tierBg)}>
                      <div className={cn("px-4 py-2.5 flex items-center gap-2", tierBanner)}>
                        <TrendingUp className={cn("w-3.5 h-3.5 text-white", !isAboveIdeal && "rotate-180")} />
                        <span className="text-xs font-semibold text-white">{bannerMsg}</span>
                      </div>
                      <div className="p-5">
                        <p className={cn("text-xs font-medium", tierText)}>{valueMsg}</p>
                        <p className="text-3xl font-black text-gray-900 mt-1 tracking-tight">
                          {fmt(displayValue > 0 ? displayValue : 0)}
                          <span className="text-sm font-semibold text-gray-400 ml-1">/mês</span>
                        </p>
                        <p className={cn("text-sm font-semibold mt-1", tierText)}>
                          ≈ {fmt(displayDaily > 0 ? displayDaily : 0)}/dia
                        </p>
                        {isAboveIdeal && lucroMonth > 0 && (
                          <div className="mt-3 bg-white/60 rounded-lg px-3.5 py-2.5 border border-gray-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Margem de lucro</span>
                              <span className={cn("text-sm font-bold", margin >= 40 ? "text-emerald-600" : margin >= 20 ? "text-amber-600" : "text-red-500")}>{margin}%</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">{marginMsg}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1.5">Estimativa baseada nos dados da sua granja</p>
                        <div className={cn("flex items-center gap-3 mt-4 pt-4 border-t", tierBorder)}>
                          <div className="relative w-11 h-11 flex-shrink-0">
                            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 120 120">
                              <circle cx="60" cy="60" r="54" fill="none" stroke={tierTrack} strokeWidth="10" />
                              <circle cx="60" cy="60" r="54" fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-black text-gray-900 leading-none">{score}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">Score: {scoreLabel}</p>
                            <p className="text-[11px] text-gray-400">{score} de 100 pontos</p>
                          </div>
                          <Target className={cn("w-4 h-4", tierIcon)} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Visibility card — Organizar a granja OR Entender a produção */}
                {(objectives.includes("Organizar a granja") || objectives.includes("Entender a produção")) && (
                  <div className="rounded-2xl bg-white border border-gray-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-brand-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">Visibilidade da granja</p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Hoje você produz cerca de <span className="font-semibold text-gray-800">{eggsMonth.toLocaleString("pt-BR")} ovos/mês</span>, mas não tem controle claro sobre custos e eficiência.</p>
                    </div>
                    <div className="bg-brand-50/60 px-5 py-3.5 border-t border-brand-100/60">
                      <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wide mb-2">Com o Granja Pro</p>
                      <div className="flex flex-wrap gap-2">
                        {["Controle de produção", "Controle de custos", "Visão clara do lucro"].map((item) => (
                          <span key={item} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-100/80 rounded-full px-2.5 py-1">
                            <Check className="w-3 h-3" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback if no objectives selected */}
                {objectives.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
                    <p className="text-sm text-gray-500">Nenhum objetivo selecionado</p>
                    <p className="text-xs text-gray-400 mt-1">Volte e selecione seus objetivos para ver insights personalizados</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Advice */}
          {step === 4 && (
            <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">Valores estimados com base nos dados informados até agora. Para garantir a precisão e a melhora da sua granja, utilize o <span className="font-semibold text-gray-500">Granja Pro</span> diariamente.</p>
          )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-7 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button
                onClick={() => goToStep(step - 1)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : (
              <button
                onClick={() => createFarm("Minha Granja")}
                disabled={loading}
                className="text-sm font-medium text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              >
                Pular configuração
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => {
                  if (step === 0 && totalBirds) {
                    const ranges: Record<string, [number, number]> = {
                      "Até 100": [1, 100],
                      "100 - 500": [100, 500],
                      "500 - 1000": [500, 1000],
                      "1000+": [1000, 100000],
                    };
                    const [min, max] = ranges[birdRange] || [0, 100000];
                    if (totalBirds < min || totalBirds > max) {
                      setBirdsError(`Insira um valor entre ${min} e ${max.toLocaleString("pt-BR")} para a faixa "${birdRange}"`);
                      return;
                    }
                  }
                  setBirdsError("");
                  goToStep(step + 1);
                }}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-sm shadow-brand-600/20 hover:shadow-brand-600/30"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {error && (
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                )}
                <button
                  onClick={() => createFarm(farmName, totalBirds)}
                  disabled={loading || !canProceed()}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-sm shadow-brand-600/20 hover:shadow-brand-600/30"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Criar granja</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Você pode alterar tudo depois nas configurações
        </p>
      </div>
    </div>
  );
}
