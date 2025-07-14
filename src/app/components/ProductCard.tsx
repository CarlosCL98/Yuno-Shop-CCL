"use client";

import { Product } from "../models/definitions";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart();

    return (
        <div className="bg-white rounded-2xl shadow-md p-4 hover:shadow-xl transition duration-300 flex flex-col items-center">
            <img
                src={product.image}
                alt={product.name}
                className="rounded-md h-40 w-full object-contain mb-4"
            />
            <h2 className="text-lg font-semibold text-center">{product.name}</h2>
            <p className="text-gray-700 text-center mb-2">${product.price.toLocaleString()}</p>
            <button
                onClick={() => addToCart(product)}
                className="mt-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition"
            >
                Add to Cart
            </button>
        </div>
    );
}
