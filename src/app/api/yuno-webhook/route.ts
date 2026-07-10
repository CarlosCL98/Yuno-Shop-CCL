import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { recordWebhookPayment, getWebhookPayment } from "../../lib/webhookStore";

// Needs the Node runtime: we read the raw body and use `crypto` for HMAC verification.
export const runtime = "nodejs";

/**
 * Yuno webhook receiver.
 *
 * Configure this URL in the Yuno Dashboard (Developers → Webhooks). It must be reachable
 * from the public internet — see the notes at the bottom of this file for exposing localhost.
 *
 * Docs:
 *  - https://docs.y.uno/docs/webhooks/configure-webhooks
 *  - https://docs.y.uno/docs/verify-webhook-signatures-hmac
 *
 * Security: if YUNO_WEBHOOK_SECRET is set, we verify the `x-hmac-signature` header
 * (HMAC-SHA256 over the raw body, base64). If it's not set, verification is skipped with a
 * warning so you can wire things up quickly — set it before trusting the data in production.
 */

// Verify the HMAC-SHA256 signature Yuno sends in `x-hmac-signature` (base64 of raw body).
function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    const a = Buffer.from(signature, "base64");
    const b = Buffer.from(expected, "base64");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Yuno's payload shape varies by event; pull id/status/order from the likely locations.
function extractPayment(payload: any): { paymentId?: string; status?: string; orderId?: string } {
  const p = payload?.payment ?? payload?.data ?? payload ?? {};
  return {
    paymentId: p.id ?? payload?.payment_id ?? payload?.id,
    status: p.status ?? p.sub_status ?? payload?.status,
    orderId: p.merchant_order_id ?? payload?.merchant_order_id,
  };
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    // Support both the documented header and the older name, just in case.
    const signature =
      headersList.get("x-hmac-signature") ?? headersList.get("x-yuno-signature");

    // Read the RAW body first — HMAC must be computed over the exact bytes Yuno signed.
    const rawBody = await request.text();

    const secret = process.env.YUNO_WEBHOOK_SECRET;
    if (secret) {
      if (!verifySignature(rawBody, signature, secret)) {
        console.error("❌ Yuno webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.log("✅ Yuno webhook signature verified");
    } else {
      console.warn(
        "⚠️ YUNO_WEBHOOK_SECRET not set — skipping signature verification. Set it to secure this endpoint."
      );
    }

    const webhookData = JSON.parse(rawBody);
    console.log("Received Yuno webhook:", JSON.stringify(webhookData, null, 2));

    // `event_type` (this demo's older shape) or `type`/`type_event` (Yuno's real events).
    const eventType: string =
      webhookData.event_type || webhookData.type_event || webhookData.type || "unknown";

    const { paymentId, status, orderId } = extractPayment(webhookData);

    if (paymentId) {
      recordWebhookPayment({
        paymentId,
        status,
        orderId,
        eventType,
        receivedAt: new Date().toISOString(),
        raw: webhookData,
      });
    }

    // Log per event so you can watch the flow complete in the terminal.
    switch (eventType) {
      case "payment.created":
        console.log(`Payment created: ${paymentId} for order: ${orderId}`);
        break;
      case "payment.approved":
        console.log(`Payment approved: ${paymentId} for order: ${orderId}`);
        // Fulfill the order, send a confirmation email, etc.
        break;
      case "payment.declined":
        console.log(`Payment declined: ${paymentId} for order: ${orderId}`);
        break;
      case "payment.cancelled":
        console.log(`Payment cancelled: ${paymentId} for order: ${orderId}`);
        break;
      case "payment.refunded":
        console.log(`Payment refunded: ${paymentId} for order: ${orderId}`);
        break;
      default:
        console.log(`Event '${eventType}' → payment ${paymentId} status ${status}`);
    }

    // Yuno only cares about the 200; it retries otherwise.
    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing Yuno webhook:", error);
    return NextResponse.json({ error: "Error processing webhook" }, { status: 500 });
  }
}

// GET: health check, or look up the last webhook status for a payment.
//   /api/yuno-webhook                     → { message: "...active" }
//   /api/yuno-webhook?paymentId=pay_123   → { found, record }
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");

  if (paymentId) {
    const record = getWebhookPayment(paymentId);
    return NextResponse.json({ found: !!record, record: record ?? null });
  }

  return NextResponse.json({ message: "Yuno webhook endpoint is active" });
}
