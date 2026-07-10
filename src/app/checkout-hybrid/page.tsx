import CheckoutFormHybrid from "../components/CheckoutFormHybrid";

export default function CheckoutHybridPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          🔀 Hybrid Checkout
        </h1>
        <p className="text-center text-gray-600 mb-8">
          One checkout session · CARD → Secure Fields · APMs → SDK Lite
        </p>
        <CheckoutFormHybrid />
      </div>
    </div>
  );
}
