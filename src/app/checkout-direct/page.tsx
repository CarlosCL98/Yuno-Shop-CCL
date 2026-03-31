import CheckoutFormDirect from "../components/CheckoutFormDirect";

export default function CheckoutDirectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          Direct API Checkout
        </h1>
        <p className="text-center text-gray-600 mb-8">
          No SDK — Raw card data sent directly to Yuno REST API
        </p>
        <CheckoutFormDirect />
      </div>
    </div>
  );
}
