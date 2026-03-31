import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const params = await request.json();

    const merchant_order_id = generateUniqueId("shopccl-sessioncheckouttest");
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    // DEBUG: Log environment variables (safely)
    console.log("🔧 Debug Info:");
    console.log("- API Base URL:", apiBaseUrl);
    console.log("- Account Code:", process.env.ACCOUNT_CODE ? "✓ Set" : "✗ Missing");
    console.log("- Account Code value:", process.env.ACCOUNT_CODE?.substring(0, 8) + "...");
    console.log("- Public Key prefix:", process.env.NEXT_PUBLIC_API_KEY?.substring(0, 10) + "...");

    // Round the amount to 2 decimal places to avoid floating-point precision issues
    const roundedAmount = Math.round(Number(params.amount) * 100) / 100;

    const body = {
      "account_id": process.env.ACCOUNT_CODE!,
      "merchant_order_id": merchant_order_id,
      "payment_description": "Test Yuno Shop CCL",
      //"callback_url": "https://localhost:3000/profile",
      "country": params.country,
      "customer_id": params.customer_id,
      "amount": {
        "currency": params.currency || "USD",
        "value": roundedAmount
      },
      "metadata": [
                {
                    "key": "sales_channel",
                    "value": "WebDuringBooking"
                },
                {
                    "key": "TestKey1",
                    "value": "TestValue1"
                },
                {
                    "key": "TestKey2",
                    "value": "TestValue2"
                },
                {
                    "key": "Promocode",
                    "value": "BCIMACHC"
                },
                {
                    "key": "SuperPromoCode",
                    "value": "n/a"
                }
            ]
      /*"installments": {
        "plan_id": "9d48bcd9-66ba-4194-969f-01db08a2e381"
      }*/
    }

    console.log("📤 Request to Yuno:", {
      url: `${apiBaseUrl}/v1/checkout/sessions`,
      body: { ...body, account_id: body.account_id.substring(0, 8) + "..." }
    });

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

    console.log("📥 Yuno Response:", {
      status: response.status,
      ok: response.ok,
      data: data
    });

    // Return error details if not successful
    if (!response.ok) {
      console.error("❌ Yuno API Error:", data);
      return NextResponse.json({
        error: "Yuno API Error",
        status: response.status,
        details: data
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Server Error:", error);
    return NextResponse.json({
      error: "Error creating Yuno session",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}