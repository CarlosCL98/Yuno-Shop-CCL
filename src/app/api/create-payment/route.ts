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
            "merchant_reference": "M5RCSF_7fcf957f-94ce-421c-9430-accab62a5540",
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
                "vault_on_success": false,
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
                            "base_fare": 0,
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
                            "base_fare": 0,
                            "base_fare_currency": null,
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
                                "country": "XX"
                            },
                            "first_name": "Edson Smith",
                            "last_name": "Nu\u00F1ez Peralta",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": "",
                            "type": "A",
                            "email": null,
                            "phone": null
                        },
                        {
                            "country": null,
                            "date_of_birth": "1993-08-07",
                            "document": {
                                "document_number": "123569495",
                                "document_type": "P",
                                "country": "XX"
                            },
                            "first_name": "Brenda",
                            "last_name": "Linares Fudino",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": "",
                            "type": "A",
                            "email": null,
                            "phone": null
                        },
                        {
                            "country": null,
                            "date_of_birth": "1991-12-14",
                            "document": {
                                "document_number": "124375872",
                                "document_type": "P",
                                "country": "XX"
                            },
                            "first_name": "Grecia Andrea",
                            "last_name": "Geri Romero",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": "",
                            "type": "A",
                            "email": null,
                            "phone": null
                        },
                        {
                            "country": null,
                            "date_of_birth": "1990-01-20",
                            "document": {
                                "document_number": "70272444",
                                "document_type": "DNI",
                                "country": "XX"
                            },
                            "first_name": "Carolina del Pilar",
                            "last_name": "Guerrero Rupay",
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
                            "total_fare_amount": 692.0000,
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
                            "id": "INF",
                            "manufacture_part_number": null,
                            "name": "Infant Fee",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 30.24
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "INF",
                            "manufacture_part_number": null,
                            "name": "Infant Fee",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 15.00
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Carry-on baggage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 38.35
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Carry-on baggage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 30.09
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Checked baggage\n ",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 47.20
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Checked baggage\n ",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 44.25
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Carry-on baggage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 38.35
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Carry-on baggage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 30.09
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
                            "quantity": 1,
                            "sku_code": "Service",
                            "unit_amount": 0
                        },
                        {
                            "brand": null,
                            "category": "Ancillaries",
                            "id": "ACAA",
                            "manufacture_part_number": null,
                            "name": "Millas AAdvantage",
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
                    "key": "sales_channel",
                    "value": "WebDuringBooking"
                },
                {
                    "key": "TestKey1",
                    "value": "TestValue1"
                },
                {
                    "key": "TestKey2",
                    "value": "TestValue2"
                },
                {
                    "key": "PromoCode",
                    "value": "n/a"
                },
                {
                    "key": "SuperPromoCode",
                    "value": "n/a"
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