/**
 * In-memory store of the latest webhook-delivered status per payment.
 *
 * Yuno's Headless flow has no SDK result callback — the final status (e.g. after a 3DS
 * "pending") arrives via webhook. This store lets the webhook receiver record that status
 * and lets the frontend read it back (GET /api/yuno-webhook?paymentId=...).
 *
 * NOTE: this is process-memory only — it resets on server restart and is NOT shared across
 * multiple serverless instances. It's perfect for local/demo use (Next dev is a single
 * process). For production, persist to a database (e.g. the existing Supabase client).
 */

export type WebhookPaymentRecord = {
  paymentId: string;
  status?: string;
  orderId?: string;
  eventType?: string;
  receivedAt: string;
  raw: unknown;
};

// Survive Next.js dev hot-reloads by hanging the map off globalThis.
const globalStore = globalThis as unknown as {
  __yunoWebhookStore?: Map<string, WebhookPaymentRecord>;
};
const store = globalStore.__yunoWebhookStore ?? new Map<string, WebhookPaymentRecord>();
globalStore.__yunoWebhookStore = store;

export function recordWebhookPayment(record: WebhookPaymentRecord): void {
  store.set(record.paymentId, record);
}

export function getWebhookPayment(paymentId: string): WebhookPaymentRecord | undefined {
  return store.get(paymentId);
}
