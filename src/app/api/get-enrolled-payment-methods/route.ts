import { NextResponse } from "next/server";
import { getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const { customer_id } = await request.json();
    
    if (!customer_id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);
    console.log("Fetching enrolled payment methods for customer ID:", customer_id);
    
    const response = await fetch(`${apiBaseUrl}/v1/customers/${customer_id}/payment-methods`, {
      method: "GET",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
    });

    console.log("Yuno API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Yuno API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch enrolled payment methods from Yuno" }, { status: response.status });
    }

    const data = await response.json();
    console.log("Yuno enrolled payment methods response:", JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching enrolled payment methods:", error);
    return NextResponse.json({ error: "Error fetching enrolled payment methods" }, { status: 500 });
  }
}
