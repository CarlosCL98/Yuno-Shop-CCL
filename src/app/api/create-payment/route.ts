import { NextResponse } from "next/server";
import { generateUniqueId } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const params = await request.json();

        const merchant_order_id = generateUniqueId("shopccl_payment");

        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": merchant_order_id,
            "description": "Test Yuno Shop CCL",
            "country": params.country || "PE",
            "amount": {
                "currency": params.currency || "COP",
                "value": params.total
            },
            "checkout": {
                "session": params.checkoutSessionId
            },
            "customer_payer": {
                "id": params.customerId,
                "device_fingerprint": "hi88287gbd8d7d782ge....",
                "ip_address": "192.168.123.167"
            },
            "payment_method": {
                "token": params.oneTimeToken
            },
            /*"metadata": [
                {
                    "key": "with3DS",
                    "value": "no"
                },
                {
                    "key": "processor",
                    "value": "REDEBAN"
                }
            ]*/
        }
        console.log(body);
        const response = await fetch("https://api-sandbox.y.uno/v1/payments", {
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
        console.log(data);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating Yuno Payment:", error);
        return NextResponse.json({ error: "Error creating payment" }, { status: 500 });
    }
}