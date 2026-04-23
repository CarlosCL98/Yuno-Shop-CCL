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

        const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": merchant_order_id,
            "merchant_reference": merchant_order_id,
            "description": "LIM-SCL-LIM",
            "callback_url": "https://yuno-shop-ccl.vercel.app/profile",
            "country": params.country || "CO",
            "amount": {
                "currency": params.currency || "USD",
                "value": Math.round(Number(params.total || 0) * 100) / 100
            },
            "checkout": {
                "session": params.checkoutSessionId
            },
            "customer_payer": customer_payer,
            "payment_method": {
                "token": params.oneTimeToken,
                "vault_on_success": true,
                "detail": {
                    "card": {
                        "verify": false,
                        "capture": true,
                    }
                }
            },
            "additional_data": {
                "airline": {
                    "legs": [
                        {
                            "arrival_airport": "SCL",
                            "arrival_airport_country": "CL",
                            "arrival_airport_city": "SCL",
                            "arrival_datetime": "2026-07-03T08:11:00",
                            "arrival_airport_timezone": "GMT-04",
                            "base_fare": null,
                            "base_fare_currency": null,
                            "carrier_code": "JA",
                            "departure_airport": "LIM",
                            "departure_airport_country": "PE",
                            "departure_airport_city": "LIM",
                            "departure_airport_timezone": "GMT-05",
                            "departure_datetime": "2026-07-03T04:30:00",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "7731",
                            "stopover_code": "O",
                            "route_order": 0,
                            "order": 0
                        },
                        {
                            "arrival_airport": "LIM",
                            "arrival_airport_country": "PE",
                            "arrival_airport_city": "LIM",
                            "arrival_datetime": "2026-07-07T12:40:00",
                            "arrival_airport_timezone": "GMT-05",
                            "base_fare": null,
                            "base_fare_currency": "USD",
                            "carrier_code": "JA",
                            "departure_airport": "SCL",
                            "departure_airport_country": "CL",
                            "departure_airport_city": "SCL",
                            "departure_airport_timezone": "GMT-04",
                            "departure_datetime": "2026-07-07T08:41:00",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "7730",
                            "stopover_code": "O",
                            "route_order": 1,
                            "order": 0
                        }
                    ],
                    "passengers": [
                        {
                            "country": null,
                            "date_of_birth": "1989-02-13",
                            "document": {
                                "document_number": "122345151",
                                "document_type": "P",
                                "country": "CL"
                            },
                            "first_name": "Carlos",
                            "last_name": "Medina",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": "",
                            "type": "A",
                            "email": null,
                            "phone": null
                        }
                    ],
                    "pnr": "M5RCSF",
                    "tickets": [
                        {
                            "ticket_number": "M5RCSF",
                            "restricted": false,
                            "total_fare_amount": 11.2,
                            "total_tax_amount": 0,
                            "total_fee_amount": 0,
                            "e_ticket": false,
                            "issue": {
                                "date": "2026-03-27T02:33:19",
                                "booking_system_code": "M5RCSF",
                                "booking_system_name": "Navitaire"
                            }
                        }
                    ]
                },
                "order": {
                    "fee_amount": 0,
                    "items": [
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Carry-on baggage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 1.2
                        }
                    ],
                    "shipping_amount": 0,
                    "sales_channel": "WebDuringBooking"
                }
            },
            "metadata": [
                {
                    "key": "fraudValidation",
                    "value": "yes"
                }
            ]
        }

        /*const body = {
            "description": "Pago de boletos",
            "payment_description": "Pago de boletos",
            "account_id": process.env.ACCOUNT_CODE!,
            "merchant_order_id": merchant_order_id,
            "country": "PE",
            "additional_data": {
                "airline": {
                    "legs": [
                        {
                            "departure_airport": "LIM",
                            "arrival_airport": "IQT",
                            "carrier_code": "2I",
                            "departure_airport_timezone": "-05:00",
                            "departure_datetime": "2026-03-28T11:45:00",
                            "fare_class_code": "L",
                            "flight_number": "3131"
                        }
                    ],
                    "passengers": [
                        {
                            "country": "PE",
                            "nationality": "PE",
                            "date_of_birth": "2002-03-29",
                            "document": {
                                "document_type": "DNI",
                                "document_number": "12345678"
                            },
                            "first_name": "ROSMERY",
                            "last_name": "CACHICATARI",
                            "type": "A"
                        }
                    ],
                    "pnr": "DHPVEQ"
                }
            },
            "amount": {
                "currency": "USD",
                "value": "169.54"
            },
            "checkout": {
                "session": params.checkoutSessionId
            },
            "customer_payer": customer_payer,
            "payment_method": {
                "type": "CARD",
                "token": params.oneTimeToken,
            }
        }*/
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