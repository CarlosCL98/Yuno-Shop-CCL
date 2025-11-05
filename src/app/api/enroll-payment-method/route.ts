import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const params = await request.json();
        const idempotency_key = generateUniqueId("shopccl_enrollment");
        const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

        // Build the enrollment request body with customer information
        const body: any = {
            "account_id": process.env.ACCOUNT_CODE!,
            "payment_method_type": params.payment_method_type,
            "country": params.country,
            "workflow": "DIRECT"
        };

        // Add customer information if provided
        if (params.customer_data) {
            body.customer_payer = {
                merchant_customer_id: params.customer_data.merchant_customer_id,
                email: params.customer_data.email,
                first_name: params.customer_data.first_name,
                last_name: params.customer_data.last_name,
                date_of_birth: params.customer_data.date_of_birth,
                nationality: params.customer_data.nationality,
                document: params.customer_data.document,
                phone: params.customer_data.phone,
                billing_address: params.customer_data.billing_address
            };
        }

        console.log("Enrollment request body:", JSON.stringify(body, null, 2));
        const response = await fetch(`${apiBaseUrl}/v1/customers/sessions/${params.customer_session}/payment-methods`, {
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