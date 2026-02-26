import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    // Auto-inject account_id if not present
    if (!body.account_id) {
      body.account_id = process.env.ACCOUNT_CODE!;
    }

    // Generate idempotency key from merchant_order_id or a unique ID
    const idempotencyKey = body.merchant_order_id || generateUniqueId("shopccl-passthrough");

    const response = await fetch(`${apiBaseUrl}/v1/payments`, {
      method: "POST",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "X-idempotency-key": idempotencyKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in passthrough-payment:", error);
    return NextResponse.json(
      { error: "Error forwarding payment request", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
