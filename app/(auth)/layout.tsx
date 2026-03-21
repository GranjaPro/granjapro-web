import { Bird } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bird className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Granja Pro</h1>
            <p className="text-sm text-brand-200">Gestão Avícola</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Gerencie sua granja<br />com simplicidade.
          </h2>
          <p className="text-lg text-brand-200 max-w-md">
            Controle produção, finanças, vendas e muito mais em uma única plataforma feita para avicultores.
          </p>
        </div>

        <p className="text-sm text-brand-300">
          &copy; {new Date().getFullYear()} Granja Pro. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[#f8faf9]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Bird className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Granja Pro</h1>
              <p className="text-sm text-gray-500">Gestão Avícola</p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
