import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const params = await request.json();

        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": "shopccl_sessiontest_001",
            "description": "Test Yuno Shop CCL",
            "country": "CO",
            "amount": {
                "currency": "COP",
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
            }
        }
        const response = await fetch("https://api-sandbox.y.uno/v1/payments", {
            method: "POST",
            headers: {
                "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                "X-idempotency-key":"shopccl_sessiontest_001",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating Yuno Payment:", error);
        return NextResponse.json({ error: "Error creating payment" }, { status: 500 });
    }
}