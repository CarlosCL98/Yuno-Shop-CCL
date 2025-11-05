import { NextResponse } from "next/server";
import { getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);
        
        const response = await fetch(`${apiBaseUrl}/v1/customers`, {
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
            // Get the existing customer first
            const existingResponse = await fetch(`${apiBaseUrl}/v1/customers?merchant_customer_id=` + body.merchant_customer_id, {
                method: "GET",
                headers: {
                    "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                    "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                    "Content-Type": "application/json",
                }
            });
            const existingData = await existingResponse.json();
            
            // Update the existing customer with new data
            const updateResponse = await fetch(`${apiBaseUrl}/v1/customers/${existingData.id}`, {
                method: "PATCH",
                headers: {
                    "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                    "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            
            if (updateResponse.ok) {
                const updatedData = await updateResponse.json();
                return NextResponse.json(updatedData);
            } else {
                // If update fails, return the existing customer
                console.warn("Failed to update existing customer, returning existing data");
                return NextResponse.json(existingData);
            }
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating Yunos customer:", error);
        return NextResponse.json({ error: "Error creating customer" }, { status: 500 });
    }
}