import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const params = await request.json();
        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "country": params.country,
            "customer_id": params.customer_id
        }

        const response = await fetch("https://api-sandbox.y.uno/v1/customers/sessions", {
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