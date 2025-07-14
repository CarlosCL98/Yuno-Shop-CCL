import { products } from "../data/products";
import ProductCard from "./ProductCard";
import Link from "next/link";

export default function ProductList() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Our Products</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            <div className="mt-8 flex justify-center">
                <Link href="/cart">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full transition">
                        🛒 Go to Shopping Cart
                    </button>
                </Link>
            </div>
        </div>
    );
}
