"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";
import CurrencySelector from "./CurrencySelector";
import { useState } from "react";

export default function Navbar() {
    const { cartItems } = useCart();
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const [showCheckoutMenu, setShowCheckoutMenu] = useState(false);

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
                {/* Checkout Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowCheckoutMenu(!showCheckoutMenu)}
                        className="hover:text-blue-600 transition flex items-center gap-1"
                    >
                        💳 Checkout
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {showCheckoutMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                            <Link
                                href="/checkout"
                                onClick={() => setShowCheckoutMenu(false)}
                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                            >
                                📋 Full Checkout
                            </Link>
                            <Link
                                href="/checkout-lite"
                                onClick={() => setShowCheckoutMenu(false)}
                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                            >
                                🎯 Lite Checkout
                            </Link>
                            <Link
                                href="/checkout-seamless"
                                onClick={() => setShowCheckoutMenu(false)}
                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition border-t border-gray-100"
                            >
                                ⚡ Seamless Checkout
                                <span className="block text-xs text-green-600 mt-0.5">Smart & Fast</span>
                            </Link>
                            <Link
                                href="/checkout-customized"
                                onClick={() => setShowCheckoutMenu(false)}
                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition border-t border-gray-100"
                            >
                                🔧 Customized Checkout
                                <span className="block text-xs text-orange-600 mt-0.5">Raw JSON Replay</span>
                            </Link>
                            <Link
                                href="/checkout-direct"
                                onClick={() => setShowCheckoutMenu(false)}
                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition border-t border-gray-100"
                            >
                                🔗 Direct API Checkout
                                <span className="block text-xs text-red-600 mt-0.5">No SDK - Raw Card Data</span>
                            </Link>
                        </div>
                    )}
                </div>

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
