import CheckoutFormSecureFields from "../components/CheckoutFormSecureFields";

export default function CheckoutSecureFieldsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          🔒 Secure Fields Checkout
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Merchant-owned card form with your own error messages — Yuno provides only the secure inputs
        </p>
        <CheckoutFormSecureFields />
      </div>
    </div>
  );
}
