import { Bird, Egg, Brain, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden text-white flex-col justify-between p-12">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a2a] via-[#1e4d35] to-[#0f2b1e]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        {/* Content */}
        <Link href="/" className="cursor-pointer">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                <Bird className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Granja Pro</h1>
                <p className="text-xs text-white/50 font-medium tracking-wide uppercase">Gestão Avícola Inteligente</p>
              </div>
            </div>
          </div>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
              Gerencie sua granja<br />com inteligência.
            </h2>
            <p className="text-base text-white/50 max-w-md leading-relaxed">
              Controle produção, finanças, vendas e muito mais em uma única plataforma feita para avicultores.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: Egg, label: "Feito para produtores" },
              { icon: Brain, label: "IA integrada" },
              { icon: ShieldCheck, label: "Seus dados protegidos" },
              { icon: TrendingUp, label: "Maximize seu lucro" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 bg-white/[0.06] backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/[0.06]">
                <item.icon className="w-4 h-4 text-brand-300 flex-shrink-0" />
                <span className="text-xs text-white/70 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Granja Pro. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col bg-[#fafcfb] overflow-y-auto max-h-screen scrollbar-visible">
        {/* Mobile logo - fixed top */}
        <div className="lg:hidden flex items-center gap-3 p-6 pb-0">
          <div className="w-11 h-11 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Bird className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Granja Pro</h1>
            <p className="text-xs text-gray-400 font-medium">Gestão Avícola Inteligente</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
