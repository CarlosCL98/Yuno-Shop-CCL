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

    // If customer already exists, fetch the existing one instead
    if (data.code === "CUSTOMER_ID_DUPLICATED" && body.merchant_customer_id) {
      const existingResponse = await fetch(
        `${apiBaseUrl}/v1/customers?merchant_customer_id=${body.merchant_customer_id}`,
        {
          method: "GET",
          headers: {
            "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
            "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
            "Content-Type": "application/json",
          },
        }
      );
      const existingData = await existingResponse.json();
      return NextResponse.json(existingData, { status: existingResponse.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in passthrough-customer:", error);
    return NextResponse.json(
      { error: "Error forwarding customer request", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
