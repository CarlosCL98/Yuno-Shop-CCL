import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function POST(req: NextRequest) {

    const publicKeyHeader = req.headers.get("x-api-key");
    const secretKeyHeader = req.headers.get("x-secret");

    if (
        publicKeyHeader !== process.env.NEXT_PUBLIC_API_KEY! ||
        secretKeyHeader !== process.env.PRIVATE_SECRET_KEY!
    ) {
        console.warn("Webhook rejected: wrong credentials");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    console.log("Webhook recibido:", body);

    await prisma.paymentAttempt.create({
        data: {
            paymentId: body.payment.id,
            status: body.payment.status,
            sub_status: body.payment.sub_status,
            amount: body.payment.amount.value,
            currency: body.payment.amount.currency,
            createdAt: body.payment.created_at,
            rawResponse: body
        },
    });

    return NextResponse.json({ received: true }, { status: 200 });
}