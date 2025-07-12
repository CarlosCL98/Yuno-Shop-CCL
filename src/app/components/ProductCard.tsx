"use client";

import { Product } from "../models/definitions";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart();

    return (
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition">
            <img src={product.image} alt={product.name} className="rounded-md h-40 object-contain w-full" />
            <h2 className="mt-2 text-lg font-semibold">{product.name}</h2>
            <p className="text-gray-700">${product.price.toLocaleString()}</p>
            <button onClick={() => addToCart(product)} className="mt-2 bg-blue-500 text-white px-4 py-1 rounded">
                Add to Cart
            </button>
        </div>
    );
}
