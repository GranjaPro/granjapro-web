import type { NotificationCategory, NotificationSeverity } from "@/lib/domain/notification-rules";

function formatDatePt(value: string | null): string {
  if (!value) return "o fim do prazo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "o fim do prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

const notificationCategoryLabels: Record<NotificationCategory, string> = {
  low_inventory: "Estoque",
  vaccination: "Saúde",
  low_laying_rate: "Produção",
  high_mortality: "Mortalidade",
  delinquent_customer: "Clientes",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function notificationEmail(params: {
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionUrl: string;
}): { subject: string; html: string } {
  const category = notificationCategoryLabels[params.category];
  const color = params.severity === "critical" ? "#dc2626" : params.severity === "warning" ? "#d97706" : "#2563eb";
  const title = escapeHtml(params.title);
  const body = escapeHtml(params.body);
  const actionUrl = escapeHtml(params.actionUrl);

  return {
    subject: `[Granja Pro] ${params.title}`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
        <p style="color: ${color}; font-size: 12px; font-weight: bold; letter-spacing: 0.04em; text-transform: uppercase;">${category}</p>
        <h2 style="color: #166534;">${title}</h2>
        <p style="line-height: 1.6;">${body}</p>
        <p style="margin: 28px 0;">
          <a href="${actionUrl}"
             style="background: #16a34a; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Ver no Granja Pro
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Você recebeu este aviso porque as notificações por e-mail estão habilitadas para esta categoria.
        </p>
      </div>
    `,
  };
}

export function paymentFailedEmail(params: {
  updateUrl: string;
  gracePeriodEndsAt: string | null;
}): { subject: string; html: string } {
  const deadline = formatDatePt(params.gracePeriodEndsAt);

  return {
    subject: "Falha no pagamento — atualize seu cartão para manter o acesso",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #166534;">Não conseguimos renovar sua assinatura</h2>
        <p>Houve uma falha ao cobrar o seu cartão na renovação do plano do <strong>Granja Pro</strong>.</p>
        <p>Para não perder o acesso, atualize seu cartão até <strong>${deadline}</strong>.
        Após esse prazo, o acesso ao sistema será bloqueado até que um cartão válido seja cadastrado.</p>
        <p style="margin: 28px 0;">
          <a href="${params.updateUrl}"
             style="background: #16a34a; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Atualizar cartão
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Se você já atualizou o pagamento, pode ignorar este e-mail.
        </p>
      </div>
    `,
  };
}
