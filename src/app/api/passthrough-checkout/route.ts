import { NextResponse } from "next/server";
import { getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    // Auto-inject account_id if not present
    if (!body.account_id) {
      body.account_id = process.env.ACCOUNT_CODE!;
    }

    const response = await fetch(`${apiBaseUrl}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // If checkout session already exists for this merchant_order_id, try to fetch the existing one
    // The error response may contain the checkout_session id or merchant_order_id
    if (!response.ok && body.merchant_order_id) {
      const sessionId = data.checkout_session || data.merchant_order_id;
      if (sessionId) {
        console.log("Checkout session may exist, trying GET with:", sessionId);
        const existingResponse = await fetch(
          `${apiBaseUrl}/v1/checkout/sessions/${sessionId}`,
          {
            method: "GET",
            headers: {
              "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
              "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
              "Content-Type": "application/json",
            },
          }
        );

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          console.log("Found existing checkout session:", existingData.checkout_session);
          return NextResponse.json(existingData, { status: existingResponse.status });
        }
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in passthrough-checkout:", error);
    return NextResponse.json(
      { error: "Error forwarding checkout request", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
