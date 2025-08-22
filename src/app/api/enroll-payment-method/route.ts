import { NextResponse } from "next/server";
import { generateUniqueId } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const params = await request.json();

        const idempotency_key = generateUniqueId("shopccl_enrollment");

        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "payment_method_type": params.payment_method_type,
            "country": params.country
        }
        console.log(body);
        const response = await fetch(`https://api-sandbox.y.uno/v1/customers/sessions/${params.customer_session}/payment-methods`, {
            method: "POST",
            headers: {
                "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                "X-idempotency-key": idempotency_key,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(data);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating Yuno Enrolled Payment Method:", error);
        return NextResponse.json({ error: "Error creating Enrolled Payment Method" }, { status: 500 });
    }
}