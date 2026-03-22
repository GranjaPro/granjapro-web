"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestions = [
  { label: "Relatório de produção", description: "Resumo semanal de ovos", icon: Egg, prompt: "Gere um relatório resumido da produção de ovos desta semana." },
  { label: "Análise de mortalidade", description: "Últimos 30 dias", icon: Skull, prompt: "Analise a taxa de mortalidade dos últimos 30 dias e sugira ações." },
  { label: "Custos de ração", description: "Custo médio por ave", icon: Wheat, prompt: "Qual o custo médio de ração por ave neste mês?" },
  { label: "Projeção financeira", description: "Receitas e despesas", icon: DollarSign, prompt: "Faça uma projeção de receita e despesas para o próximo mês." },
  { label: "Tendência de postura", description: "Taxa dos últimos 7 dias", icon: TrendingUp, prompt: "Como está a tendência da taxa de postura nos últimos 7 dias?" },
  { label: "Checklist diário", description: "Tarefas de hoje", icon: ClipboardList, prompt: "Gere um checklist das tarefas diárias para a granja hoje." },
];

const mockResponses: Record<string, string> = {
  "Gere um relatório resumido da produção de ovos desta semana.":
    "Relatório Semanal de Produção\n\nDia          | Ovos    | Postura | Quebras\nSegunda   | 4.250   | 87,6%    | 32\nTerça        | 4.310   | 88,9%    | 28\nQuarta      | 4.180   | 86,2%    | 41\nQuinta      | 4.420   | 91,1%    | 25\nSexta        | 4.380   | 90,3%    | 30\nSábado     | 4.290   | 88,4%    | 35\nDomingo  | 4.150   | 85,6%    | 38\n\nTotal da semana: 29.980 ovos\nMédia diária: 4.283 ovos\nTaxa média de postura: 88,3%\nQuebras totais: 229 (0,76%)\n\nA produção está estável e dentro da meta semanal de 29.000 ovos.",
  "Analise a taxa de mortalidade dos últimos 30 dias e sugira ações.":
    "Análise de Mortalidade — Últimos 30 Dias\n\nTotal de óbitos: 47 aves\nTaxa de mortalidade: 0,89%\nMeta aceitável: < 1,0%\n\nDistribuição por galpão:\n• Galpão Vale Verde: 18 aves (0,37%)\n• Galpão Central: 22 aves (0,38%)\n• Galpão Nascente: 7 aves (adaptação)\n\nCausas identificadas:\n• Estresse térmico: 40%\n• Problemas respiratórios: 30%\n• Não identificadas: 30%\n\nRecomendações:\n1. Reforçar ventilação no Galpão Central nas horas mais quentes\n2. Verificar sistema de nebulização no Galpão Vale Verde\n3. Solicitar visita veterinária para investigar óbitos sem causa\n4. Monitorar temperatura interna dos galpões diariamente",
  "Qual o custo médio de ração por ave neste mês?":
    "Custo de Ração — Mês Atual\n\nConsumo total: 12.500 kg\nCusto total: R$ 18.750,00\nAves ativas: 10.650\n\nCusto por ave: R$ 1,76/mês\nCusto por ave/dia: R$ 0,059\nConsumo por ave/dia: 118g\n\nComparação com mês anterior:\n• Custo por ave: R$ 1,68 → R$ 1,76 (+4,8%)\n• Motivo: aumento de 3% no preço da ração\n\nSugestão: Considerar compra em maior volume para negociar desconto com o fornecedor.",
  "Faça uma projeção de receita e despesas para o próximo mês.":
    "Projeção Financeira — Próximo Mês\n\nReceitas estimadas:\n• Venda de ovos: R$ 42.000,00\n• Outras receitas: R$ 1.500,00\n• Total: R$ 43.500,00\n\nDespesas estimadas:\n• Ração: R$ 19.200,00\n• Mão de obra: R$ 15.900,00\n• Medicamentos: R$ 1.200,00\n• Energia/Água: R$ 2.800,00\n• Manutenção: R$ 1.500,00\n• Outros: R$ 800,00\n• Total: R$ 41.400,00\n\nLucro estimado: R$ 2.100,00\nMargem: 4,8%\n\nMargem apertada. Recomendo revisar custos de ração e buscar otimização logística nas entregas.",
  "Como está a tendência da taxa de postura nos últimos 7 dias?":
    "Tendência de Postura — Últimos 7 Dias\n\n15/03 — 85,6%\n16/03 — 87,6%\n17/03 — 88,9%\n18/03 — 86,2%\n19/03 — 91,1%\n20/03 — 90,3%\n21/03 — 88,4%\n\nMédia: 88,3%\nTendência: Leve alta\nPico: 91,1% (19/03)\n\nA taxa de postura está em tendência positiva. O lote principal está atingindo a fase de pico de produção.\n\nMantenha a nutrição equilibrada e evite estresse nas aves para sustentar essa tendência.",
  "Gere um checklist das tarefas diárias para a granja hoje.":
    "Checklist Diário — 21/03/2026\n\nManhã (06:00 - 10:00)\n• Verificar temperatura dos galpões\n• Abastecer comedouros\n• Verificar nível de água nos bebedouros\n• Primeira coleta de ovos\n• Registrar mortalidade matutina\n\nTarde (12:00 - 16:00)\n• Segunda coleta de ovos\n• Registrar produção no sistema\n• Verificar estoque de ração\n• Inspecionar aves visualmente\n• Limpar bandejas de dejetos\n\nFinal do dia (16:00 - 18:00)\n• Terceira coleta de ovos (se aplicável)\n• Fechar registros de produção do dia\n• Verificar trancas e segurança dos galpões\n• Atualizar dashboard financeiro\n• Revisar pedidos de clientes para amanhã",
};

