import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const params = await request.json();

    const merchant_order_id = generateUniqueId("shopccl-direct");
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    // Build customer_payer object
    let customer_payer: any;

    if (params.isGuestCheckout && params.customerPayerInfo) {
      customer_payer = {
        first_name: params.customerPayerInfo.first_name,
        last_name: params.customerPayerInfo.last_name,
        email: params.customerPayerInfo.email,
        document: params.customerPayerInfo.document,
        phone: params.customerPayerInfo.phone,
        billing_address: params.customerPayerInfo.billing_address,
        shipping_address: params.customerPayerInfo.shipping_address,
      };
    } else {
      customer_payer = {
        id: params.customerId,
      };
    }

    const body = {
      account_id: process.env.ACCOUNT_CODE!,
      merchant_order_id: merchant_order_id,
      description: "Direct API Payment",
      country: params.country || "CO",
      amount: {
        currency: params.currency || "USD",
        value: Math.round(Number(params.total || 0) * 100) / 100,
      },
      workflow: "DIRECT",
      customer_payer: {
        ...customer_payer,
        browser_info: params.browserInfo,
      },
      payment_method: {
        type: "CARD",
        detail: {
          card: {
            card_data: {
              number: params.card.number,
              expiration_month: params.card.expiration_month,
              expiration_year: params.card.expiration_year,
              security_code: String(params.card.security_code),
              holder_name: params.card.holder_name,
            },
            capture: true,
          },
        },
        vault_on_success: false,
      },
    };

    console.log("Direct payment body:", JSON.stringify(body, null, 2));

    const response = await fetch(`${apiBaseUrl}/v1/payments`, {
      method: "POST",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "X-idempotency-key": merchant_order_id,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("Direct payment response:", JSON.stringify(data, null, 2));
    console.log("Response top-level keys:", Object.keys(data));
    if (data.payment) {
      console.log("payment keys:", Object.keys(data.payment));
      if (data.payment.transactions?.[0]) {
        console.log("transaction[0] keys:", Object.keys(data.payment.transactions[0]));
        console.log("transaction[0].payment_method:", JSON.stringify(data.payment.transactions[0].payment_method, null, 2));
      }
      if (data.payment.checkout) {
        console.log("payment.checkout:", JSON.stringify(data.payment.checkout, null, 2));
      }
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in direct-payment:", error);
    return NextResponse.json(
      { error: "Error creating direct payment", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
