import Link from "next/link";

const checkoutFlows = [
  {
    href: "/checkout",
    emoji: "📋",
    title: "Full Checkout",
    description: "Complete Yuno SDK checkout with all payment methods and fields.",
    color: "blue",
  },
  {
    href: "/checkout-lite",
    emoji: "🎯",
    title: "Lite Checkout",
    description: "Simplified checkout with minimal fields for faster payments.",
    color: "indigo",
  },
  {
    href: "/checkout-seamless",
    emoji: "⚡",
    title: "Seamless Checkout",
    description: "Smart and fast — embedded payment experience with no redirects.",
    color: "green",
  },
  {
    href: "/checkout-customized",
    emoji: "🔧",
    title: "Customized Checkout",
    description: "Raw JSON replay with full control over the payment payload.",
    color: "orange",
  },
  {
    href: "/checkout-direct",
    emoji: "🔗",
    title: "Direct API Checkout",
    description: "No SDK — sends raw card data directly via Yuno's API.",
    color: "red",
  },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 hover:border-blue-400",
  indigo: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
  green: "bg-green-50 border-green-200 hover:border-green-400",
  orange: "bg-orange-50 border-orange-200 hover:border-orange-400",
  red: "bg-red-50 border-red-200 hover:border-red-400",
};

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🛍️ Yuno Shop CCL
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A demo e-commerce store for testing Yuno payment integrations.
          Browse products, add them to your cart, and try different checkout
          flows to see how each integration works.
        </p>
        <div className="mt-8">
          <Link
            href="/products"
            className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            Browse Products
          </Link>
        </div>
      </div>

      {/* Checkout Flows */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Available Checkout Flows
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {checkoutFlows.map((flow) => (
          <Link
            key={flow.href}
            href={flow.href}
            className={`block p-5 rounded-lg border-2 transition ${colorMap[flow.color]}`}
          >
            <div className="text-2xl mb-2">{flow.emoji}</div>
            <h3 className="font-semibold text-gray-900 mb-1">{flow.title}</h3>
            <p className="text-sm text-gray-600">{flow.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
