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
            "description": "Test Yuno",
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
                        ...(params.storedCredentials && {
                            "stored_credentials": {
                                "reason": "CARD_ON_FILE",
                                "usage": "FIRST",
                            }
                        }),
                    }
                }
            },
            "additional_data": {
                "order": {
                    "items": [
                        {
                            "category": "Recarga",
                            "id": "DALEFON-45",
                            "name": "Recarga Dale 45",
                            "sku_code": "DALEFON-45",
                            "quantity": 1,
                            "unit_amount": "45"
                        }
                    ]
                }
            }
        }

        /*const body = {
            "account_id": process.env.ACCOUNT_CODE!,
            "checkout": {
                "session": params.checkoutSessionId
            },
            "additional_data": {
                "airline": {
                    "legs": [
                        {
                            "arrival_airport": "AEP",
                            "arrival_airport_timezone": "GMT-3",
                            "arrival_datetime": "2026-07-18T09:30:00",
                            "base_fare": 0,
                            "base_fare_currency": null,
                            "carrier_code": "JA",
                            "departure_airport": "SCL",
                            "departure_airport_timezone": "GMT-4",
                            "departure_datetime": "2026-07-18T06:24:00",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "501",
                            "order": 0,
                            "route_order": 0,
                            "stopover_code": null
                        },
                        {
                            "arrival_airport": "SCL",
                            "arrival_airport_timezone": "GMT-4",
                            "arrival_datetime": "2026-07-21T20:30:00",
                            "base_fare": 0,
                            "base_fare_currency": null,
                            "carrier_code": "WJ",
                            "departure_airport": "AEP",
                            "departure_airport_timezone": "GMT-3",
                            "departure_datetime": "2026-07-21T19:06:00",
                            "fare_basis_code": null,
                            "fare_class_code": null,
                            "flight_number": "501",
                            "order": 0,
                            "route_order": 1,
                            "stopover_code": null
                        }
                    ],
                    "passengers": [
                        {
                            "country": null,
                            "date_of_birth": "2009-04-03T00:00:00",
                            "document": null,
                            "email": null,
                            "first_name": "Memb",
                            "last_name": "Memb",
                            "loyalty_number": null,
                            "loyalty_tier": null,
                            "middle_name": "",
                            "nationality": null,
                            "phone": null,
                            "type": "A"
                        }
                    ],
                    "pnr": "R97QVG",
                    "tickets": [
                        {
                            "e_ticket": false,
                            "issue": {
                                "booking_system_code": "R97QVG",
                                "booking_system_name": "Navitaire",
                                "date": "2026-07-17T05:12:03.869Z"
                            },
                            "restricted": false,
                            "ticket_number": null,
                            "total_fare_amount": 188.9,
                            "total_fee_amount": 0,
                            "total_tax_amount": 0
                        }
                    ]
                },
                "order": {
                    "items": [{
                        "brand": null,
                        "category": "Airline",
                        "id": "STB2",
                        "manufacture_part_number": null,
                        "name": "Ancillaries",
                        "quantity": 1,
                        "sku_code": "Service",
                        "unit_amount": 0.0000
                    }]
                }
            },
            "amount": {
                "currency": "USD",
                "value": 188.9
            },
            "callback_url": "https://js-next.qa.jetsm.art/bookingV2/member/post-commit?recordLocator=R97QVG&lastName=Memb&merchantOrderId=70ce1d7f-dfc3-4a40-9ef8-f241804928ca&checkoutSession=2ea5e627-4ecd-48bf-b756-319aa8ca7170&tabSessionId=1784263879947&token=%257B%2522auth_token%2522%253A%2522eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJEb3RSZXoiLCJqdGkiOiI0OGNiYmY5NS00OWM0LTgxMzYtNzU0NC03MWRiNDAwYjg5ZmEiLCJpc3MiOiJkb3RSRVogQVBJIn0.PedOTvfMJ_ne5MKUA9_i3kYEfRNLmysQq9WgIDlKw68%2522%252C%2522staff_benefit_token%2522%253A%2522eyJhbGciOiJBMTI4S1ciLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwidHlwIjoiSldUIn0.ACRaN82Gir07B_N6SqHLf7zzveAtdfM7adXeaUYvIFp8-MRb4nb_nA.lYHX0expBPRNAlDnh9cpxw.Lfkt2rJEygZeruJfZVjo6q2mzuqRkRqqd6QT5ECJ9lXRWefECOtQREBUciKgPS8K2QthCFXERUKXuvJ1ykgiz6F9ZfMP4eDacZdhw0Cz3HkgSjMWSyzzmCnV6ESIsTECfBRnvV0o6Uqt1oORz4_yFKc3Jas8s0R8HRwJFwPpVOweY7jeI0VsnmkX16zCYUfLUp7Mgnqoz1I7oaKe-hnCR-wwKWHZOOEcHmKd8VqSeYA6QQko5j-9Y6p7URe2eI_ZV22MXe89b9xYeZiI6Yo1vPPHER2eSZff_6a7bc9T_GCNJJon8csm7w8uaxpWa3848aWbx61ChwEI_8pP42xe9Rq2WC3K2hwKbAhiFW9zMySaR25nwl5hAu1IixzI9ZpL2mxQ5UdwpcwPLOrVf0PwzM7lelBLp0YPGkey7zvohv2e8j2oABOAKtzxa90e7cJGd2MrwFM9B_pJWc4mE-iGtcz1EekH--9jJSd_mgYe5EZhRq5i8dg1VK6bE25H1rkRA4EkdvPNIhRUjt_joJppjnWuCUMMATan5oPRIuGqTSP9XeWrnRoHnxUQNBiib8-sC5AffIIrFDzrVdHXuyBLiycdmzVmH2Bkm5tWOeb626lWvUB67eOmd2Sd5_cpqyB8h9KotuBTnx7UI4ug6UAQbD05xBYKQx_EgJ0UrQO5hu3mCalaH3GRf6pTlUVzooDRhcPMaaeSJ3EPuKitIaHCmzkW1ZhvHUNa50kMXrkyo9nqIB5sjr4KMiN_zNRRMJ9os1Rf1wObA0sTAmMcbZnxFTUiYwhm1xStH70l8kYtw1dBfJdb-h_58bOBHEBPjT7jMxi_-30VKNTxLiCl4oDUdw.0r7-q9yjuepzNCpk35scYQ%2522%252C%2522userType%2522%253A%2522member%2522%252C%2522locale%2522%253A%2522en_us%2522%252C%2522currency%2522%253A%2522USD%2522%252C%2522selected_country%2522%253A%257B%2522countryCode%2522%253A%2522US%2522%252C%2522flagImageUrl%2522%253A%2522https%253A%252F%252Fassets-us-01.kc-usercontent.com%253A443%252F06fddbb7-d218-0036-6b24-93a58966e67d%252F0003f55c-346b-462b-9b63-4d3c7c26d71c%252Fflag-usa.svg%2522%252C%2522localeCode%2522%253A%2522en_us%2522%252C%2522name%2522%253A%2522English%2522%257D%252C%2522itinerary_params%2522%253A%257B%2522recordLocator%2522%253A%2522R97QVG%2522%252C%2522lastName%2522%253A%2522Memb%2522%257D%257D",
            "country": "US",
            "customer_payer": {
                "email": "ingrid.macias@y.uno",
                "first_name": "Test",
                "id": null,
                "last_name": "Test",
                "phone": {
                    "country_code": "57",
                    "number": "31122211111"
                }
            },
            "description": "SCL-BUE-SCL",
            "merchant_order_id": "70ce1d7f-dfc3-4a40-9ef8-f241804928ca_riskified_2",
            "metadata": [
                {
                    "key": "sales_channel",
                    "value": "WebDuringBooking"
                }
            ],
            "payment_method": {
                "token": params.oneTimeToken,
            },
            "workflow": "SDK_CHECKOUT"
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