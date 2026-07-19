// Minimal transactional email via the Resend HTTP API (no SDK dependency).
// Gated on env vars: if they are missing, sending is a silent no-op so the
// rest of the app keeps working until email is configured.

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(
      "[email] RESEND_API_KEY/RESEND_FROM_EMAIL not set — skipping email to",
      to
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[email] Resend send failed:", response.status, detail);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] Resend send error:", error);
    return false;
  }
}
