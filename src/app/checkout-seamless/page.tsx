import CheckoutFormSeamless from "../components/CheckoutFormSeamless";

export default function CheckoutSeamlessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          ⚡ Seamless Checkout
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Fast, secure, and smart payment experience
        </p>
        <CheckoutFormSeamless />
      </div>
    </div>
  );
}

