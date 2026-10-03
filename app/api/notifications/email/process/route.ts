import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { processNotificationEmailDeliveries } from "@/lib/email/notification-processor";

function hasValidProcessorSecret(request: NextRequest, expectedSecret: string): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const suppliedSecret = authorization.slice("Bearer ".length);
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: NextRequest) {
  const processorSecret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!processorSecret) {
    console.error("Notification email processor secret is not configured.");
    return Response.json({ error: "Notification processor is not configured." }, { status: 503 });
  }
  if (!hasValidProcessorSecret(request, processorSecret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const result = await processNotificationEmailDeliveries(appUrl);
    return Response.json(result);
  } catch (error: unknown) {
    console.error("Notification email processing failed:", error);
    return Response.json({ error: "Notification email processing failed." }, { status: 500 });
  }
}
