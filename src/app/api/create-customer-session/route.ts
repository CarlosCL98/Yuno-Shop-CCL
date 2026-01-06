import { NextResponse } from "next/server";
import { getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const params = await request.json();
        const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);
        
        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "country": params.country,
            "customer_id": params.customer_id,
            //"callback_url": "https://localhost:3000/profile",
        }

        const response = await fetch(`${apiBaseUrl}/v1/customers/sessions`, {
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
        console.error("Error creating Yunos customer session:", error);
        return NextResponse.json({ error: "Error creating customer session" }, { status: 500 });
    }
}