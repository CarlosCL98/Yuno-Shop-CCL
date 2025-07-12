"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function ShoppingCart() {
    const { cartItems, total, removeFromCart } = useCart();

    if (cartItems.length === 0) return <p>Your cart is empty. Return to the main page to select your products.</p>;

    return (
        <div className="m-10">
            {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b py-2">
                    <div>
                        <h2>{item.name}</h2>
                        <p>Cantidad: {item.quantity}</p>
                        <p>Subtotal: ${item.price * item.quantity}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-600">
                        Eliminar
                    </button>
                </div>
            ))}
            <h3 className="text-xl mt-4">Total: ${total.toLocaleString()}</h3>
            <div>
                <Link href="/checkout">
                    <button className="mt-2 bg-green-500 text-white px-4 py-1 rounded">
                        Proceed with Payment
                    </button>
                </Link>
            </div>
        </div>
    );
}