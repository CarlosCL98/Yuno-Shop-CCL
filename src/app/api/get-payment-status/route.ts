import { NextResponse } from "next/server";
import { getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    const response = await fetch(`${apiBaseUrl}/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Yuno API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch payment status from Yuno" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json({ error: "Error fetching payment status" }, { status: 500 });
  }
}
