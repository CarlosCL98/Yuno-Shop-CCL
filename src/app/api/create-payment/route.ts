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
                            "departure_airport": "CCP",
                            "arrival_airport": "ANF",
                            "departure_datetime": "2025-11-05T15:19:00",
                            "arrival_datetime": "2025-11-05T17:44:00",
                            "arrival_airport_timezone": "GMT-3",
                            "base_fare": 0,
                            "base_fare_currency": null,
                            "carrier_code": "JA",
                            "departure_airport_timezone": "GMT-3",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "501",
                            "stopover_code": null,
                            "route_order": 0,
                            "order": 0
                        },
                        {
                            "departure_airport": "ANF",
                            "arrival_airport": "SCL",
                            "departure_datetime": "2025-11-08T23:43:00",
                            "arrival_datetime": "2025-11-09T01:37:00",
                            "arrival_airport_timezone": "GMT-3",
                            "base_fare": 0,
                            "base_fare_currency": null,
                            "carrier_code": "JA",
                            "departure_airport_timezone": "GMT-3",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "501",
                            "stopover_code": null,
                            "route_order": 1,
                            "order": 0
                        },
                        {
                            "departure_airport": "SCL",
                            "arrival_airport": "CCP",
                            "departure_datetime": "2025-11-09T12:15:00",
                            "arrival_datetime": "2025-11-09T13:24:00",
                            "arrival_airport_timezone": "GMT-3",
                            "base_fare": 0,
                            "base_fare_currency": null,
                            "carrier_code": "JA",
                            "departure_airport_timezone": "GMT-3",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "501",
                            "stopover_code": null,
                            "route_order": 2,
                            "order": 0
                        }
                    ],
                    "passengers": [
                        {
                            "country": null,
                            "date_of_birth": null,
                            "document": null,
                            "first_name": "Cristopher",
                            "last_name": "Evangelista",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": null,
                            "type": "A",
                            "email": null,
                            "phone": null
                        }
                    ],
                    "pnr": "I1JR8Y",
                    "tickets": [
                        {
                            "ticket_number": null,
                            "restricted": false,
                            "total_fare_amount": 260.86,
                            "total_tax_amount": 0,
                            "total_fee_amount": 0,
                            "e_ticket": false
                        }
                    ]
                },
                "order": {
                    "items": [
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Checked Ba",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 9
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 9
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Large Cabi",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 16.11
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 16.11
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Seat Fee P",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 14.7
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 14.7
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "FLXB",
                            "manufacture_part_number": null,
                            "name": "Flexi SMAR",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 7
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "FLXB",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 7
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "PBD",
                            "manufacture_part_number": null,
                            "name": "Priority B",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "PBD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "APCD",
                            "manufacture_part_number": null,
                            "name": "Airport Ch",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "APCD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Checked Ba",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 9
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "BAGD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 9
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Large Cabi",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 16.11
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "LBGD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 16.11
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Seat Fee P",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 15
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 15
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Seat Fee P",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 15.31
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "STB2",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 15.31
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "FLXB",
                            "manufacture_part_number": null,
                            "name": "Flexi SMAR",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 7
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "FLXB",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 7
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "PBD",
                            "manufacture_part_number": null,
                            "name": "Priority B",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "PBD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "APCD",
                            "manufacture_part_number": null,
                            "name": "Airport Ch",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        },
                        {
                            "category": "Ancillaries",
                            "brand": null,
                            "id": "APCD",
                            "manufacture_part_number": null,
                            "name": "Ancillary Service",
                            "quantity": 1,
                            "sku_code": "SSR",
                            "unit_amount": 3.51
                        }
                    ]
                }
            },
            "metadata": [
                {
                    "key": "processor",
                    "value": "NUVEI"
                },
                {
                    "key": "sales_channel",
                    "value": "PortalDuringBooking"
                }/*,
                {
                    "key": "with3DS",
                    "value": "no"
                },
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