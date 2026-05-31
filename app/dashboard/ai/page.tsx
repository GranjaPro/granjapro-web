"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Egg,
  TrendingUp,
  DollarSign,
  Skull,
  Wheat,
  ClipboardList,
  Copy,
  Check,
  ArrowDown,
  RotateCcw,
  Zap,
  Info,
  Crown,
  Lock,
  Plus,
  Image,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ModalPortal from "@/components/ui/modal-portal";
import { usePlan } from "@/components/plan/plan-provider";
import {
  AI_MODE_META,
  PLAN_MATRIX,
  getAICreditCost,
  type AIResponseMode,
} from "@/lib/plans";

/* ── Types ── */
interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  creditCost?: number;
  type?: "text" | "intent-picker";
  intentOptions?: IntentOption[];
  selectedIntent?: string;
}

interface IntentOption {
  label: string;
  description: string;
  credits: number;
  key: AIResponseMode;
}

/* ── Suggestions with credit costs ── */
const suggestions = [
  { label: "Relatório de produção", description: "Resumo semanal de ovos", icon: Egg, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", credits: getAICreditCost("simple"), prompt: "Gere um relatório resumido da produção de ovos desta semana.", tier: "simple" as const },
  { label: "Análise de mortalidade", description: "Últimos 30 dias", icon: Skull, iconBg: "bg-red-50", iconColor: "text-red-500", credits: getAICreditCost("detailed"), prompt: "Analise a taxa de mortalidade dos últimos 30 dias e sugira ações.", tier: "detailed" as const },
  { label: "Custos de ração", description: "Custo médio por ave", icon: Wheat, iconBg: "bg-orange-50", iconColor: "text-orange-600", credits: getAICreditCost("simple"), prompt: "Qual o custo médio de ração por ave neste mês?", tier: "simple" as const },
  { label: "Projeção financeira", description: "Receitas e despesas", icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", credits: getAICreditCost("diagnostic"), prompt: "Faça uma projeção de receita e despesas para o próximo mês.", tier: "diagnostic" as const },
  { label: "Tendência de postura", description: "Taxa dos últimos 7 dias", icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", credits: getAICreditCost("simple"), prompt: "Como está a tendência da taxa de postura nos últimos 7 dias?", tier: "simple" as const },
  { label: "Checklist diário", description: "Tarefas de hoje", icon: ClipboardList, iconBg: "bg-brand-50", iconColor: "text-brand-600", credits: getAICreditCost("simple"), prompt: "Gere um checklist das tarefas diárias para a granja hoje.", tier: "simple" as const },
];

/* ── Simple questions that skip the tier picker ── */
const SIMPLE_PATTERNS = /^(oi|ol[aá]|bom dia|boa tarde|boa noite|obrigad|valeu|ok|sim|n[aã]o|entendi|beleza|falou|tchau)[\s!?.]*$/i;


export default function AssistenteIAPage() {
  const { plan } = usePlan();
  const monthlyCredits = PLAN_MATRIX[plan].limits.aiCreditsMonthly;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [credits, setCredits] = useState(monthlyCredits);
  const [totalCredits, setTotalCredits] = useState(monthlyCredits);
  const [showPhotoPopup, setShowPhotoPopup] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"50" | "100" | "200" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const photoPopupRef = useRef<HTMLDivElement>(null);

  // Close photo popup on outside click
  useEffect(() => {
    if (!showPhotoPopup) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        photoPopupRef.current && !photoPopupRef.current.contains(e.target as Node) &&
        plusButtonRef.current && !plusButtonRef.current.contains(e.target as Node)
      ) {
        setShowPhotoPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPhotoPopup]);

  useEffect(() => {
    setTotalCredits(monthlyCredits);
    setCredits(monthlyCredits);
  }, [monthlyCredits]);

  useEffect(() => {
    if (!isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedText, isStreaming]);

  function handleScroll() {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function copyMessage(id: number, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Stream response from Claude API
  const streamFromAPI = useCallback(async (
    userText: string,
    tier: "simple" | "detailed" | "diagnostic",
    cost: number,
    allMessages: Message[],
  ) => {
    setIsTyping(true);

    // Build conversation history for the API (only user/assistant messages)
    const apiMessages = allMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, tier }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      setIsTyping(false);
      setIsStreaming(true);
      setDisplayedText("");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.text) {
              fullText += data.text;
              setDisplayedText(fullText);
            }
            if (data.done) {
              // Stream complete
              const assistantMsg: Message = {
                id: Date.now() + 1,
                role: "assistant",
                content: fullText,
                timestamp: new Date(),
                creditCost: cost,
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setCredits((prev) => Math.max(0, prev - cost));
              setIsStreaming(false);
              setDisplayedText("");
              return;
            }
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            // Skip invalid JSON chunks
          }
        }
      }

      // If stream ended without done signal
      if (fullText) {
        const assistantMsg: Message = {
          id: Date.now() + 1,
          role: "assistant",
          content: fullText,
          timestamp: new Date(),
          creditCost: cost,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setCredits((prev) => Math.max(0, prev - cost));
      }
      setIsStreaming(false);
      setDisplayedText("");
    } catch (err) {
      setIsTyping(false);
      setIsStreaming(false);
      setDisplayedText("");

      const errorMsg: Message = {
        id: Date.now() + 2,
        role: "assistant",
        content: `Erro ao processar sua solicitação: ${err instanceof Error ? err.message : "Erro desconhecido"}. Tente novamente.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, []);

  function sendMessage(text: string) {
    if (!text.trim() || isTyping || isStreaming) return;
    const trimmed = text.trim();
    const userMsg: Message = { id: Date.now(), role: "user", content: trimmed, timestamp: new Date() };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Simple greetings/confirmations → send directly with 1 credit
    if (SIMPLE_PATTERNS.test(trimmed)) {
      if (credits < 1) { showNoCreditsMessage(); return; }
      const updatedMessages = [...messages, userMsg];
      streamFromAPI(trimmed, "simple", 1, updatedMessages);
      return;
    }

    // Real questions → always show tier picker so user chooses depth
    const pickerMsg: Message = {
      id: Date.now() + 1,
      role: "system",
      content: trimmed,
      timestamp: new Date(),
      type: "intent-picker",
      intentOptions: [
        { label: AI_MODE_META.simple.label, description: AI_MODE_META.simple.description, credits: getAICreditCost("simple"), key: "simple" },
        { label: AI_MODE_META.detailed.label, description: AI_MODE_META.detailed.description, credits: getAICreditCost("detailed"), key: "detailed" },
        { label: AI_MODE_META.diagnostic.label, description: AI_MODE_META.diagnostic.description, credits: getAICreditCost("diagnostic"), key: "diagnostic" },
      ],
    };
    setMessages((prev) => [...prev, pickerMsg]);
  }

  function showNoCreditsMessage() {
    const noCreditsMsg: Message = {
      id: Date.now() + 2,
      role: "assistant",
      content: "Você não tem créditos suficientes para esta ação. Faça upgrade do seu plano para continuar usando o Assistente IA.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, noCreditsMsg]);
  }

  function handleIntentSelect(messageId: number, optionKey: AIResponseMode) {
    const cost = getAICreditCost(optionKey);

    if (credits < cost) {
      showNoCreditsMessage();
      return;
    }

    // Mark selection on the picker message
    const updated = messages.map((msg) =>
      msg.id === messageId ? { ...msg, selectedIntent: optionKey } : msg
    );
    setMessages(updated);

    // Call Claude API OUTSIDE the state updater to avoid StrictMode double-fire
    const userText = [...updated].reverse().find((m) => m.role === "user")?.content || "";
    streamFromAPI(userText, optionKey, cost, updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSuggestion(prompt: string) {
    sendMessage(prompt);
  }

  function clearChat() {
    setMessages([]);
    setDisplayedText("");
    setIsStreaming(false);
    setIsTyping(false);
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  const showWelcome = messages.length === 0 && !isTyping && !isStreaming;
  const isBusy = isTyping || isStreaming;
  const creditPercent = (credits / totalCredits) * 100;
  const creditColor = creditPercent > 50 ? "text-emerald-600" : creditPercent > 20 ? "text-amber-600" : "text-red-500";
  const creditBarColor = creditPercent > 50 ? "from-emerald-400 to-emerald-500" : creditPercent > 20 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mt-4 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 bg-gradient-to-b from-gray-50/50 to-white overflow-hidden">

      {/* ── Chat Container ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto dashboard-scroll"
        >
          <div className={cn("p-4 sm:p-6 space-y-5 flex flex-col max-w-4xl mx-auto w-full", showWelcome && "min-h-full")}>

            {/* ── Welcome State ── */}
            {showWelcome && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
                {/* AI Avatar */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Sparkles className="w-9 h-9 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-[2.5px] border-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Como posso ajudar hoje?</h2>
                <p className="text-sm text-gray-500 max-w-md mb-3 leading-relaxed">
                  Analiso dados de produção, custos, mortalidade e finanças da sua granja em tempo real.
                </p>

                {/* Credits info in welcome */}
                <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5 mb-10">
                  <Zap className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[12px] font-semibold text-violet-700">
                    Você tem <span className="text-violet-900">{credits} créditos</span> disponíveis
                  </span>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSuggestion(s.prompt)}
                      disabled={credits < s.credits}
                      className={cn(
                        "group relative flex items-start gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-200 cursor-pointer border",
                        credits >= s.credits
                          ? "bg-white hover:bg-gradient-to-br hover:from-violet-50/80 hover:to-indigo-50/50 border-gray-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5"
                          : "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200",
                        credits >= s.credits
                          ? s.iconBg
                          : "bg-gray-100"
                      )}>
                        <s.icon className={cn(
                          "w-[18px] h-[18px] transition-colors duration-200",
                          credits >= s.credits
                            ? s.iconColor
                            : "text-gray-400"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-semibold text-gray-800 group-hover:text-violet-800 block transition-colors duration-200">{s.label}</span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">{s.description}</span>
                      </div>
                      {/* Credit badge */}
                      <div className={cn(
                        "absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                        s.credits === 1 && "bg-emerald-50 text-emerald-600",
                        s.credits === 3 && "bg-amber-50 text-amber-600",
                        s.credits === 5 && "bg-violet-50 text-violet-600",
                      )}>
                        <Zap className="w-2.5 h-2.5" />
                        {s.credits}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Credit legend */}
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-gray-400">1 crédito</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[11px] text-gray-400">3 créditos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-[11px] text-gray-400">5 créditos</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            {messages.map((msg) => {
              // Intent Picker (system message)
              if (msg.type === "intent-picker" && msg.intentOptions) {
                return (
                  <div key={msg.id} className="flex gap-3 max-w-3xl mr-auto">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm shadow-violet-500/20">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md max-w-[85%] shadow-sm overflow-hidden">
                      <div className="px-4 pt-4 pb-3">
                        <p className="text-[11px] text-gray-400 mb-1.5">Escolha o nível de resposta:</p>
                        <p className="text-[13px] font-semibold text-gray-800 leading-snug">&ldquo;{msg.content}&rdquo;</p>
                      </div>
                      <div className="px-3 pb-3 space-y-1.5">
                        {msg.intentOptions.map((opt) => {
                          const isSelected = msg.selectedIntent === opt.key;
                          const canAfford = credits >= opt.credits;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => !isSelected && !msg.selectedIntent && canAfford && handleIntentSelect(msg.id, opt.key)}
                              disabled={!!msg.selectedIntent || !canAfford || isBusy}
                              className={cn(
                                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200",
                                isSelected
                                  ? "bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-300"
                                  : msg.selectedIntent
                                  ? "bg-gray-50 border border-gray-100 opacity-40"
                                  : canAfford
                                  ? "bg-gray-50/80 border border-gray-100 hover:bg-violet-50 hover:border-violet-200 cursor-pointer"
                                  : "bg-gray-50 border border-gray-100 opacity-50 cursor-not-allowed"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                isSelected
                                  ? "border-violet-500 bg-violet-500"
                                  : "border-gray-300"
                              )}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={cn(
                                  "text-[13px] font-semibold block",
                                  isSelected ? "text-violet-800" : "text-gray-700"
                                )}>
                                  {opt.label}
                                </span>
                                <span className="text-[11px] text-gray-400">{opt.description}</span>
                              </div>
                              <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold flex-shrink-0",
                                opt.credits === 1 && "bg-emerald-50 text-emerald-600",
                                opt.credits === 3 && "bg-amber-50 text-amber-600",
                                opt.credits === 5 && "bg-violet-50 text-violet-600",
                              )}>
                                {canAfford ? <Zap className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {opt.credits}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Cada nível consome créditos diferentes do seu plano
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Regular messages
              return (
                <div key={msg.id} className={cn("flex gap-3 max-w-3xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}>
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-brand-500/15"
                      : "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20"
                  )}>
                    {msg.role === "user" ? (
                      <User className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 relative group",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-tr-md max-w-[75%] shadow-sm shadow-brand-500/15"
                      : "bg-white text-gray-800 rounded-tl-md max-w-[85%] border border-gray-100 shadow-sm"
                  )}>
                    <div className={cn(
                      "text-[13px] whitespace-pre-wrap leading-[1.7]",
                      msg.role === "user" ? "text-white" : "text-gray-700"
                    )}>
                      {msg.content}
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 mt-2 pt-1.5",
                      msg.role === "user" ? "border-t border-white/15" : "border-t border-gray-100"
                    )}>
                      <span className={cn(
                        "text-[10px]",
                        msg.role === "user" ? "text-white/50" : "text-gray-400"
                      )}>
                        {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.role === "assistant" && msg.creditCost && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          -{msg.creditCost}
                        </span>
                      )}
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          className="ml-auto p-1 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150 cursor-pointer opacity-0 group-hover:opacity-100"
                          aria-label="Copiar mensagem"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm shadow-violet-500/20">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Streaming Text */}
            {isStreaming && displayedText && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm shadow-violet-500/20">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-sm">
                  <div className="text-[13px] whitespace-pre-wrap leading-[1.7] text-gray-700">
                    {displayedText}
                    <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer"
            aria-label="Rolar para baixo"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* ── Input Area ── */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
          {/* No credits warning */}
          {credits === 0 && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3">
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-red-700">Seus créditos acabaram</p>
                  <p className="text-[11px] text-red-500">Faça upgrade para continuar usando o Assistente IA</p>
                </div>
                <button onClick={() => { setShowUpgradeModal(true); setSelectedPlan(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0">
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade
                </button>
              </div>
            </div>
          )}

          {/* Bottom bar: Branding + Input + Credits — single row */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            {/* Left: Branding */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-semibold text-gray-600 leading-tight">Assistente IA</p>
                <p className="text-[8px] text-gray-400 leading-tight">Powered by Granja Pro</p>
              </div>
            </div>

            {/* Center: Input */}
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 max-w-xl mx-auto">
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[12px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
                aria-label="Nova conversa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Nova conversa</span>
              </button>
              {/* Plus button with popup */}
              <div className="relative flex-shrink-0">
                <button
                  ref={plusButtonRef}
                  type="button"
                  onClick={() => setShowPhotoPopup((prev) => !prev)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border",
                    showPhotoPopup
                      ? "bg-violet-50 border-violet-200 text-violet-600"
                      : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  )}
                  aria-label="Adicionar fotos"
                >
                  {showPhotoPopup ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>

                {/* Photo popup */}
                {showPhotoPopup && (
                  <div ref={photoPopupRef} className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 z-20">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Image className="w-4 h-4 text-violet-500" />
                      <span className="text-[12px] font-semibold text-gray-700">Adicione fotos</span>
                    </div>
                    <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/50 transition-all cursor-pointer">
                      <Plus className="w-4 h-4 text-gray-400" />
                      <span className="text-[11px] text-gray-500 font-medium">Selecionar imagem</span>
                      <input type="file" accept="image/*" multiple className="hidden" />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">JPG, PNG ou WEBP (máx. 5MB)</p>
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-violet-500/15 focus-within:border-violet-300 shadow-sm transition-all duration-200">
                <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  placeholder={credits > 0 ? "Pergunte sobre sua granja..." : "Sem créditos disponíveis"}
                  rows={1}
                  className="bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none w-full resize-none leading-relaxed max-h-[120px]"
                  disabled={isBusy || credits === 0}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isBusy || credits === 0}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
                  input.trim() && !isBusy && credits > 0
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/25 cursor-pointer"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                )}
                aria-label="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Right: Credits + Upgrade */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className={cn(
                "flex items-center gap-2 rounded-2xl px-3 py-2.5 border shadow-sm transition-all duration-300",
                creditPercent > 50
                  ? "bg-emerald-50 border-emerald-200 shadow-emerald-500/10"
                  : creditPercent > 20
                  ? "bg-amber-50 border-amber-200 shadow-amber-500/10"
                  : "bg-red-50 border-red-200 shadow-red-500/10 animate-pulse"
              )}>
                <div className="flex items-center gap-1">
                  <Zap className={cn("w-3.5 h-3.5", creditColor)} />
                  <span className={cn("text-[12px] font-bold tabular-nums", creditColor)}>{credits}</span>
                  <span className="text-[10px] text-gray-400 font-medium">/ {totalCredits}</span>
                </div>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", creditBarColor)}
                    style={{ width: `${creditPercent}%` }}
                  />
                </div>
              </div>
              <button onClick={() => { setShowUpgradeModal(true); setSelectedPlan(null); }} className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm shadow-violet-500/20">
                <Crown className="w-3 h-3" />
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upgrade Modal ── */}
      {showUpgradeModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowUpgradeModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Comprar Créditos</h3>
                      <p className="text-[12px] text-white/70">Escolha o plano ideal para você</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Plans */}
              <div className="p-5 space-y-3">
                {/* 50 credits */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("50")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left",
                    selectedPlan === "50"
                      ? "border-violet-400 bg-violet-50/60"
                      : "border-gray-200 hover:border-violet-200 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    selectedPlan === "50" ? "border-violet-500 bg-violet-500" : "border-gray-300"
                  )}>
                    {selectedPlan === "50" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-800">50 créditos</p>
                    <p className="text-[11px] text-gray-400">~50 respostas simples</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-extrabold text-gray-900">R$ 19,99</p>
                    <p className="text-[10px] text-gray-400">R$ 0,40 / crédito</p>
                  </div>
                </button>

                {/* 100 credits — popular */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("100")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left relative",
                    selectedPlan === "100"
                      ? "border-violet-400 bg-violet-50/60"
                      : "border-violet-200 bg-violet-50/30 hover:bg-violet-50/60"
                  )}
                >
                  <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    POPULAR
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    selectedPlan === "100" ? "border-violet-500 bg-violet-500" : "border-gray-300"
                  )}>
                    {selectedPlan === "100" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-800">100 créditos</p>
                    <p className="text-[11px] text-gray-400">~100 respostas simples</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-extrabold text-violet-700">R$ 29,99</p>
                    <p className="text-[10px] text-gray-400">R$ 0,30 / crédito</p>
                  </div>
                </button>

                {/* 200 credits — best value */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("200")}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left relative",
                    selectedPlan === "200"
                      ? "border-amber-400 bg-amber-50/60"
                      : "border-gray-200 hover:border-amber-200 hover:bg-gray-50"
                  )}
                >
                  <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    MELHOR VALOR
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    selectedPlan === "200" ? "border-amber-500 bg-amber-500" : "border-gray-300"
                  )}>
                    {selectedPlan === "200" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-800">200 créditos</p>
                    <p className="text-[11px] text-gray-400">~200 respostas simples</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-extrabold text-gray-900">R$ 39,99</p>
                    <p className="text-[10px] text-gray-400">R$ 0,20 / crédito</p>
                  </div>
                </button>
              </div>

              {/* Buy button + Footer */}
              <div className="px-5 pb-5 space-y-3">
                <button
                  onClick={() => {
                    if (!selectedPlan) return;
                    setCredits((prev) => prev + Number(selectedPlan));
                    setShowUpgradeModal(false);
                    setSelectedPlan(null);
                  }}
                  disabled={!selectedPlan}
                  className={cn(
                    "w-full py-3 rounded-xl text-[14px] font-bold transition-all duration-200",
                    selectedPlan
                      ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90 cursor-pointer shadow-md shadow-violet-500/20"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  Comprar
                </button>
                <p className="text-[10px] text-gray-400 text-center">
                  Créditos não expiram. Pagamento único, sem assinatura.
                </p>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
