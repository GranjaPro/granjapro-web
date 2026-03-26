"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Users, Database, Target, Lock, Share2, Globe, Clock, UserCheck, Brain, Cookie, UserCog, RefreshCw, Mail, ChevronRight } from "lucide-react";

const sections = [
  { n: "1", title: "Tratamento de Dados", icon: Database },
  { n: "2", title: "Dados Coletados", icon: Users },
  { n: "3", title: "Finalidades", icon: Target },
  { n: "4", title: "Armazenamento e Segurança", icon: Lock },
  { n: "5", title: "Compartilhamento", icon: Share2 },
  { n: "6", title: "Transferência Internacional", icon: Globe },
  { n: "7", title: "Retenção e Término", icon: Clock },
  { n: "8", title: "Direitos do Titular", icon: UserCheck },
  { n: "9", title: "Inteligência Artificial", icon: Brain },
  { n: "10", title: "Cookies", icon: Cookie },
  { n: "11", title: "Responsabilidade do Usuário", icon: UserCog },
  { n: "12", title: "Alterações da Política", icon: RefreshCw },
  { n: "13", title: "Contato", icon: Mail },
];

export default function PoliticaDePrivacidadePage() {
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
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Política de Privacidade</h1>
              <p className="mt-2 text-white/50 text-sm">Granja Pro — Última atualização: 26/03/2026</p>
              <p className="mt-4 text-white/70 leading-relaxed max-w-2xl text-sm">
                O Granja Pro tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários, adotando medidas adequadas para garantir que tais informações sejam tratadas com segurança, transparência e em conformidade com a legislação aplicável.
              </p>
              <p className="mt-3 text-white/60 leading-relaxed max-w-2xl text-sm">
                Esta Política de Privacidade descreve como os dados pessoais são coletados, utilizados, armazenados, compartilhados e protegidos no âmbito da utilização da plataforma.
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
            <SectionCard id="1" icon={Database} title="Sobre o Tratamento de Dados Pessoais">
              <p>O Granja Pro realiza o tratamento de dados pessoais apenas quando necessário para a prestação de seus serviços, sempre observando os princípios da finalidade, adequação, necessidade e segurança.</p>
              <p>Os dados pessoais são utilizados exclusivamente para as finalidades informadas nesta Política ou conforme permitido pela legislação vigente.</p>
            </SectionCard>

            <SectionCard id="2" icon={Users} title="Dados Pessoais Coletados">
              <p className="font-semibold !text-gray-800">2.1 Dados fornecidos diretamente pelo usuário</p>
              <ul>
                <li>Nome;</li>
                <li>E-mail;</li>
                <li>Informações inseridas na plataforma (produção, estoque, dados financeiros, etc.).</li>
              </ul>
              <p className="font-semibold !text-gray-800 pt-2">2.2 Dados coletados automaticamente</p>
              <ul>
                <li>Endereço IP;</li>
                <li>Informações de dispositivo e navegador;</li>
                <li>Registros de acesso (logs);</li>
                <li>Dados de navegação e uso da plataforma.</li>
              </ul>
            </SectionCard>

            <SectionCard id="3" icon={Target} title="Finalidades do Tratamento">
              <p>Os dados pessoais são tratados para:</p>
              <ul>
                <li>Permitir o funcionamento adequado da plataforma;</li>
                <li>Personalizar a experiência do usuário;</li>
                <li>Gerar análises, relatórios e indicadores;</li>
                <li>Fornecer recomendações com uso de inteligência artificial;</li>
                <li>Melhorar continuamente os serviços;</li>
                <li>Garantir segurança e prevenir fraudes.</li>
              </ul>
            </SectionCard>

            <SectionCard id="4" icon={Lock} title="Sobre o Armazenamento e Segurança dos Dados" highlight>
              <p>O Granja Pro adota medidas técnicas e administrativas adequadas para proteger os dados pessoais contra acessos não autorizados, perda, alteração ou divulgação indevida.</p>
              <p>Os dados são armazenados em ambientes seguros e controlados, sendo acessados apenas por pessoas autorizadas, conforme a necessidade para execução das atividades.</p>
              <p>No entanto, o usuário também deve adotar boas práticas de segurança, como manter suas credenciais de acesso protegidas, sendo responsável por sua confidencialidade.</p>
            </SectionCard>

            <SectionCard id="5" icon={Share2} title="Compartilhamento de Dados Pessoais">
              <p>Os dados pessoais poderão ser compartilhados com terceiros nas seguintes situações:</p>
              <ul>
                <li>Prestadores de serviços essenciais (hospedagem, banco de dados, infraestrutura);</li>
                <li>Processadores de pagamento;</li>
                <li>Ferramentas de análise e monitoramento.</li>
              </ul>
              <p>O Granja Pro não comercializa dados pessoais.</p>
            </SectionCard>

            <SectionCard id="6" icon={Globe} title="Transferência Internacional de Dados">
              <p>Em razão da utilização de serviços tecnológicos globais, os dados pessoais poderão ser armazenados ou processados fora do Brasil, sempre observando padrões adequados de proteção e segurança.</p>
            </SectionCard>

            <SectionCard id="7" icon={Clock} title="Retenção e Término do Tratamento">
              <p>Os dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades para as quais foram coletados ou para atender obrigações legais.</p>
              <p>Após o término do tratamento, os dados poderão ser:</p>
              <ul>
                <li>Excluídos;</li>
                <li>Anonimizados;</li>
                <li>Mantidos quando exigido por lei.</li>
              </ul>
            </SectionCard>

            <SectionCard id="8" icon={UserCheck} title="Direitos do Titular dos Dados" highlight>
              <p>Nos termos da Lei Geral de Proteção de Dados Pessoais, o usuário possui os seguintes direitos:</p>
              <ul>
                <li>Confirmar a existência de tratamento de dados;</li>
                <li>Acessar seus dados pessoais;</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                <li>Solicitar a exclusão de dados;</li>
                <li>Revogar o consentimento;</li>
                <li>Solicitar informações sobre compartilhamento de dados.</li>
              </ul>
              <p>As solicitações poderão ser realizadas por meio do canal de contato informado nesta Política.</p>
            </SectionCard>

            <SectionCard id="9" icon={Brain} title="Uso de Inteligência Artificial" highlight>
              <p>O Granja Pro poderá utilizar dados para:</p>
              <ul>
                <li>Geração de recomendações automatizadas;</li>
                <li>Aprimoramento de modelos de inteligência artificial;</li>
                <li>Produção de análises estatísticas.</li>
              </ul>
              <p>Sempre que possível, os dados serão tratados de forma anonimizada.</p>
              <p>As recomendações geradas não substituem a análise técnica ou decisão do usuário.</p>
            </SectionCard>

            <SectionCard id="10" icon={Cookie} title="Cookies e Tecnologias de Rastreamento">
              <p>O Granja Pro poderá utilizar cookies e tecnologias semelhantes para:</p>
              <ul>
                <li>Manter sessões ativas;</li>
                <li>Melhorar a experiência do usuário;</li>
                <li>Analisar o uso da plataforma.</li>
              </ul>
              <p>O usuário poderá configurar seu navegador para recusar cookies, ciente de que isso pode impactar o funcionamento do serviço.</p>
            </SectionCard>

            <SectionCard id="11" icon={UserCog} title="Responsabilidade do Usuário">
              <p>O usuário é responsável por:</p>
              <ul>
                <li>Manter a confidencialidade de suas credenciais;</li>
                <li>Garantir a veracidade das informações fornecidas;</li>
                <li>Utilizar a plataforma de forma segura e adequada.</li>
              </ul>
            </SectionCard>

            <SectionCard id="12" icon={RefreshCw} title="Alterações desta Política">
              <p>O Granja Pro poderá atualizar esta Política de Privacidade a qualquer momento, visando sua melhoria e adequação à legislação vigente.</p>
              <p>Recomenda-se que o usuário revise este documento periodicamente.</p>
            </SectionCard>

            <SectionCard id="13" icon={Mail} title="Contato">
              <p>Para dúvidas, solicitações ou questões relacionadas à privacidade e proteção de dados:</p>
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
            <Link href="/termos-de-uso" className="text-xs text-gray-500 hover:text-brand-600 transition-colors cursor-pointer">Termos de Uso</Link>
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
