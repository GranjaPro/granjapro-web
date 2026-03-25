"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Bird,
  Egg,
  Wheat,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Zap,
  Target,
  Scaling,
  Leaf,
  Phone,
  Mail,
  MapPin,
  BarChart3,
  Smartphone,
  Shield,
  TrendingUp,
  Check,
  Lock,
  Headphones,
  RefreshCw,
  Clock,
  Calculator,
  AlertTriangle,
  Eye,
} from "lucide-react";

/* ─── data ─── */

const navLinks = [
  { label: "Serviços", href: "#servicos" },
  { label: "Planos", href: "#precos" },
  { label: "Garantia", href: "#garantia" },
  { label: "FAQ", href: "#faq" },
];

const painPoints = [
  {
    icon: Clock,
    title: "Horas anotando tudo no caderno",
    description: "Horas calculando na mão o que já deveria ser automático.",
  },
  {
    icon: Calculator,
    title: "Dados espalhados e difíceis de entender",
    description: "Dados espalhados e difíceis de analisar.",
  },
  {
    icon: Eye,
    title: "Não sabe quantos ovos produz por dia",
    description: "Não sabe quanto produz, alimenta ou gasta.",
  },
  {
    icon: AlertTriangle,
    title: "Só percebe o prejuízo quando já é tarde",
    description: "Problemas viram prejuízo antes de você descobrir.",
  },
];

const featureTabs = [
  {
    id: "automacao",
    label: "Automação",
    icon: Zap,
    title: "Automatize inspeções de rotina",
    description:
      "Nosso sistema entrega insights acionáveis em minutos. Não são apenas dados — é o futuro da avicultura, hoje.",
  },
  {
    id: "precisao",
    label: "Precisão",
    icon: Target,
    title: "Controle preciso de cada lote",
    description:
      "Acompanhe curvas de postura, consumo de ração e saúde de cada lote com precisão milimétrica.",
  },
  {
    id: "escalabilidade",
    label: "Escalabilidade",
    icon: Scaling,
    title: "Cresça sem perder controle",
    description:
      "De 1 galpão a 100 — a plataforma escala com você. Gerencie múltiplas granjas em um só lugar.",
  },
  {
    id: "sustentabilidade",
    label: "Sustentabilidade",
    icon: Leaf,
    title: "Produza mais com menos desperdício",
    description:
      "Otimize o uso de ração, reduza perdas e monitore indicadores ambientais.",
  },
];

const services = [
  {
    title: "Produção em Tempo Real",
    description: "Acompanhe quantos ovos sua granja produz todos os dias e identifique quedas rapidamente.",
    icon: Bird,
    image: "/assets/images/producao_tempo_real.png",
  },
  {
    title: "Gestão de Lotes e Galpões",
    description: "Controle cada lote do início ao fim e entenda exatamente o desempenho da sua produção.",
    icon: Egg,
    image: "/assets/images/gestao_lotes.png",
  },
  {
    title: "Controle de Ração",
    description: "Saiba quanto sua granja consome e evite desperdícios com controle inteligente de ração.",
    icon: Wheat,
    image: "/assets/images/controle_racao.png",
  },
  {
    title: "Lucro e Finanças",
    description: "Veja quanto você ganha por dia e tenha controle completo das receitas e despesas da granja.",
    icon: BarChart3,
    image: "/assets/images/lucro_financas.png",
  },
  {
    title: "Alertas Inteligentes",
    description: "Receba alertas automáticos sobre mortalidade, queda de produção e falta de ração.",
    icon: Shield,
    image: "/assets/images/alertas_inteligentes.png",
    fit: "contain" as const,
  },
  {
    title: "Controle de Perdas",
    description: "Identifique onde você está perdendo ovos e dinheiro e corrija problemas antes que prejudiquem sua produção.",
    icon: TrendingUp,
    image: "/assets/images/controle_perdas.png",
  },
];

