"use client";

import Link from "next/link";
import { useState } from "react";
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
} from "lucide-react";

const navLinks = [
  { label: "Sobre", href: "#sobre" },
  { label: "Recursos", href: "#recursos" },
  { label: "Serviços", href: "#servicos" },
  { label: "FAQ", href: "#faq" },
  { label: "Contato", href: "#contato" },
];

const stats = [
  { value: "98%", label: "Precisão na Saúde do Lote" },
  { value: "7X", label: "Decisões Mais Rápidas com Dados em Tempo Real" },
  { value: "24/7", label: "Monitoramento Remoto da Granja" },
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
      "Acompanhe curvas de postura, consumo de ração e saúde de cada lote com precisão milimétrica. Identifique problemas antes que afetem a produção.",
  },
  {
    id: "escalabilidade",
    label: "Escalabilidade",
    icon: Scaling,
    title: "Cresça sem perder controle",
    description:
      "De 1 galpão a 100 — a plataforma escala com você. Gerencie múltiplas granjas, equipes e operações em um só lugar.",
  },
  {
    id: "sustentabilidade",
    label: "Sustentabilidade",
    icon: Leaf,
    title: "Produza mais com menos desperdício",
    description:
      "Otimize o uso de ração, reduza perdas e monitore indicadores ambientais. Avicultura sustentável e lucrativa.",
  },
];

const services = [
  {
    title: "Gestão de Lotes",
    description: "Controle inteligente para aviários de postura",
    icon: Bird,
  },
  {
    title: "Controle de Produção",
    description: "Monitoramento de ovos em tempo real",
    icon: Egg,
  },
  {
    title: "Controle de Ração",
    description: "Otimização de custos por conversão alimentar",
    icon: Wheat,
  },
];

