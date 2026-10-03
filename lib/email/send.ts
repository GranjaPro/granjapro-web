type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
};

export interface EmailSendResult {
  ok: boolean;
  providerId: string | null;
  httpStatus: number | null;
  errorCode: string | null;
  errorDetail: string | null;
  retryAfterSeconds: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

async function parseResponseBody(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(await response.json());
  } catch {
    return null;
  }
}

export async function sendEmailWithResult({
  to,
  subject,
  html,
  idempotencyKey,
}: SendEmailInput): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      ok: false,
      providerId: null,
      httpStatus: null,
      errorCode: "email_not_configured",
      errorDetail: "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.",
      retryAfterSeconds: null,
    };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "GranjaPro/1.0",
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({ from, to, subject, html }),
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      const code = typeof body?.name === "string" ? body.name : "resend_error";
      const detail = typeof body?.message === "string" ? body.message : `Resend returned HTTP ${response.status}.`;
      return {
        ok: false,
        providerId: null,
        httpStatus: response.status,
        errorCode: code,
        errorDetail: detail,
        retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
      };
    }

    const providerId = typeof body?.id === "string" ? body.id : null;
    if (!providerId) {
      return {
        ok: false,
        providerId: null,
        httpStatus: response.status,
        errorCode: "invalid_provider_response",
        errorDetail: "Resend did not return an email identifier.",
        retryAfterSeconds: null,
      };
    }

    return {
      ok: true,
      providerId,
      httpStatus: response.status,
      errorCode: null,
      errorDetail: null,
      retryAfterSeconds: null,
    };
  } catch (error) {
    return {
      ok: false,
      providerId: null,
      httpStatus: null,
      errorCode: "network_error",
      errorDetail: error instanceof Error ? error.message : "Unknown network error.",
      retryAfterSeconds: null,
    };
  }
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const result = await sendEmailWithResult(input);
  if (!result.ok) console.error("[email] Resend send failed:", result.errorCode, result.errorDetail);
  return result.ok;
}
