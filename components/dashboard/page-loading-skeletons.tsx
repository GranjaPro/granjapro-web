interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <div className={`rounded-lg bg-gray-100 motion-safe:animate-pulse ${className}`} />;
}

function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="space-y-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6">
        {children}
      </div>
    </div>
  );
}

function PageHeaderSkeleton({ actionCount = 2 }: { actionCount?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-36" />
          <SkeletonBlock className="h-4 w-64 max-w-[70vw]" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: actionCount }, (_, index) => (
          <SkeletonBlock key={index} className={index === 0 ? "h-10 w-44 rounded-xl" : "h-10 w-36 rounded-xl"} />
        ))}
      </div>
    </div>
  );
}

function MetricCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className={compact ? "h-4 w-24" : "h-10 w-10 rounded-xl"} />
        <SkeletonBlock className="h-5 w-14 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-7 w-28" />
      <SkeletonBlock className="mt-3 h-2 w-full rounded-full" />
      <SkeletonBlock className="mt-2 h-3 w-3/4" />
    </div>
  );
}

function MetricGrid({ count, className, compact = false }: { count: number; className: string; compact?: boolean }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => <MetricCardSkeleton key={index} compact={compact} />)}
    </div>
  );
}

function PanelSkeleton({ className = "", heightClass = "h-72" }: { className?: string; heightClass?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3 w-56 max-w-[55vw]" />
        </div>
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonBlock className={`mt-6 w-full ${heightClass}`} />
    </div>
  );
}

function FiltersSkeleton({ groups = 2 }: { groups?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {Array.from({ length: groups }, (_, index) => (
        <SkeletonBlock key={index} className="h-10 w-full rounded-xl sm:w-72" />
      ))}
      <SkeletonBlock className="h-10 w-full rounded-xl sm:ml-auto sm:w-64" />
    </div>
  );
}

function TableSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <SkeletonBlock className="h-10 w-full rounded-xl sm:w-64" />
      </div>
      <div className="mt-5 min-w-[640px]">
        <div className="flex gap-4 border-y border-gray-100 bg-gray-50/50 px-3 py-3">
          {Array.from({ length: columns }, (_, index) => <SkeletonBlock key={index} className="h-3 flex-1" />)}
        </div>
        {Array.from({ length: 5 }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 border-b border-gray-50 px-3 py-4">
            {Array.from({ length: columns }, (_, columnIndex) => (
              <SkeletonBlock key={columnIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancesPageSkeleton() {
  return (
    <LoadingRegion label="Carregando dados financeiros">
      <PageHeaderSkeleton actionCount={3} />
      <PanelSkeleton heightClass="h-20" />
      <MetricGrid count={4} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" />
      <MetricGrid count={4} compact className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelSkeleton heightClass="h-60" />
        <PanelSkeleton heightClass="h-60" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <PanelSkeleton className="lg:col-span-3" heightClass="h-56" />
        <PanelSkeleton className="lg:col-span-4" heightClass="h-56" />
        <PanelSkeleton className="lg:col-span-5" heightClass="h-56" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PanelSkeleton className="lg:col-span-2" heightClass="h-52" />
        <PanelSkeleton heightClass="h-52" />
      </div>
      <TableSkeleton />
    </LoadingRegion>
  );
}

export function CustomersPageSkeleton() {
  return (
    <LoadingRegion label="Carregando clientes">
      <PageHeaderSkeleton />
      <MetricGrid count={6} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelSkeleton heightClass="h-64" />
        <PanelSkeleton heightClass="h-64" />
      </div>
      <FiltersSkeleton />
      <TableSkeleton columns={7} />
    </LoadingRegion>
  );
}

export function SalesPageSkeleton() {
  return (
    <LoadingRegion label="Carregando vendas">
      <PageHeaderSkeleton />
      <PanelSkeleton heightClass="h-20" />
      <MetricGrid count={4} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" />
      <PanelSkeleton heightClass="h-64" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelSkeleton heightClass="h-80" />
        <PanelSkeleton heightClass="h-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelSkeleton className="lg:col-span-2" heightClass="h-64" />
        <PanelSkeleton heightClass="h-64" />
      </div>
      <TableSkeleton columns={8} />
    </LoadingRegion>
  );
}
