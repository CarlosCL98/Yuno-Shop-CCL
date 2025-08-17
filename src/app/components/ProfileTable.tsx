"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Payment = {
    id: string;
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    sub_status: string;
    createdAt: string;
};

export default function ProfileTable() {
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => {
        // Obtener los pagos existentes
        const fetchPayments = async () => {
            const { data, error } = await supabase
                .from("PaymentAttempt")
                .select("*")
                .order("createdAt", { ascending: false });

            if (!error && data) {
                setPayments(data);
                console.log("Payments fetched:", data);
            } else {
                console.error("Error fetching payments:", error);
            }
        };

        fetchPayments();

        // Suscripción en tiempo real
        const channel = supabase
            .channel("realtime:PaymentAttempt")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "PaymentAttempt",
                },
                (payload) => {
                    const newPayment = payload.new as Payment;
                    setPayments((prev) => [newPayment, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (payments.length === 0) {
        return <p className="text-center text-gray-500">There are no payment records yet.</p>;
    }

    return (

        <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
            <table className="min-w-full text-sm text-left table-auto bg-white">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-medium tracking-wider">
                    <tr>
                        <th className="px-4 py-3 border-b">Payment ID</th>
                        <th className="px-4 py-3 border-b">Amount</th>
                        <th className="px-4 py-3 border-b">Currency</th>
                        <th className="px-4 py-3 border-b">Status</th>
                        <th className="px-4 py-3 border-b">Payment Date</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map((p: any, idx: number) => (
                        <tr
                            key={p.id}
                            className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                            <td className="px-4 py-2 border-b">{p.paymentId}</td>
                            <td className="px-4 py-2 border-b font-medium">
                                ${(p.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 border-b">{p.currency}</td>
                            <td className="px-4 py-2 border-b">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${p.sub_status === "APPROVED"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                        }`}
                                >
                                    {p.status} / {p.sub_status}
                                </span>
                            </td>
                            <td className="px-4 py-2 border-b text-gray-700">
                                {new Date(p.createdAt).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
