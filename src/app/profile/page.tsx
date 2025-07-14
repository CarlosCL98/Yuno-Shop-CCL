import { prisma } from "../lib/prisma";

export default async function ProfilePage() {
    const payments = await prisma.paymentAttempt.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">🧾 My Orders</h1>

            {payments.length === 0 ? (
                <p className="text-center text-gray-500">There are no payment records yet.</p>
            ) : (
                <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm text-left table-auto bg-white">
                        <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-medium tracking-wider">
                            <tr>
                                <th className="px-4 py-3 border-b">Payment ID</th>
                                <th className="px-4 py-3 border-b">Amount</th>
                                <th className="px-4 py-3 border-b">Currency</th>
                                <th className="px-4 py-3 border-b">Status</th>
                                <th className="px-4 py-3 border-b">Date</th>
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
            )}
        </div>
    );
}
