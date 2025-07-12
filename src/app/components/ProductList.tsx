import { products } from "../data/products";
import ProductCard from "./ProductCard";
import Link from "next/link";

export default function ProductList() {
    return (
        <div className="m-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/cart">
                    <button className="mt-2 bg-green-500 text-white px-4 py-1 rounded">
                        Go to Shopping Cart
                    </button>
                </Link>
            </div>
        </div>
    );
}
