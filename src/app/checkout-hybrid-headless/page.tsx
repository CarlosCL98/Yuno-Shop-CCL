import CheckoutFormHybrid from "../components/CheckoutFormHybrid";

export default function CheckoutHybridHeadlessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          ⚡ Hybrid Headless Checkout
        </h1>
        <p className="text-center text-gray-600 mb-8">
          One checkout session · CARD → Headless SDK · APMs → SDK Lite
        </p>
        <CheckoutFormHybrid
          basePath="/checkout-hybrid-headless"
          cardIntegrationLabel="⚡ Headless"
        />
      </div>
    </div>
  );
}
