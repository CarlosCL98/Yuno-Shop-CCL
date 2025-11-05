import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
  try {
    const { payment_method_id } = await request.json();
    
    if (!payment_method_id) {
      return NextResponse.json({ error: "Payment method ID is required" }, { status: 400 });
    }

    const idempotency_key = generateUniqueId("shopccl_unenroll");
    const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

    const response = await fetch(`${apiBaseUrl}/v1/customers/payment-methods/${payment_method_id}/unenroll`, {
      method: "POST",
      headers: {
        "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
        "X-idempotency-key": idempotency_key,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error unenrolling payment method:", errorData);
      return NextResponse.json({ error: "Failed to unenroll payment method" }, { status: response.status });
    }

    const data = await response.json();
    console.log("Payment method unenrolled successfully:", data);
    
    return NextResponse.json({ success: true, message: "Payment method unenrolled successfully" });
  } catch (error) {
    console.error("Error unenrolling payment method:", error);
    return NextResponse.json({ error: "Error unenrolling payment method" }, { status: 500 });
  }
}
