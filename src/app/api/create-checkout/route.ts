import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const params = await request.json();

    const body = {
      "account_id": process.env.ACCOUNT_CODE!,
      "merchant_order_id": "shopccl_sessiontest_001",
      "payment_description": "Test Yuno Shop CCL",
      "callback_url": "https://webhook.site/50c46d41-8ac5-4bfe-acdd-0e69a21f0707",
      "country": params.country,
      "customer_id": params.customer_id,
      "amount": {
        "currency": "COP",
        "value": params.amount
      }
    }

    const response = await fetch("https://api-sandbox.y.uno/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating Yunos session:", error);
    return NextResponse.json({ error: "Error creating Yunos session" }, { status: 500 });
  }
}