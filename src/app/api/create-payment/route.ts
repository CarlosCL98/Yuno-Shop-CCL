import { NextResponse } from "next/server";
import { generateUniqueId, getYunoApiBaseUrl } from "../../lib/utils";

export async function POST(request: Request) {
    try {
        const params = await request.json();

        const merchant_order_id = generateUniqueId("shopccl_payment");
        const apiBaseUrl = getYunoApiBaseUrl(process.env.NEXT_PUBLIC_API_KEY!);

        // Build customer_payer object with browser_info if available
        const customer_payer: any = {
            "id": params.customerId
        };

        // Add browser_info if it was provided from the client
        //if (params.browserInfo) {
            //customer_payer.browser_info = params.browserInfo;
        //}

        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": merchant_order_id,
            "description": "Test Yuno Shop CCL",
            "callback_url": "https://yuno-shop-ccl.vercel.app/profile",
            "country": params.country || "CO",
            "amount": {
                "currency": params.currency || "COP",
                "value": params.total
            },
            "checkout": {
                "session": params.checkoutSessionId
            },
            "customer_payer": customer_payer,
            "payment_method": {
                "token": params.oneTimeToken,
                "detail": {
                    "card": {
                        "verify": false,
                        "capture": true
                    }
                }
            },
            "additional_data": {
                "airline": {
                    "legs": [
                        {
                            "departure_airport": "BOG",
                            "departure_datetime": "2025-11-22T04:26:00.000",
                            "arrival_airport": "LIM",
                            "arrival_datetime": "2025-11-22T05:50:00.000",
                            "carrier_code": "JA",
                            "flight_number": "7255",
                            "fare_basis_code": "",
                            "fare_class_code": "",
                            "base_fare": 0.00,
                            "base_fare_currency": null,
                            "stopover_code": "   ",
                            "departure_airport_country": "COL",
                            "departure_airport_city": "BOG",
                            "arrival_airport_country": "PER",
                            "arrival_airport_city": "LIM"
                        }
                    ],
                    "passengers": [
                        {
                            "country": "US",
                            "date_of_birth": "1992-03-02",
                            "document": null,
                            "first_name": "juan",
                            "last_name": "perez",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": "CO",
                            "type": "A",
                            "email": null,
                            "phone": null
                        }
                    ],
                    "pnr": "CCLZ2E",
                    "tickets": [
                        {
                            "ticket_number": "123456",
                            "restricted": false,
                            "total_fare_amount": 80.00,
                            "total_tax_amount": 22.00,
                            "total_fee_amount": 14.00,
                            "e_ticket": false,
                            "issue": {
                                "date": "2025-10-25T17:53:38",
                                "booking_system_code": "WWE9R7",
                                "booking_system_name": "Test"
                            }
                        }
                    ]
                },
                "order": {
                    "fee_amount": 0,
                    "items": [
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "FLXB",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "PBD",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "APCD",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Airline",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Ancillaries",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        }
                    ],
                    "shipping_amount": 0,
                    "sales_channel": "WebDuringBooking"
                }
            },
            "metadata": [
                {
                    "key": "processor",
                    "value": "YUNO"
                },
                {
                    "key": "with3DS",
                    "value": "no"
                }/*,
                {
                    "key": "fraudValidation",
                    "value": "yes"
                }*/
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