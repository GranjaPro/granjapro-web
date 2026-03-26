"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Shield, Users, CreditCard, Brain, Scale, AlertTriangle, Server, Ban, RefreshCw, Lock, MessageSquare, Landmark, FlaskConical, ChevronRight, ScrollText } from "lucide-react";

const sections = [
  { n: "1", title: "Identificação", icon: Users },
  { n: "2", title: "Aceite dos Termos", icon: FileText },
  { n: "3", title: "Descrição do Serviço", icon: Server },
  { n: "4", title: "Cadastro e Conta", icon: Users },
  { n: "5", title: "Planos e Cobrança", icon: CreditCard },
  { n: "6", title: "Uso da Plataforma", icon: Shield },
  { n: "7", title: "Propriedade Intelectual", icon: Lock },
  { n: "8", title: "Dados do Usuário", icon: Shield },
  { n: "9", title: "Inteligência Artificial", icon: Brain },
  { n: "10", title: "Limitação de Responsabilidade", icon: AlertTriangle },
  { n: "11", title: "Disponibilidade", icon: Server },
  { n: "12", title: "Cancelamento", icon: Ban },
  { n: "13", title: "Suspensão ou Bloqueio", icon: Ban },
  { n: "14", title: "Alterações dos Termos", icon: RefreshCw },
  { n: "15", title: "Privacidade", icon: Lock },
  { n: "16", title: "Reajustes", icon: CreditCard },
  { n: "17", title: "Uso de Dados", icon: Brain },
  { n: "18", title: "Feedback", icon: MessageSquare },
  { n: "19", title: "Legislação e Foro", icon: Landmark },
  { n: "20", title: "Fase de Testes (Beta)", icon: FlaskConical },
];

