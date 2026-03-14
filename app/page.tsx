import Image from "next/image";
import Link from "next/link";

const features = [
  {
    icon: "🥚",
    title: "Controle de Produção",
    description:
      "Registre ovos produzidos, quebrados e descartados por dia. Veja taxa de postura e tendências de produção.",
  },
  {
    icon: "🐔",
    title: "Gestão de Lotes",
    description:
      "Gerencie lotes por raça, idade e galpão com curvas de postura automáticas.",
  },
  {
    icon: "🌾",
    title: "Otimização de Ração",
    description:
      "Rastreie consumo de ração, custos e conversão. Otimize estratégias de alimentação por lucro.",
  },
  {
    icon: "💰",
    title: "Controle Financeiro",
    description:
      "Controle receitas, despesas e lucratividade com análise de custo por ovo.",
  },
  {
    icon: "🤖",
    title: "Assistente IA",
    description:
      "Recomendações inteligentes sobre produção, ração, saúde e otimização da granja.",
  },
  {
    icon: "🏥",
    title: "Saúde & Conformidade",
    description:
      "Calendário de vacinação, registros de saúde, alertas de mortalidade e gestão de certificações.",
  },
];

const plans = [
  {
    name: "Básico",
    price: "R$ 79",
    period: "/mês",
    description: "Para granjas pequenas até 2.000 aves",
    features: [
      "1 Granja",
      "2 Galpões",
      "Controle de produção",
      "Relatórios básicos",
      "Acesso mobile",
    ],
    cta: "Começar Grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 199",
    period: "/mês",
    description: "Para granjas médias até 10.000 aves",
    features: [
      "3 Granjas",
      "Galpões ilimitados",
      "Todos os módulos",
      "Assistente IA",
      "Analytics avançado",
      "CRM & Vendas",
      "Exportação de relatórios",
    ],
    cta: "Começar Grátis",
    highlight: true,
    badge: "Mais Popular",
  },
  {
    name: "Enterprise",
    price: "R$ 599",
    period: "/mês",
    description: "Para grandes operações",
    features: [
      "Granjas ilimitadas",
      "Todos os recursos Pro",
      "Analytics preditivo",
      "Suporte prioritário",
      "Integrações personalizadas",
      "Gestão de funcionários",
      "Acesso à API",
    ],
    cta: "Falar com Vendas",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            <span className="font-bold text-gray-900">Granja Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Entrar
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-3 py-1 mb-6">
            <span>📱 Mobile-first</span>
            <span>•</span>
            <span>🤖 Powered by IA</span>
            <span>•</span>
            <span>🌿 Feito para granjeiros</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            O Sistema Operacional das{" "}
            <span className="text-brand-600">Granjas de Ovos</span>
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Gerencie produção, finanças, lotes, ração, saúde e vendas — tudo em
            uma plataforma feita para pequenos e médios produtores de ovos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors text-base"
            >
              Começar Teste Grátis →
            </Link>
            <button className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-colors text-base">
              Ver Demo
            </button>
          </div>
        </div>

        {/* Hero image */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
            <Image
              src="/assets/images/landing_page.png"
              alt="Granja Pro dashboard"
              width={1200}
              height={700}
              className="w-full object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Tudo que sua Granja Precisa
            </h2>
            <p className="text-gray-600">
              20+ módulos integrados desenvolvidos especificamente para
              avicultura de postura.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 border border-gray-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1 text-brand-700">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Preços Simples e Transparentes
            </h2>
            <p className="text-gray-600">
              Comece grátis. Escale conforme cresce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 border ${
                  plan.highlight
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3
                    className={`font-bold text-lg ${plan.highlight ? "text-white" : "text-gray-900"}`}
                  >
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-3xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm ${plan.highlight ? "text-brand-100" : "text-gray-500"}`}
                    >
                      {plan.period}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${plan.highlight ? "text-brand-100" : "text-gray-500"}`}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <span
                        className={`${plan.highlight ? "text-brand-200" : "text-brand-600"}`}
                      >
                        ✓
                      </span>
                      <span className={plan.highlight ? "text-brand-50" : "text-gray-700"}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={`block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-white text-brand-700 hover:bg-brand-50"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              Granja Pro
            </span>
          </div>
          <p className="text-xs text-gray-400">
            © 2026 Granja Pro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
