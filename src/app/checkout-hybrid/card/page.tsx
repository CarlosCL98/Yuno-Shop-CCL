import HybridSecureFields from "../../components/HybridSecureFields";

export default function CheckoutHybridCardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          🔒 Pay with Card — Secure Fields
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Same checkout session · merchant-owned card form with your own error messages
        </p>
        <HybridSecureFields />
      </div>
    </div>
  );
}
