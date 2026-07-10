import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const params = await request.json();

        const merchant_order_id = generateUniqueId("shopccl-payment");
        const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

        // Build customer_payer object
        // For guest checkout: use full customer info
        // For registered checkout: use customer ID
        let customer_payer: any;

        if (params.isGuestCheckout && params.customerPayerInfo) {
            // Guest checkout - send full customer information
            customer_payer = {
                first_name: params.customerPayerInfo.first_name,
                last_name: params.customerPayerInfo.last_name,
                email: params.customerPayerInfo.email,
                document: params.customerPayerInfo.document,
                phone: params.customerPayerInfo.phone,
                billing_address: params.customerPayerInfo.billing_address,
                shipping_address: params.customerPayerInfo.shipping_address,

            };
            console.log("Guest checkout - using inline customer info");
        } else {
            // Registered checkout - use customer ID
            customer_payer = {
                "id": params.customerId
            };
            console.log("Registered checkout - using customer ID:", params.customerId);
        }

        // Add browser_info if it was provided from the client
        //if (params.browserInfo) {
        //customer_payer.browser_info = params.browserInfo;
        //}

        // Payment method type is driven by the client so the same route serves both
        // Secure Fields (CARD) and SDK Lite (APMs). Card-only details (installments,
        // capture, stored_credentials) are attached only when the type is CARD.
        const paymentMethodType = params.paymentMethodType || "CARD";

        const payment_method: any = {
            "type": paymentMethodType,
            "token": params.oneTimeToken,
        };

        if (paymentMethodType === "CARD") {
            payment_method.detail = {
                "card": {
                    "installments": 1,
                    "verify": false,
                    "capture": true,
                    ...(params.storedCredentials && {
                        "stored_credentials": {
                            "reason": params.storedCredentials.reason,
                            "usage": params.storedCredentials.usage,
                        }
                    }),
                }
            };
        }

        const body = {
            "description": "Test Yuno",
            "payment_description": "Test Yuno",
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": merchant_order_id,
            "country": params.country || "CO",
            "amount": {
                "currency": params.currency || "USD",
                "value": Math.round(Number(params.total || 0) * 100) / 100
            },
            "checkout": {
                "session": params.checkoutSessionId
            },
            "customer_payer": customer_payer,
            "payment_method": payment_method,
        }
        console.log(body);
        const response = await fetch(`${apiBaseUrl}/v1/payments`, {
            method: "POST",
            headers: {
                "public-api-key": process.env.NEXT_PUBLIC_API_KEY!,
                "private-secret-key": process.env.PRIVATE_SECRET_KEY!,
                "X-idempotency-key": merchant_order_id,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(data);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating Yuno Payment:", error);
        return NextResponse.json({ error: "Error creating payment" }, { status: 500 });
    }
}