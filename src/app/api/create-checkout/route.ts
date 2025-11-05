import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const params = await request.json();

    const merchant_order_id = generateUniqueId("shopccl_sessioncheckouttest");
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    const body = {
      "account_id": process.env.ACCOUNT_CODE!,
      "merchant_order_id": merchant_order_id,
      "payment_description": "Test Yuno Shop CCL",
      "callback_url": "https://localhost:3000/profile",
      "country": params.country,
      "customer_id": params.customer_id,
      "amount": {
        "currency": params.currency || "PEN",
        "value": params.amount
      },
      /*"installments": {
        "plan_id": "9d48bcd9-66ba-4194-969f-01db08a2e381"
      }*/
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating Yunos session:", error);
    return NextResponse.json({ error: "Error creating Yunos session" }, { status: 500 });
  }
}