const faqs = [
  {
    question: "Preciso de cartão de crédito para testar?",
    answer: "Não. Você pode testar o Granja Pro gratuitamente por 14 Dias sem precisar cadastrar cartão de crédito.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim. Você pode cancelar a qualquer momento, sem taxas ou burocracia.",
  },
  {
    question: "O que acontece depois do período de teste?",
    answer: "Após os 14 Dias, você escolhe um plano para continuar usando. Se não quiser continuar, o acesso é pausado e não há cobrança.",
  },
  {
    question: "O sistema funciona para granjas pequenas?",
    answer: "Sim. O Granja Pro foi feito tanto para quem está começando quanto para quem já tem uma granja maior.",
  },
  {
    question: "Preciso entender de tecnologia para usar?",
    answer: "Não. O sistema é simples e feito para ser usado no dia a dia da granja, sem complicação.",
  },
  {
    question: "Posso acessar pelo celular?",
    answer: "Sim. Você pode acessar o Granja Pro pelo celular, tablet ou computador.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer: "Sim. Seus dados ficam protegidos e são salvos automaticamente.",
  },
  {
    question: "Posso mudar de plano depois?",
    answer: "Sim. Você pode mudar de plano a qualquer momento conforme sua granja cresce.",
  },
  {
    question: "O suporte ajuda na configuração?",
    answer: "Sim. Nossa equipe te ajuda a configurar e começar a usar o sistema sem dificuldade.",
  },
  {
    question: "O sistema realmente ajuda a melhorar a produção?",
    answer: "Sim. O Granja Pro mostra dados como produção, custo por ovo e desempenho da granja, ajudando você a tomar decisões melhores.",
  },
];

const pricingPlans = [
  {
    name: "ESSENCIAL",
    description: "Saia do caderno e comece a controlar sua granja",
    price: "44,90",
    features: [
      "Até 300 galinhas",
      "Registro de produção de ovos",
      "Registro de vendas",
      "Registro de fornecedores",
      "Controle de mortalidade",
      "Controle de lotes e galpões",
      "Controle de ração",
      "Controle de estoque e insumos",
      "Dashboards simples",
      "Até 1 usuário",
    ],
    excluded: [
      "Relatórios avançados",
      "Exportação de dados",
      "Alertas automáticos",
      "IA completa",
    ],
    cta: "Começar Agora",
    highlighted: false,
  },
  {
    name: "PROFISSIONAL",
    description: "Descubra se sua granja está dando lucro ou prejuízo",
    price: "66,90",
    features: [
      "Tudo do ESSENCIAL +",
      "Até 1000 galinhas",
      "Produção por período",
      "Comparação semanal / mensal",
      "Ovos por galinha",
      "Custo por ovo",
      "Previsões de produção e custo",
      "Gestão de colaboradores e tarefas",
      "IA do Granja Pro",
      "IA analisa sua granja automaticamente",
      "Chat inteligente e recomendações com IA",
      "Receba alertas quando sua produção cair",
      "Relatórios em PDF e Excel",
      "Até 2 usuários",
      "Histórico de até 12 meses",
    ],
    excluded: [],
    cta: "Escolher Profissional",
    highlighted: true,
  },
  {
    name: "PREMIUM",
    description: "Controle total e inteligência avançada da sua granja",
    price: "99,90",
    features: [
      "Tudo do PROFISSIONAL +",
      "Galinhas ilimitadas",
      "IA avançada",
      "Previsões de produção com IA",
      "Análises contínuas",
      "Comparação com outras granjas",
      "Ranking de desempenho",
      "Lembretes automáticos",
      "Rotinas e tarefas",
      "Histórico completo de lotes",
      "Histórico ilimitado",
      "Suporte prioritário",
      "Até 5 usuários",
    ],
    excluded: [],
    cta: "Teste Grátis por 14 Dias",
    highlighted: false,
  },
];

/* ─── hooks ─── */

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

