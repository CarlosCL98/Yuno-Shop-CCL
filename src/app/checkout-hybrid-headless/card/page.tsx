import HybridHeadlessCard from "../../components/HybridHeadlessCard";

export default function CheckoutHybridHeadlessCardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          ⚡ Pay with Card — Headless SDK
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Same checkout session · merchant-owned card form · SDK only tokenizes the card
        </p>
        <HybridHeadlessCard />
      </div>
    </div>
  );
}
