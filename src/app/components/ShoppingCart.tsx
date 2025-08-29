"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

export default function ShoppingCart() {
    const { cartItems, total, removeFromCart } = useCart();
    const { formatPrice } = useCurrency();

    if (cartItems.length === 0)
        return (
            <div className="max-w-3xl mx-auto mt-10 text-center text-gray-600">
                <p className="text-lg">🛒 Your cart is empty.</p>
                <Link href="/products" className="text-blue-600 hover:underline">
                    Return to the main page to select your products
                </Link>
            </div>
        );

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>

            <div className="space-y-4">
                {cartItems.map((item) => (
                    <div
                        key={item.id}
                        className="flex flex-col md:flex-row justify-between items-center bg-white rounded-xl shadow-sm p-4 border hover:shadow-md transition"
                    >
                        <div className="w-full md:w-3/4 mb-4 md:mb-0">
                            <h2 className="text-lg font-semibold">{item.name}</h2>
                            <p className="text-gray-600">Quantity: {item.quantity}</p>
                            <p className="text-gray-700 font-medium">
                                Subtotal: {formatPrice(item.price * item.quantity)}
                            </p>
                        </div>
                        <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                        >
                            Remove ❌
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 border-t pt-4">
                <h3 className="text-xl font-bold text-right">Total: {formatPrice(total)}</h3>
                <div className="flex justify-end mt-4">
                    <Link href="/checkout">
                        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full transition font-medium">
                            ✅ Proceed with Payment
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
