"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface PaymentResult {
  status: "success" | "error" | "pending";
  message: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get parameters from URL
    const status = searchParams.get("status");
    const orderId = searchParams.get("order_id");
    const paymentId = searchParams.get("payment_id");
    const amount = searchParams.get("amount");
    const currency = searchParams.get("currency");
    const error = searchParams.get("error");

    // Determine payment result based on URL parameters
    let result: PaymentResult;

    if (status === "success" || (!status && !error)) {
      result = {
        status: "success",
        message: "Payment completed successfully!",
        orderId: orderId || undefined,
        paymentId: paymentId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        currency: currency || undefined,
      };
    } else if (status === "error" || error) {
      result = {
        status: "error",
        message: error || "Payment failed. Please try again.",
        orderId: orderId || undefined,
        paymentId: paymentId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        currency: currency || undefined,
      };
    } else {
      result = {
        status: "pending",
        message: "Payment is being processed...",
        orderId: orderId || undefined,
        paymentId: paymentId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        currency: currency || undefined,
      };
    }

    setPaymentResult(result);
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!paymentResult) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">Unable to process payment result</p>
          <Link
            href="/products"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Status Icon */}
        <div className="mb-6">
          {paymentResult.status === "success" && (
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          {paymentResult.status === "error" && (
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
          {paymentResult.status === "pending" && (
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-yellow-600 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Status Title */}
        <h1
          className={`text-2xl font-bold mb-4 ${
            paymentResult.status === "success"
              ? "text-green-600"
              : paymentResult.status === "error"
              ? "text-red-600"
              : "text-yellow-600"
          }`}
        >
          {paymentResult.status === "success"
            ? "Payment Successful!"
            : paymentResult.status === "error"
            ? "Payment Failed"
            : "Payment Processing"}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">{paymentResult.message}</p>

        {/* Payment Details */}
        {(paymentResult.orderId || paymentResult.paymentId || paymentResult.amount) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Payment Details</h3>
            {paymentResult.orderId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Order ID:</span> {paymentResult.orderId}
              </p>
            )}
            {paymentResult.paymentId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Payment ID:</span> {paymentResult.paymentId}
              </p>
            )}
            {paymentResult.amount && paymentResult.currency && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Amount:</span> {paymentResult.currency} {paymentResult.amount.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {paymentResult.status === "success" && (
            <>
              <Link
                href="/profile"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View My Orders
              </Link>
              <Link
                href="/products"
                className="block w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Continue Shopping
              </Link>
            </>
          )}
          {paymentResult.status === "error" && (
            <>
              <Link
                href="/checkout"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/products"
                className="block w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Products
              </Link>
            </>
          )}
          {paymentResult.status === "pending" && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                You will receive an email confirmation once the payment is processed.
              </p>
              <Link
                href="/profile"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Check Order Status
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
