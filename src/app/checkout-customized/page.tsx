import CheckoutFormCustomized from "../components/CheckoutFormCustomized";

export default function CheckoutCustomizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          Raw JSON Checkout
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Paste raw API request bodies to replay merchant requests step-by-step
        </p>
        <CheckoutFormCustomized />
      </div>
    </div>
  );
}
