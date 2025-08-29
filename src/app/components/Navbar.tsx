"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";
import CurrencySelector from "./CurrencySelector";

export default function Navbar() {
    const { cartItems } = useCart();
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
            {/* Brand */}
            <Link href="/products" className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition">
                🛍️ Yuno Shop CCL
            </Link>

            {/* Currency Selector */}
            <div className="hidden md:block">
                <CurrencySelector />
            </div>

            {/* Links */}
            <div className="flex gap-6 items-center text-gray-700 font-medium">
                <Link href="/profile" className="hover:text-blue-600 transition">
                    👤 Profile
                </Link>

                <Link href="/cart" className="relative hover:text-blue-600 transition">
                    🛒 Cart
                    {itemCount > 0 && (
                        <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 shadow">
                            {itemCount}
                        </span>
                    )}
                </Link>
            </div>
        </nav>
    );
}