export default function TermosDeUsoPage() {
  const [activeSection, setActiveSection] = useState<string>("1");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const sorted = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const id = sorted[0].target.id.replace("section-", "");
          setActiveSection(id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(`section-${s.n}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a3a2a] via-[#22543d] to-[#1a3a2a]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-brand-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-emerald-300 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-6 pb-14">
          <Link href="/signup" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao cadastro
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Termos de Uso</h1>
              <p className="mt-2 text-white/50 text-sm">Granja Pro — Última atualização: 26/03/2026</p>
              <p className="mt-4 text-white/70 leading-relaxed max-w-2xl text-sm">
                Bem-vindo ao Granja Pro, plataforma digital de gestão agropecuária. Ao acessar ou utilizar nossos serviços, você concorda com os presentes Termos de Uso.
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            <SectionCard id="1" icon={Users} title="Identificação">
              <p>O Granja Pro é uma plataforma digital operada por pessoa física:</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 not-prose">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Responsável</span>
                  <span className="text-sm text-gray-900 font-semibold">Samuel Mota</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">E-mail</span>
                  <span className="text-sm text-gray-900 font-semibold">samuel.mota.2010@gmail.com</span>
                </div>
              </div>
              <p>O Granja Pro encontra-se em fase inicial de desenvolvimento e poderá passar por alterações a qualquer momento.</p>
            </SectionCard>

            <SectionCard id="2" icon={FileText} title="Aceite dos Termos">
              <p>Ao criar uma conta ou utilizar a plataforma, o usuário declara que:</p>
              <ul>
                <li>Leu, compreendeu e concorda com estes Termos;</li>
                <li>Possui capacidade legal para contratar;</li>
                <li>Utilizará o serviço de forma lícita.</li>
              </ul>
            </SectionCard>

            <SectionCard id="3" icon={Server} title="Descrição do Serviço">
              <p>O Granja Pro é um software (SaaS) que oferece ferramentas de apoio à gestão agropecuária, incluindo:</p>
              <ul>
                <li>Controle de produção;</li>
                <li>Gestão de estoque;</li>
                <li>Monitoramento financeiro;</li>
                <li>Indicadores operacionais;</li>
                <li>Recomendações baseadas em dados e inteligência artificial.</li>
              </ul>
              <p>O serviço possui caráter auxiliar, não substituindo a análise técnica ou a tomada de decisão do usuário.</p>
            </SectionCard>

            <SectionCard id="4" icon={Users} title="Cadastro e Conta">
              <p>Para utilizar o serviço, o usuário deverá fornecer informações verídicas, tais como:</p>
              <ul>
                <li>Nome;</li>
                <li>E-mail;</li>
                <li>Senha.</li>
              </ul>
              <p>O usuário é responsável por manter a confidencialidade de sua conta e por todas as atividades realizadas nela.</p>
            </SectionCard>

            <SectionCard id="5" icon={CreditCard} title="Planos, Pagamentos e Cobrança">
              <p>O Granja Pro poderá oferecer planos gratuitos e pagos, com diferentes funcionalidades.</p>
              <ul>
                <li>A cobrança poderá ser mensal ou anual;</li>
                <li>A renovação será automática, salvo cancelamento;</li>
                <li>O não pagamento poderá resultar na suspensão do serviço;</li>
                <li>Eventuais períodos de teste poderão ser encerrados a qualquer momento.</li>
              </ul>
              <p>Salvo disposição em contrário, valores pagos não são reembolsáveis.</p>
            </SectionCard>

            <SectionCard id="6" icon={Shield} title="Uso da Plataforma">
              <p>O usuário compromete-se a:</p>
              <ul>
                <li>Fornecer informações corretas;</li>
                <li>Não utilizar o sistema para fins ilícitos;</li>
                <li>Não tentar acessar áreas restritas sem autorização;</li>
                <li>Não realizar engenharia reversa, cópia ou exploração indevida da plataforma.</li>
              </ul>
            </SectionCard>

            <SectionCard id="7" icon={Lock} title="Propriedade Intelectual">
              <p>Todo o conteúdo e tecnologia do Granja Pro, incluindo:</p>
              <ul>
                <li>Código-fonte;</li>
                <li>Interface;</li>
                <li>Design;</li>
                <li>Algoritmos e modelos de inteligência artificial;</li>
              </ul>
              <p>são de propriedade exclusiva do responsável pela plataforma, sendo proibida sua reprodução, modificação ou distribuição sem autorização.</p>
            </SectionCard>

            <SectionCard id="8" icon={Shield} title="Dados do Usuário">
              <p>Os dados inseridos pelo usuário permanecem sob sua titularidade.</p>
              <p>O Granja Pro poderá utilizá-los para:</p>
              <ul>
                <li>Operação do serviço;</li>
                <li>Melhoria da plataforma;</li>
                <li>Geração de análises e estatísticas, de forma anonimizada.</li>
              </ul>
              <p>O tratamento de dados segue a Lei Geral de Proteção de Dados Pessoais.</p>
            </SectionCard>

            <SectionCard id="9" icon={Brain} title="Uso de Inteligência Artificial" highlight>
              <p>O Granja Pro poderá utilizar inteligência artificial para gerar recomendações e análises.</p>
              <p>O usuário declara ciência de que:</p>
              <ul>
                <li>As recomendações são baseadas em dados fornecidos;</li>
                <li>Não há garantia de resultados específicos;</li>
                <li>As decisões finais são de sua responsabilidade.</li>
              </ul>
            </SectionCard>

            <SectionCard id="10" icon={AlertTriangle} title="Limitação de Responsabilidade" highlight>
              <p>O Granja Pro não se responsabiliza por:</p>
              <ul>
                <li>Decisões tomadas com base nas informações da plataforma;</li>
                <li>Perdas financeiras, produtivas ou operacionais;</li>
                <li>Falhas decorrentes de fatores externos, como internet, energia ou terceiros.</li>
              </ul>
              <p>O serviço é fornecido &quot;no estado em que se encontra&quot;.</p>
            </SectionCard>

            <SectionCard id="11" icon={Server} title="Disponibilidade do Serviço">
              <p>O Granja Pro poderá:</p>
              <ul>
                <li>Realizar manutenções programadas;</li>
                <li>Interromper temporariamente o serviço;</li>
                <li>Alterar funcionalidades a qualquer momento.</li>
              </ul>
              <p>Não há garantia de disponibilidade contínua e ininterrupta.</p>
            </SectionCard>

            <SectionCard id="12" icon={Ban} title="Cancelamento e Exclusão">
              <p>O usuário poderá cancelar sua conta a qualquer momento.</p>
              <p>Após o cancelamento:</p>
              <ul>
                <li>O acesso será encerrado;</li>
                <li>Os dados poderão ser excluídos após prazo razoável, conforme legislação aplicável.</li>
              </ul>
            </SectionCard>

            <SectionCard id="13" icon={Ban} title="Suspensão ou Bloqueio">
              <p>O Granja Pro poderá suspender ou encerrar contas em caso de:</p>
              <ul>
                <li>Violação destes Termos;</li>
                <li>Uso indevido ou fraudulento;</li>
                <li>Risco à segurança da plataforma.</li>
              </ul>
            </SectionCard>

            <SectionCard id="14" icon={RefreshCw} title="Alterações dos Termos">
              <p>Estes Termos poderão ser atualizados a qualquer momento.</p>
              <p>A continuidade do uso da plataforma após alterações implica concordância com os novos termos.</p>
            </SectionCard>

            <SectionCard id="15" icon={Lock} title="Privacidade">
              <p>A utilização do Granja Pro também está sujeita à{" "}
                <Link href="/politica-de-privacidade" className="text-brand-600 hover:text-brand-700 font-semibold underline underline-offset-2 transition-colors">
                  Política de Privacidade
                </Link>.
              </p>
            </SectionCard>

            <SectionCard id="16" icon={CreditCard} title="Reajustes e Modificações">
              <p>Os valores dos planos poderão ser alterados mediante aviso prévio.</p>
            </SectionCard>

            <SectionCard id="17" icon={Brain} title="Uso de Dados para Melhoria do Serviço">
              <p>O Granja Pro poderá utilizar dados anonimizados para:</p>
              <ul>
                <li>Treinamento de modelos de inteligência artificial;</li>
                <li>Desenvolvimento de novas funcionalidades;</li>
                <li>Análises estatísticas.</li>
              </ul>
            </SectionCard>

            <SectionCard id="18" icon={MessageSquare} title="Feedback e Sugestões">
              <p>Qualquer sugestão enviada pelo usuário poderá ser utilizada pela plataforma sem obrigação de compensação.</p>
            </SectionCard>

            <SectionCard id="19" icon={Landmark} title="Legislação e Foro">
              <p>Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
              <p>Fica eleito o foro da comarca de Brasília/DF para dirimir eventuais controvérsias.</p>
            </SectionCard>

            <SectionCard id="20" icon={FlaskConical} title="Fase de Testes (Beta)" highlight>
              <p>O usuário declara ciência de que o Granja Pro pode estar em fase inicial (beta), podendo apresentar:</p>
              <ul>
                <li>Instabilidades;</li>
                <li>Erros de funcionamento;</li>
                <li>Alterações frequentes de funcionalidades.</li>
              </ul>
              <p>O uso da plataforma é realizado por conta e risco do usuário.</p>
            </SectionCard>
          </div>

          {/* Sticky Sidebar TOC */}
          <aside className="hidden md:block">
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Índice</h4>
                <nav className="space-y-0.5">
                  {sections.map((s) => (
                    <button
                      key={s.n}
                      onClick={() => {
                        document.getElementById(`section-${s.n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        setActiveSection(s.n);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
                        activeSection === s.n
                          ? "bg-brand-50 text-brand-700"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      <span className={`text-[10px] font-bold w-5 text-center flex-shrink-0 ${activeSection === s.n ? "text-brand-600" : "text-gray-400"}`}>{s.n}</span>
                      <span className="text-xs font-medium truncate">{s.title}</span>
                      <ChevronRight className={`w-3 h-3 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${activeSection === s.n ? "opacity-100 text-brand-500" : ""}`} />
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">Granja Pro &copy; 2026 — Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/politica-de-privacidade" className="text-xs text-gray-500 hover:text-brand-600 transition-colors cursor-pointer">Política de Privacidade</Link>
            <Link href="/signup" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors cursor-pointer">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionCard({ id, icon: Icon, title, highlight, children }: { id: string; icon: React.ElementType; title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section
      id={`section-${id}`}
      className={`scroll-mt-24 rounded-xl border p-6 transition-all ${
        highlight
          ? "bg-amber-50/40 border-amber-200/60"
          : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${highlight ? "bg-amber-100" : "bg-brand-50"}`}>
          <Icon className={`w-4 h-4 ${highlight ? "text-amber-600" : "text-brand-600"}`} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">{id}. {title}</h3>
      </div>
      <div className="space-y-3 [&_p]:text-[13px] [&_p]:text-gray-600 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-[13px] [&_li]:text-gray-600 [&_li]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}
