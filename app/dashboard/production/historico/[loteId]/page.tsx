import { permanentRedirect } from "next/navigation";

interface LegacyProductionHistoryPageProps {
  params: Promise<{ loteId: string }>;
}

export default async function LegacyProductionHistoryPage({
  params,
}: LegacyProductionHistoryPageProps) {
  const { loteId } = await params;

  permanentRedirect(`/dashboard/flocks/detalhes/${loteId}/producao?origem=producao`);
}
