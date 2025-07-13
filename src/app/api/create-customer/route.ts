import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const response = await fetch("https://api-sandbox.y.uno/v1/customers", {
            method: "POST",
            headers: {
                "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (data.code === "CUSTOMER_ID_DUPLICATED") {
            const existingResponse = await fetch("https://api-sandbox.y.uno/v1/customers?merchant_customer_id=" + body.merchant_customer_id, {
                method: "GET",
                headers: {
                    "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                    "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                    "Content-Type": "application/json",
                }
            });
            const existingData = await existingResponse.json();
            return NextResponse.json(existingData);
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating Yunos customer:", error);
        return NextResponse.json({ error: "Error creating customer" }, { status: 500 });
    }
}