/* ─── components ─── */

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 sm:py-6 text-left cursor-pointer group"
      >
        <span className="flex items-center gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-sm font-semibold text-brand-600 group-hover:bg-brand-100 transition-colors">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-base font-medium text-gray-900 group-hover:text-brand-600 transition-colors pr-4">
            {question}
          </span>
        </span>
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? "bg-brand-500 rotate-180" : "bg-gray-100 group-hover:bg-brand-50"}`}>
          <ChevronDown className={`w-4 h-4 transition-colors ${isOpen ? "text-white" : "text-gray-500"}`} />
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? "max-h-40 pb-6" : "max-h-0"
        }`}
      >
        <p className="text-sm text-gray-500 leading-relaxed pl-12">{answer}</p>
      </div>
    </div>
  );
}

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function PricingSection() {
  return (
    <section id="precos" className="relative py-14 sm:py-16 overflow-hidden bg-brand-950">
      {/* Decorative blurs */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-brand-300/8 rounded-full blur-3xl" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="text-center mb-14">
          <span className="inline-flex items-center text-xs font-semibold text-brand-300 border border-brand-400/30 rounded-full px-4 py-1.5 mb-4 bg-brand-500/10 backdrop-blur-sm uppercase tracking-wider">
            Planos & Preços
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Escolha o plano ideal para sua granja
          </h2>
          <p className="text-gray-300 max-w-lg mx-auto">
            Comece pequeno e escale conforme sua operação cresce. Sem surpresas.
          </p>
        </AnimatedSection>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {pricingPlans.map((plan, i) => (
            <AnimatedSection key={plan.name} delay={i * 120}>
              <div
                className={`relative rounded-3xl p-7 transition-all duration-300 h-full flex flex-col ${
                  plan.highlighted
                    ? "bg-white text-gray-900 shadow-2xl shadow-brand-500/20 md:scale-[1.03] ring-2 ring-brand-400/50"
                    : "bg-white/10 backdrop-blur-md text-white border border-white/15 hover:bg-white/15"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-full px-4 py-1.5 shadow-lg shadow-brand-500/30 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Mais Popular + Inteligência Artificial
                    </span>
                  </div>
                )}
                {plan.name === "ESSENCIAL" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Inteligência Artificial Experimental
                    </span>
                  </div>
                )}
                {plan.name === "PREMIUM" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-200 bg-brand-950 border border-brand-400/30 rounded-full px-4 py-1.5 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Inteligência Artificial Avançada
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className={`font-heading text-lg font-bold mb-1 ${plan.highlighted ? "text-gray-900" : "text-white"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.highlighted ? "text-gray-500" : "text-white/60"}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-medium ${plan.highlighted ? "text-gray-500" : "text-white/60"}`}>
                      R$
                    </span>
                    <span className={`font-heading font-bold tracking-tight ${plan.highlighted ? "text-[2.75rem] sm:text-5xl text-gray-900" : "text-4xl text-white"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm font-medium ${plan.highlighted ? "text-gray-500" : "text-white/60"}`}>
                      /mês
                    </span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className={`group w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer mb-6 ${
                    plan.highlighted
                      ? "bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/20 hover:-translate-y-0.5"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <div className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? "bg-brand-100" : "bg-white/10"
                      }`}>
                        <Check className={`w-3 h-3 ${plan.highlighted ? "text-brand-600" : "text-brand-300"}`} />
                      </div>
                      <span className={`text-sm leading-snug ${plan.highlighted ? "text-gray-600" : "text-white/80"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {plan.excluded.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-white/10">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white/70 mb-3">
                      <X className="w-4 h-4 text-red-400" />
                      Não inclui
                    </p>
                    <div className="space-y-2.5">
                      {plan.excluded.map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                          <span className="text-sm text-white/50">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Essentials banner */}
        <AnimatedSection className="mt-14" delay={400}>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Animated gradient border */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-brand-500/50 via-brand-300/30 to-brand-500/50" />

            <div className="relative rounded-3xl bg-brand-950/90 backdrop-blur-xl p-8 sm:p-10">
              {/* Glow effects */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand-400/15 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-48 h-24 bg-brand-500/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 right-1/4 w-48 h-24 bg-brand-300/10 rounded-full blur-2xl" />

              <div className="relative flex flex-col lg:flex-row items-center gap-8">
                {/* Left: headline */}
                <div className="flex-1 text-center lg:text-left">
                  <p className="text-xs font-semibold text-brand-300 uppercase tracking-widest mb-2">Em todos os planos</p>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Sem limites para o<br className="hidden sm:block" /> essencial da sua granja
                  </h3>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-20 bg-gradient-to-b from-transparent via-brand-400/30 to-transparent" />
                <div className="lg:hidden w-48 h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />

                {/* Right: features as pills */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  {[
                    { label: "Produção de ovos", icon: Egg },
                    { label: "Mortalidade", icon: Shield },
                    { label: "Ração", icon: Wheat },
                    { label: "Vendas", icon: TrendingUp },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="group flex items-center gap-2.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] rounded-full px-4 py-2.5 transition-all duration-200 cursor-default"
                    >
                      <item.icon className="w-4 h-4 text-brand-400" />
                      <span className="text-sm font-medium text-white/90">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── page ─── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl ${
          scrolled
            ? "bg-white/60 shadow-lg shadow-black/[0.04] border-b border-white/40"
            : "bg-white/10 border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-shadow">
                <Bird className="w-5 h-5 text-white" />
              </div>
              <span className={`font-heading font-bold text-lg tracking-tight transition-colors ${scrolled ? "text-gray-800" : "text-white"}`}>
                Granja Pro
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                    scrolled
                      ? "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/cadastro"
              className={`hidden sm:inline-flex items-center text-sm px-5 py-2.5 rounded-full font-semibold transition-all duration-200 cursor-pointer ${scrolled ? "text-gray-700 hover:text-brand-600 hover:bg-gray-100" : "text-white/90 hover:text-white hover:bg-white/10"}`}
            >
              Cadastre-se
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 text-sm bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-200 shadow-md shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-px cursor-pointer"
            >
              Entrar
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl transition-colors cursor-pointer ${scrolled ? "text-gray-700 hover:bg-white/50" : "text-white hover:bg-white/10"}`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-white/70 backdrop-blur-2xl border-t border-white/30 px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 py-3 px-4 rounded-xl transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/cadastro"
              className="block text-sm text-gray-700 text-center px-5 py-3 rounded-xl font-semibold mt-3 border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              Cadastre-se
            </Link>
            <Link
              href="/dashboard"
              className="block text-sm bg-brand-500 text-white text-center px-5 py-3 rounded-xl font-semibold mt-2 cursor-pointer"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/90 via-brand-900/80 to-brand-950/95" />

        {/* Decorative blurs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-300/15 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 pt-20 pb-24">
<h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-8 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            <span className="block">Saiba exatamente quanto</span>
            <span className="block">você ganha na sua granja</span>
            <span className="block text-gradient-hero">todos os dias</span>
          </h1>

          <p
            className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            Controle produção, perdas, ração, receita e muito mais em um único app simples no computador, tablet ou celular.
          </p>

          <div
            className="flex flex-col items-center animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            {/* CTA cluster */}
            <div className="relative">
              {/* Glow behind button */}
              <div className="absolute -inset-4 bg-brand-500/20 rounded-full blur-2xl" />

              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-3 bg-brand-500 hover:bg-brand-400 text-white px-9 py-4 rounded-full font-semibold text-base transition-all duration-300 shadow-2xl shadow-brand-500/30 hover:shadow-brand-400/40 hover:-translate-y-1 cursor-pointer"
              >
                Testar Grátis por 14 Dias
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-6 mt-7">
              <span className="text-[13px] text-white/50 tracking-wide font-medium">Sem cartão de crédito</span>
              <span className="w-px h-3 bg-white/25" />
              <span className="text-[13px] text-white/50 tracking-wide font-medium">Cancele quando quiser</span>
            </div>

            {/* Scroll indicator */}
            <a
              href="#sobre"
              className="mt-12 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              <span className="text-[11px] uppercase tracking-[0.2em]">Saiba mais</span>
              <ChevronDown className="w-4 h-4 animate-[float_2s_ease-in-out_infinite]" />
            </a>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Problems ── */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-white via-gray-50/80 to-white">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -left-32 w-72 h-72 bg-red-100/40 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-32 w-72 h-72 bg-amber-100/40 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Você ainda controla sua granja no caderno ou de cabeça?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Sem controle, você não sabe quanto está produzindo, gastando ou perdendo dinheiro na granja.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
              {painPoints.map((pain, i) => (
                <div
                  key={pain.title}
                  className="group relative cursor-pointer rounded-3xl p-[1px] bg-gradient-to-br from-gray-200/80 via-white to-gray-100/60 hover:from-red-200/60 hover:via-white hover:to-red-100/40 transition-all duration-500"
                >
                  <div className="relative h-full rounded-[23px] bg-white/90 backdrop-blur-sm p-7 sm:p-8 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-red-100/30 group-hover:-translate-y-1">
                    {/* Number indicator */}
                    <span className="absolute top-6 right-7 text-5xl font-bold text-gray-100 group-hover:text-red-50 transition-colors duration-300 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="relative flex flex-col gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/80 group-hover:from-red-100 group-hover:to-red-200/80 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                        <pain.icon className="w-5.5 h-5.5 text-red-500 group-hover:text-red-600 transition-colors duration-300" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-950 transition-colors duration-300">
                          {pain.title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors duration-300">
                          {pain.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection className="text-center mt-14">
            <p className="text-lg sm:text-xl font-medium text-gray-800">
              No fim do mês, você não sabe se está{" "}
              <span className="text-red-500 font-semibold">lucrando</span> ou{" "}
              <span className="text-red-500 font-semibold">perdendo dinheiro</span>.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Transition ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <AnimatedSection className="text-center max-w-7xl mx-auto">
          <div className="w-12 h-[2px] bg-brand-300/60 mx-auto mb-8 rounded-full" />
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            Agora imagine ter{" "}
            <span className="text-gradient">tudo isso sob controle</span>.
          </h2>
          <div className="w-12 h-[2px] bg-brand-300/60 mx-auto mt-8 rounded-full" />
          <div className="mt-12 sm:mt-16">
            <img
              src="/assets/images/dashboard.png"
              alt="Dashboard preview"
              className="w-full mx-auto rounded-xl shadow-2xl"
            />
          </div>
        </AnimatedSection>
      </section>

      {/* ── Services ── */}
      <section id="servicos" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#F8F9FA]">
        {/* Subtle background texture */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-100/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <span className="inline-flex items-center text-xs font-semibold text-brand-600 border border-brand-200 rounded-full px-4 py-1.5 mb-6 bg-white uppercase tracking-wider shadow-sm">
              Serviços
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight max-w-3xl mx-auto leading-tight">
              Tudo que você precisa para{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600">
                controlar e lucrar
              </span>{" "}
              com sua granja
            </h2>
            <p className="mt-5 text-gray-500 text-lg max-w-xl mx-auto">
              Ferramentas inteligentes feitas para o dia a dia do avicultor
            </p>
          </AnimatedSection>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, i) => (
              <AnimatedSection key={service.title} delay={i * 100}>
                <div className="group relative h-full rounded-3xl overflow-hidden bg-white border border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-brand-500/5 hover:border-brand-200/50 transition-all duration-500 cursor-pointer hover:-translate-y-1">
                  <div className={`relative overflow-hidden ${service.fit === "contain" ? "h-52" : "h-48"}`}>
                    <img
                      src={service.image}
                      alt={service.title}
                      className={`absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-700 ${service.fit === "contain" ? "object-contain p-2 bg-white" : "object-cover"}`}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                        <service.icon className="w-5 h-5 text-brand-600" />
                      </div>
                      <h3 className="font-heading font-bold text-gray-900 text-lg group-hover:text-brand-600 transition-colors">
                        {service.title}
                      </h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed pl-[52px]">
                      {service.description}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Garantia ── */}
      <section id="garantia" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <AnimatedSection className="text-center mb-12">
            <span className="inline-flex items-center text-xs font-semibold text-brand-600 border border-brand-200 rounded-full px-4 py-1.5 mb-5 bg-brand-50 uppercase tracking-wider">
              Sua segurança
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Comece sem risco, cancele quando quiser
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Use por 14 Dias. Se fizer sentido para sua granja, o pagamento vem somente depois do teste.
            </p>
          </AnimatedSection>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Shield,
                accent: "bg-emerald-500",
                iconBg: "bg-emerald-50",
                iconColor: "text-emerald-600",
                title: "14 Dias de garantia",
                description: "Ficando satisfeito, o pagamento ocorre somente após concluído o período de teste.",
              },
              {
                icon: Lock,
                accent: "bg-brand-500",
                iconBg: "bg-brand-50",
                iconColor: "text-brand-600",
                title: "Seus dados protegidos",
                description: "Seus dados ficam seguros com criptografia e backups automáticos.",
              },
              {
                icon: Headphones,
                accent: "bg-violet-500",
                iconBg: "bg-violet-50",
                iconColor: "text-violet-600",
                title: "Suporte feito para quem cria galinhas",
                description: "Nossa equipe te ajuda a configurar e usar o sistema no dia a dia.",
              },
            ].map((card, i) => (
              <AnimatedSection key={card.title} delay={i * 100}>
                <div className="group relative bg-[#F8F9FA] rounded-2xl p-6 sm:p-7 h-full cursor-default overflow-hidden hover:bg-[#F3F4F6] transition-colors duration-300">
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-6 right-6 h-[2px] ${card.accent} rounded-full opacity-60`} />

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-5`}>
                    <card.icon className={`w-[18px] h-[18px] ${card.iconColor}`} strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <h3 className="font-heading text-[15px] font-semibold text-gray-900 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Bottom CTA strip */}
          <AnimatedSection className="mt-10" delay={350}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 bg-gray-900 rounded-2xl px-7 sm:px-10 py-6">
              <div className="text-center sm:text-left">
                <p className="text-white font-medium text-[15px]">
                  Comece hoje. Cancele a qualquer momento.
                </p>
                <p className="text-gray-400 text-sm mt-0.5">
                  Sem contrato, sem compromisso.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm px-7 py-3 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0"
              >
                Testar grátis por 14 Dias
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#F8F9FA]">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <AnimatedSection className="text-center mb-12">
            <span className="inline-flex items-center text-xs font-semibold text-brand-600 border border-brand-200 rounded-full px-4 py-1.5 mb-5 bg-brand-50 uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Ainda tem dúvidas?
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Tire suas dúvidas sobre a plataforma. Não encontrou o que procura? Fale conosco.
            </p>
          </AnimatedSection>

          {/* Two-column accordion */}
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              {/* Left column */}
              <div className="bg-white rounded-2xl px-6 sm:px-7">
                {faqs.slice(0, 5).map((faq, i) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                    index={i}
                  />
                ))}
              </div>
              {/* Right column */}
              <div className="bg-white rounded-2xl px-6 sm:px-7 mt-4 lg:mt-0">
                {faqs.slice(5).map((faq, i) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                    index={i + 5}
                  />
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Contact CTA */}
          <AnimatedSection className="mt-10 text-center" delay={200}>
            <Link
              href="#contato"
              className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-7 py-3 rounded-full font-medium text-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
            >
              Fale Conosco
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contato" className="bg-brand-950 text-white relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <Bird className="w-5 h-5 text-white" />
                </div>
                <span className="font-heading font-bold text-lg">Granja Pro</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Plataforma #1 de gestão inteligente para avicultura de postura no
                Brasil.
              </p>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-sm mb-5 text-white/90">Links Rápidos</h4>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-sm mb-5 text-white/90">Serviços</h4>
              <ul className="space-y-3">
                {services.map((service) => (
                  <li key={service.title}>
                    <span className="text-sm text-gray-400">
                      {service.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-sm mb-5 text-white/90">Contato</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-800/50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-sm text-gray-400">(61) 9 9901-2004</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-800/50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-sm text-gray-400">contato@granjapro.com</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-800/50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-sm text-gray-400">São Paulo, SP &mdash; Brasil</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-brand-800/60 mt-14 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              &copy; 2026 Granja Pro. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                Privacidade
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                Termos
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Floating Button ── */}
      <a
        href="https://wa.me/5561999012004"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco pelo WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-7 h-7"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
