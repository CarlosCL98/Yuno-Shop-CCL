"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function Navbar() {
    const { cartItems } = useCart();

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <nav className="bg-white shadow p-4 flex justify-between items-center">
            <Link href="/products" className="text-xl font-bold text-gray-800">
                🛍️ Yuno CCL Shop
            </Link>
            <Link href="/cart" className="relative text-gray-700 hover:text-blue-600">
                <span className="ml-2 mr-6">🛒 View my cart</span>{itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{itemCount}</span>
                )}
            </Link>
        </nav>
    );
}