const faqs = [
  {
    question: "Que tipo de granjas o sistema suporta?",
    answer:
      "Suportamos uma grande variedade — desde pequenas granjas de postura até grandes operações com múltiplos galpões e filiais.",
  },
  {
    question: "Preciso de experiência técnica para usar?",
    answer:
      "Não! A plataforma foi projetada para ser intuitiva. Oferecemos treinamento e suporte completo para que você comece a usar rapidamente.",
  },
  {
    question: "Posso integrar com meu software de gestão atual?",
    answer:
      "Sim, oferecemos integrações via API com os principais ERPs e sistemas de gestão agrícola do mercado.",
  },
  {
    question: "Qual a precisão do sistema de monitoramento?",
    answer:
      "Nosso sistema alcança 98% de precisão no monitoramento de saúde dos lotes, com alertas automáticos para qualquer anomalia detectada.",
  },
  {
    question: "Qual o alcance e autonomia do monitoramento?",
    answer:
      "O sistema funciona 24/7 com monitoramento remoto via sensores IoT, com autonomia total e alertas em tempo real no seu celular.",
  },
  {
    question: "O sistema funciona em áreas com internet limitada?",
    answer:
      "Sim, o sistema opera offline e sincroniza automaticamente quando a conexão é restabelecida. Ideal para áreas rurais.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer group"
      >
        <span className="text-base font-medium text-gray-900 group-hover:text-brand-700 transition-colors pr-4">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-brand-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-40 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm text-gray-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <Bird className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">
                Granja Pro
              </span>
            </Link>

            <div className="hidden lg:block w-px h-6 bg-gray-200" />

            <nav className="hidden lg:flex items-center gap-7">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 text-sm bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-full font-medium transition-colors cursor-pointer"
            >
              Entrar
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-gray-700 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/dashboard"
              className="block text-sm bg-brand-500 text-white text-center px-5 py-2.5 rounded-full font-medium mt-3 cursor-pointer"
            >
              Entrar
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-0 bg-white">
        <div className="mx-4 sm:mx-6 lg:mx-8 relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/80 via-brand-900/65 to-brand-900/85" />
          <div className="relative flex flex-col items-center justify-center text-center px-4 sm:px-8 pt-20 sm:pt-28 pb-20 sm:pb-28">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-8 max-w-4xl">
              <span className="block mb-4 sm:mb-6">Seu Parceiro de Confiança em</span>
              <span className="block">Avicultura Inteligente</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-200 max-w-2xl mb-10 tracking-wide">
              <span className="block mb-3">Revolucionando a avicultura com tecnologia de precisão. Do monitoramento de</span>
              <span className="block">lotes à otimização de produção, atendendo as necessidades de cada granja.</span>
            </p>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-full font-semibold text-base transition-all duration-200 shadow-lg cursor-pointer"
            >
              Agende uma Consulta Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Colha os Resultados de Usar o{" "}
            <span className="text-brand-600">Granja Pro</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-5xl sm:text-6xl font-extrabold text-brand-700 mb-2">
                  {stat.value}
                </div>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Tudo que sua granja precisa
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Recursos projetados especificamente para avicultura de postura.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featureTabs.map((feature) => (
              <div
                key={feature.id}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/40 transition-all duration-300 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">
                  {feature.label}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre o Granja Pro */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column - Text */}
            <div className="lg:col-span-5">
              <span className="inline-flex items-center text-xs font-medium text-brand-700 border border-brand-200 rounded-full px-4 py-1.5 mb-6 bg-brand-50/50">
                Quem somos
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 leading-[1.15] tracking-tight mb-5">
                Transformando a Avicultura com{" "}
                <span className="italic text-brand-600 font-semibold">
                  Tecnologia e Inovação
                </span>
              </h2>

              <p className="text-gray-500 leading-relaxed mb-8 max-w-md">
                Combinamos sensores avançados, inteligência artificial e monitoramento
                em tempo real para empoderar avicultores em todo o Brasil,
                garantindo máxima produtividade.
              </p>

              <Link
                href="#contato"
                className="group inline-flex items-center gap-3 cursor-pointer"
              >
                <span className="bg-brand-100 text-brand-800 text-sm font-semibold px-5 py-2.5 rounded-full group-hover:bg-brand-200 transition-colors">
                  Saiba Mais
                </span>
                <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-brand-700" />
                </span>
              </Link>
            </div>

            {/* Middle Column - Cards */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-end gap-1 mb-4 h-12">
                  {[40, 65, 50, 80, 55, 75, 90, 60].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-brand-500/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Monitoramento em tempo real e acesso ao dashboard mobile
                </p>
              </div>

              <div className="bg-accent-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-4xl font-extrabold text-gray-900">2.4k</span>
                  <Leaf className="w-5 h-5 text-brand-400" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Mais de 2.400 granjas já utilizam a plataforma em todo o país,
                  fazendo a diferença.
                </p>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="lg:col-span-4 relative">
              <div className="rounded-2xl overflow-hidden shadow-lg h-[380px] sm:h-[440px]">
                <img
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&q=80"
                  alt="Produtor usando app de monitoramento da granja no celular"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* Services */}
      <section id="servicos" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Nossos Serviços
            </h2>
            <Link
              href="#servicos"
              className="hidden sm:inline-flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors cursor-pointer"
            >
              Ver Todos
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 cursor-pointer"
              >
                <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                  <service.icon className="w-16 h-16 text-brand-600/40" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-brand-700 text-lg mb-1 group-hover:text-brand-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote / CTA Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-brand-900/70" />
        <div className="relative max-w-3xl mx-auto text-center px-4 sm:px-6">
          <div className="bg-brand-900/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-brand-700/30">
            <p className="text-lg sm:text-xl text-white leading-relaxed font-medium italic">
              &ldquo;Avicultura não é mais adivinhação. Com o Granja Pro, estamos
              levando inteligência baseada em dados para as mãos de cada
              produtor.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-6">
                Perguntas
                <br />
                Frequentes
              </h2>
              <Link
                href="#contato"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-full font-medium text-sm transition-colors cursor-pointer"
              >
                Fale Conosco
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="lg:col-span-8">
              <div className="border border-gray-200 rounded-2xl px-6">
                {faqs.map((faq) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                  <Bird className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">Granja Pro</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Plataforma #1 de gestão inteligente para avicultura de postura no
                Brasil.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Links Rápidos</h4>
              <ul className="space-y-2.5">
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
              <h4 className="font-semibold text-sm mb-4">Serviços</h4>
              <ul className="space-y-2.5">
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
              <h4 className="font-semibold text-sm mb-4">Contato</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <span className="text-sm text-gray-400">(11) 9 9999-9999</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <span className="text-sm text-gray-400">contato@granjapro.com</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-400">São Paulo, SP &mdash; Brasil</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-brand-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
    </div>
  );
}