export default function AssistenteIAPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  function sendMessage(text: string) {
    if (!text.trim() || isTyping || isStreaming) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const response = mockResponses[text.trim()] || `Com base nos dados da sua granja, aqui está minha análise sobre "${text.trim()}":\n\nOs indicadores atuais mostram que sua operação está dentro dos parâmetros normais. Recomendo monitorar diariamente os KPIs no dashboard para identificar variações.\n\nPara uma análise mais precisa, mantenha os registros de produção, ração e mortalidade sempre atualizados.`;

    setTimeout(() => {
      setIsTyping(false);
      setIsStreaming(true);
      setDisplayedText("");

      let i = 0;
      const speed = 8;
      function streamChar() {
        if (i < response.length) {
          setDisplayedText(response.slice(0, i + 1));
          i++;
          setTimeout(streamChar, speed);
        } else {
          const assistantMsg: Message = { id: Date.now() + 1, role: "assistant", content: response, timestamp: new Date() };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsStreaming(false);
          setDisplayedText("");
        }
      }
      streamChar();
    }, 800);
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

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] -mt-4 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 bg-white">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-chat"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#d4d4d8 transparent" }}
        >
          <div className={cn("p-4 sm:p-6 space-y-5 flex flex-col", showWelcome && "min-h-full")}>

            {/* Welcome State */}
            {showWelcome && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 via-violet-50 to-indigo-100 flex items-center justify-center">
                    <Sparkles className="w-9 h-9 text-violet-500" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center shadow-md">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">Como posso ajudar hoje?</h2>
                <p className="text-sm text-gray-400 max-w-sm mb-10 leading-relaxed">
                  Analiso dados de produção, custos, mortalidade e finanças da sua granja em tempo real.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full max-w-2xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSuggestion(s.prompt)}
                      className="group flex items-start gap-3 bg-gray-50/80 hover:bg-gradient-to-br hover:from-violet-50 hover:to-indigo-50 border border-gray-100 hover:border-violet-200 rounded-xl px-4 py-3.5 text-left transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-violet-100 border border-gray-100 group-hover:border-violet-200 flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-sm">
                        <s.icon className="w-4 h-4 text-gray-400 group-hover:text-violet-600 transition-colors duration-200" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-gray-700 group-hover:text-violet-700 block transition-colors duration-200">{s.label}</span>
                        <span className="text-[11px] text-gray-400 group-hover:text-violet-400 block mt-0.5 transition-colors duration-200">{s.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3 max-w-3xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-brand-500 to-brand-600"
                    : "bg-gradient-to-br from-violet-500 to-indigo-600"
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
                    : "bg-gray-50/80 text-gray-800 rounded-tl-md max-w-[85%] border border-gray-100"
                )}>
                  <div className={cn(
                    "text-[13px] whitespace-pre-wrap leading-[1.7]",
                    msg.role === "user" ? "text-white" : "text-gray-700"
                  )}>
                    {msg.content}
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 mt-2 pt-1.5",
                    msg.role === "user" ? "border-t border-white/15" : "border-t border-gray-200/60"
                  )}>
                    <span className={cn(
                      "text-[10px]",
                      msg.role === "user" ? "text-white/50" : "text-gray-400"
                    )}>
                      {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
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
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3.5">
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
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
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
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer"
            aria-label="Rolar para baixo"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-100 p-4 sm:p-5 flex-shrink-0 bg-white">
          <form onSubmit={handleSubmit} className="flex items-center justify-center gap-3 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
              aria-label="Nova conversa"
            >
              <RotateCcw className="w-4 h-4" />
              Nova conversa
            </button>
            <div className="flex-1 flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-300 focus-within:bg-white transition-all duration-200">
              <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre sua granja..."
                rows={1}
                className="bg-transparent text-base text-gray-700 placeholder-gray-400 outline-none w-full resize-none leading-relaxed max-h-[120px]"
                disabled={isBusy}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
                input.trim() && !isBusy
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/25 cursor-pointer"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              )}
              aria-label="Enviar mensagem"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
