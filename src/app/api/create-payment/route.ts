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
                shipping_address: params.customerPayerInfo.shipping_address
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

        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": merchant_order_id,
            "description": "3DS Challenge",
            "callback_url": "https://yuno-shop-ccl.vercel.app/profile",
            "country": params.country || "CO",
            "amount": {
                "currency": params.currency || "COP",
                "value": params.total || 0
            },
            "checkout": {
                "session": params.checkoutSessionId
            },
            "customer_payer": customer_payer,
            "payment_method": {
                "token": params.oneTimeToken,
                "vault_on_success": false,
                "detail": {
                    "card": {
                        "verify": false,
                        "capture": true,
                        "store_credentials": {
                            "reason": "CARD_ON_FILE",
                            "usage": "FIRST"
                        }
                    }
                }
            },
            "additional_data": {
                "airline": {
                    "legs": [
                        {//SCL -> AEP
                            "arrival_airport": "AEP",
                            "arrival_airport_country": "AR",
                            "arrival_airport_city": "BUE",
                            "arrival_datetime": "2026-06-13T01:45:00",
                            "arrival_airport_timezone": "-05:00",
                            "base_fare": 0,
                            "base_fare_currency": null,
                            "carrier_code": "JA",
                            "departure_airport": "SCL",
                            "departure_airport_country": "CL",
                            "departure_airport_city": "SCL",
                            "departure_airport_timezone": "-05:00",
                            "departure_datetime": "2026-06-13T01:45:00",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "731",
                            "stopover_code": "X",
                            "route_order": 0,
                            "order": 0
                        }
                    ],
                    "passengers": [
                        {
                            "country": null,
                            "date_of_birth": "2005-01-08",
                            "first_name": "Catalina Enid",
                            "last_name": "Allende Vigueras",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": "CL",
                            "type": "A",
                            "email": null,
                            "phone": null
                        }
                    ],
                    "pnr": "GBC7TQ"
                },
                "order": {
                    "fee_amount": 0,
                    "items": [
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Baggage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 1000
                        }
                    ],
                    "shipping_amount": 0,
                    "sales_channel": "WebDuringBooking"
                }
            },
            "metadata": [
                {
                    "key": "processor",
                    "value": "GETNET"
                },
                {
                    "key": "with3DS",
                    "value": "yes"
                }
            ]
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