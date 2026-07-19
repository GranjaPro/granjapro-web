// Maps an insight (its title + suggested action) to the dashboard page that
// helps resolve it, by keyword. Used by the status banners across pages so each
// alert can link to the page that solves the problem.

export type InsightLink = { href: string; label: string };

export function insightHref(text: string): InsightLink {
  const t = (text || "").toLowerCase();

  if (/ra[çc][aã]o|aliment|nutri|dieta|suplement|consumo de/.test(t))
    return { href: "/dashboard/racao", label: "Ver ração" };
  if (/[áa]gua|hidrat|bebedouro/.test(t))
    return { href: "/dashboard/agua", label: "Ver água" };
  if (/vacina|imuniz|vermifug|tratamento|sanit|inspe[çc]|antibiot|coccidi|parasit|isolar|sintom|exame|amostra|medica/.test(t))
    return { href: "/dashboard/health", label: "Ver saúde" };
  if (/sa[úu]de|doen[çc]a|respirat|comportamento/.test(t))
    return { href: "/dashboard/health", label: "Ver saúde" };
  if (/morte|mortal|predador|[óo]bito|descarte de aves/.test(t))
    return { href: "/dashboard/mortality", label: "Ver mortalidade" };
  if (/venda|comprador|pedido/.test(t))
    return { href: "/dashboard/sales", label: "Ver vendas" };
  if (/cliente|inadimpl|pagamento/.test(t))
    return { href: "/dashboard/customers", label: "Ver clientes" };
  if (/custo|lucro|margem|receita|despesa|financ|pre[çc]o|fluxo de caixa/.test(t))
    return { href: "/dashboard/finances", label: "Ver finanças" };
  if (/equipa|ventila|climat|energia|manuten|iluminac/.test(t))
    return { href: "/dashboard/equipment", label: "Ver equipamentos" };
  if (/estoque|invent[áa]rio|embalagem|reposi[çc]/.test(t))
    return { href: "/dashboard/inventory", label: "Ver estoque" };
  if (/lote|galp[aã]o|densidade|aloja|poleiro|enriquecimento|luminos|bicagem|canibal|ectoparasit/.test(t))
    return { href: "/dashboard/flocks", label: "Ver lotes" };
  if (/coleta|postura|produ[çc][aã]o|ovos|d[úu]zia/.test(t))
    return { href: "/dashboard/production", label: "Ver produção" };

  return { href: "/dashboard", label: "Ver painel" };
}
