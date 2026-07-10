import { Suspense } from "react";
import HybridLiteForm from "../../components/HybridLiteForm";

export default function CheckoutHybridApmPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          🎯 Pay with an APM — SDK Lite
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Same checkout session · Yuno renders the selected method
        </p>
        <Suspense fallback={<div className="text-center text-gray-500">Loading…</div>}>
          <HybridLiteForm />
        </Suspense>
      </div>
    </div>
  );
}
