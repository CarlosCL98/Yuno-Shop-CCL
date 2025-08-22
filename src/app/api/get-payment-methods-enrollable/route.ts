import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { customer_session } = await request.json();

    const response = await fetch(`https://api-sandbox.y.uno/v1/checkout/customers/sessions/${customer_session}/payment-methods`, {
      method: "GET",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json({ error: "Error fetching payment methods" }, { status: 500 });
  }
}
