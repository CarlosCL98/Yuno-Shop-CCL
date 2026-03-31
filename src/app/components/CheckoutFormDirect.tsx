"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useCart } from "../context/CartContext";
import { usePayments } from "../context/PaymentContext";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries, getDocumentTypes } from "../data/countries";
import Link from "next/link";

type FlowStep = "customer_info" | "card_entry" | "processing" | "result";

const TERMINAL_STATUSES = ["SUCCEEDED", "DECLINED", "REJECTED", "ERROR", "CANCELLED"];

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, "");
  if (!/^\d+$/.test(digits) || digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export default function CheckoutFormDirect() {
  const { cartItems, total } = useCart();
  const { addPayment } = usePayments();
  const { currency, formatPrice, setCountry, country: currencyCountry, convertPrice } = useCurrency();
  const { customerData, updateCustomerField, updateNestedField, updateCountryData, clearCachedCustomerId } = useCustomer();

  const [currentStep, setCurrentStep] = useState<FlowStep>("customer_info");
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [holderName, setHolderName] = useState("");
  const [cardType, setCardType] = useState("CREDIT");
  const [cardError, setCardError] = useState("");

  // Payment / 3DS state
  const [paymentId, setPaymentId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [sdkActionRequired, setSdkActionRequired] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [processingMessage, setProcessingMessage] = useState("Processing payment...");

  // Polling refs
  const pollingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const finalAmount = useCustomAmount && customAmount ? parseFloat(customAmount) : total;

  // Sync customer data when currency context country changes
  useEffect(() => {
    if (currencyCountry && currencyCountry !== customerData.country) {
      updateCountryData(currencyCountry);
    }
  }, [currencyCountry, customerData.country, updateCountryData]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // postMessage listener for 3DS completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "3DS_COMPLETE" || event.data?.status) {
        // Trigger immediate poll
        if (paymentId) {
          pollPaymentStatus(paymentId, true);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const pollPaymentStatus = useCallback(async (pId: string, singlePoll = false) => {
    if (!singlePoll) {
      pollingRef.current = true;
      abortControllerRef.current = new AbortController();
    }

    const maxAttempts = singlePoll ? 1 : 60;
    for (let i = 0; i < maxAttempts; i++) {
      if (!singlePoll && !pollingRef.current) break;

      try {
        const res = await fetch("/api/get-payment-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: pId }),
          signal: !singlePoll ? abortControllerRef.current?.signal : undefined,
        });

        if (!res.ok) continue;

        const data = await res.json();
        const status = data.status || data.sub_status;

        if (TERMINAL_STATUSES.includes(status)) {
          pollingRef.current = false;
          setPaymentResult(data);
          setPaymentStatus(status);
          setCurrentStep("result");

          addPayment({
            payment_id: data.id,
            status: data.sub_status || data.status,
            amount: data.amount?.value,
            currency: data.amount?.currency || currency,
            created_at: data.created_at,
          });
          return;
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Poll error:", err);
      }

      if (!singlePoll) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }, [addPayment, currency]);

  const handleCopyAddress = () => {
    updateNestedField("billing_address", "address_line_1", customerData.shipping_address?.address_line_1 || "");
    updateNestedField("billing_address", "address_line_2", customerData.shipping_address?.address_line_2 || "");
    updateNestedField("billing_address", "country", customerData.shipping_address?.country || "");
    updateNestedField("billing_address", "state", customerData.shipping_address?.state || "");
    updateNestedField("billing_address", "city", customerData.shipping_address?.city || "");
    updateNestedField("billing_address", "zip_code", customerData.shipping_address?.zip_code || "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "country") {
      setCountry(value);
      updateCountryData(value);
    } else {
      updateCustomerField(name as keyof typeof customerData, value);
    }
  };

  const handleNestedChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    section: "document" | "phone" | "billing_address" | "shipping_address"
  ) => {
    const { name, value } = e.target;
    if (name === "country") {
      setCountry(value);
      updateCountryData(value);
    } else {
      updateNestedField(section, name, value);
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create customer
      const customerResponse = await fetch("/api/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      const customer = await customerResponse.json();
      setCustomerId(customer.id);
      localStorage.setItem("yuno_customer_id", customer.id);

      setCurrentStep("card_entry");
    } catch (error) {
      console.error("Error processing customer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");

    const rawNumber = cardNumber.replace(/\s/g, "");
    if (!luhnCheck(rawNumber)) {
      setCardError("Invalid card number (Luhn check failed)");
      return;
    }
    if (!expMonth || !expYear) {
      setCardError("Please select expiration month and year");
      return;
    }
    if (securityCode.length < 3) {
      setCardError("Security code must be 3-4 digits");
      return;
    }
    if (!holderName.trim()) {
      setCardError("Cardholder name is required");
      return;
    }

    setIsLoading(true);
    setCurrentStep("processing");
    setProcessingMessage("Sending payment...");

    try {
      const convertedTotal = Math.round((useCustomAmount ? finalAmount : convertPrice(total, "USD")) * 100) / 100;

      const res = await fetch("/api/direct-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          total: convertedTotal,
          currency,
          country: customerData.country,
          browserInfo: {
            user_agent: navigator.userAgent,
            accept_header: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            language: navigator.language,
            screen_height: String(window.screen.height),
            screen_width: String(window.screen.width),
            color_depth: String(window.screen.colorDepth),
            browser_time_difference: String(new Date().getTimezoneOffset()),
            javascript_enabled: true,
            java_enabled: false,
          },
          card: {
            number: rawNumber,
            expiration_month: parseInt(expMonth, 10),
            expiration_year: parseInt(expYear, 10),
            security_code: securityCode,
            holder_name: holderName,
            card_type: cardType,
          },
        }),
      });

      const data = await res.json();
      console.log("Direct payment response:", JSON.stringify(data, null, 2));

      // Unwrap: Yuno wraps everything in data.payment
      const payment = data.payment || data;
      console.log("Unwrapped payment:", JSON.stringify(payment, null, 2));

      if (!res.ok || !payment.id) {
        console.error("Direct payment failed:", data);
        setProcessingMessage(`Payment failed: ${data.error || data.message || JSON.stringify(data)}`);
        setIsLoading(false);
        return;
      }

      setPaymentId(payment.id);

      // Extract 3DS fields — try multiple known paths for robustness
      const actionRequired =
        payment.checkout?.sdk_action_required ??
        payment.sdk_action_required ??
        payment.sub_status === "WAITING_ADDITIONAL_STEP";

      const cardDetail = payment.transactions?.[0]?.payment_method?.detail?.card;
      const threeDsRedirectUrl =
        cardDetail?.redirect_url ||
        payment.redirect_url ||
        payment.checkout?.redirect_url ||
        payment.transactions?.[0]?.redirect_url ||
        "";

      console.log("3DS extraction →", {
        actionRequired,
        threeDsRedirectUrl,
        sub_status: payment.sub_status,
        checkout: payment.checkout,
        cardDetail,
      });

      // Check if 3DS is needed
      if (actionRequired && threeDsRedirectUrl) {
        setSdkActionRequired(true);
        setRedirectUrl(threeDsRedirectUrl);
        setProcessingMessage("3D Secure verification required...");
        // Start polling
        pollPaymentStatus(payment.id);
      } else {
        // Check if already terminal
        const status = payment.status || payment.sub_status;
        if (TERMINAL_STATUSES.includes(status)) {
          setPaymentResult(payment);
          setPaymentStatus(status);
          setCurrentStep("result");
          addPayment({
            payment_id: payment.id,
            status: payment.sub_status || payment.status,
            amount: payment.amount?.value,
            currency: payment.amount?.currency || currency,
            created_at: payment.created_at,
          });
        } else {
          // Not terminal yet, start polling
          setProcessingMessage("Waiting for payment confirmation...");
          pollPaymentStatus(payment.id);
        }
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      setProcessingMessage("Error creating payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIframeError = () => {
    setIframeError(true);
    if (redirectUrl) {
      window.open(redirectUrl, "_blank");
    }
  };

  const handleCancelProcessing = () => {
    pollingRef.current = false;
    abortControllerRef.current?.abort();
    setCurrentStep("card_entry");
    setSdkActionRequired(false);
    setRedirectUrl("");
    setIframeError(false);
  };

  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const years = Array.from({ length: 11 }, (_, i) => String(currentYear + i));

  const steps: FlowStep[] = ["customer_info", "card_entry", "processing", "result"];

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = steps.indexOf(currentStep) > index;
          return (
            <div key={step} className="flex items-center space-x-2">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  isActive
                    ? "bg-red-600 text-white"
                    : isCompleted
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 ${isCompleted ? "bg-green-500" : "bg-gray-300"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-4xl mx-auto px-4 py-6 bg-white rounded-xl shadow-md">
      {renderProgressBar()}

      {/* Step 1: Customer Information */}
      {currentStep === "customer_info" && (
        <form onSubmit={handleCustomerSubmit} className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">🧾 Purchase Summary</h2>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-gray-700">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <hr className="my-3 border-gray-300" />
              <p className="text-right text-lg font-semibold text-gray-900">Total: {formatPrice(total)}</p>
            </div>

            {/* Custom Amount */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
                <input
                  type="checkbox"
                  checked={useCustomAmount}
                  onChange={(e) => {
                    setUseCustomAmount(e.target.checked);
                    if (!e.target.checked) setCustomAmount("");
                  }}
                  className="w-4 h-4"
                />
                🧪 Use custom amount for testing
              </label>
              {useCustomAmount && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter test amount"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                  <span className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                    {currency}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">👤 Payer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField name="first_name" placeholder="First Name" value={customerData.first_name || ""} onChange={handleChange} required />
              <InputField name="last_name" placeholder="Last Name" value={customerData.last_name || ""} onChange={handleChange} required />
              <SelectField
                name="country"
                placeholder="Select Country"
                value={customerData.country || ""}
                onChange={handleChange}
                options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
                required
              />
              <InputField name="email" type="email" placeholder="Email" value={customerData.email || ""} onChange={handleChange} required />
              <SelectField
                name="document_type"
                placeholder="Document Type"
                value={customerData.document?.document_type || ""}
                onChange={(e) => handleNestedChange(e, "document")}
                options={getDocumentTypes(customerData.country || "").map((d) => ({ value: d, label: d }))}
              />
              <InputField
                name="document_number"
                placeholder="Document Number"
                value={customerData.document?.document_number || ""}
                onChange={(e) => handleNestedChange(e, "document")}
              />
              <InputField
                name="number"
                type="tel"
                placeholder="Phone Number"
                value={customerData.phone?.number || ""}
                onChange={(e) => handleNestedChange(e, "phone")}
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">📦 Shipping Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField name="address_line_1" placeholder="Address" value={customerData.shipping_address?.address_line_1 || ""} onChange={(e) => handleNestedChange(e, "shipping_address")} />
              <InputField name="city" placeholder="City" value={customerData.shipping_address?.city || ""} onChange={(e) => handleNestedChange(e, "shipping_address")} />
              <SelectField
                name="country"
                placeholder="Select Country"
                value={customerData.shipping_address?.country || ""}
                onChange={(e) => handleNestedChange(e, "shipping_address")}
                options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">🧾 Billing Address</h2>
            <label className="flex items-center gap-2 mb-4 text-gray-700">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => {
                  setSameAsShipping(e.target.checked);
                  if (e.target.checked) handleCopyAddress();
                }}
              />
              Use the same as shipping address
            </label>

            {!sameAsShipping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField name="address_line_1" placeholder="Address" value={customerData.billing_address?.address_line_1 || ""} onChange={(e) => handleNestedChange(e, "billing_address")} />
                <InputField name="city" placeholder="City" value={customerData.billing_address?.city || ""} onChange={(e) => handleNestedChange(e, "billing_address")} />
                <SelectField
                  name="country"
                  placeholder="Select Country"
                  value={customerData.billing_address?.country || ""}
                  onChange={(e) => handleNestedChange(e, "billing_address")}
                  options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
                />
              </div>
            )}

            <div className="flex gap-4 mt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full transition disabled:bg-gray-400"
              >
                {isLoading ? "Loading..." : "Continue to Card Entry"}
              </button>
              <button
                type="button"
                onClick={clearCachedCustomerId}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm transition"
              >
                🔄 Clear Cache
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Step 2: Card Entry */}
      {currentStep === "card_entry" && (
        <form onSubmit={handleCardSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-center">💳 Enter Card Details</h2>
          <p className="text-center text-sm text-red-600 font-medium">
            Direct API — No SDK tokenization
          </p>

          <div className="max-w-md mx-auto space-y-4">
            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4111 1111 1111 1111"
                maxLength={23}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg tracking-wider"
                required
              />
            </div>

            {/* Expiration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">MM</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">YYYY</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Security Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Code (CVV)</label>
              <input
                type="text"
                inputMode="numeric"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                maxLength={4}
                className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="JOHN DOE"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 uppercase"
                required
              />
            </div>

            {/* Card Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
              </select>
            </div>

            {cardError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{cardError}</div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full transition disabled:bg-gray-400 font-semibold"
              >
                {isLoading ? "Processing..." : "Pay Now"}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep("customer_info")}
                className="text-gray-600 hover:text-gray-800 px-4 py-3"
              >
                ← Back
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: Processing / 3DS */}
      {currentStep === "processing" && (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold">🔐 Payment Processing</h2>
          <p className="text-gray-600">{processingMessage}</p>

          {/* 3DS Iframe Modal */}
          {sdkActionRequired && redirectUrl && !iframeError && (
            <div className="mx-auto max-w-lg border border-gray-300 rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b">
                <span className="font-semibold text-gray-700">3D Secure Verification</span>
                <button
                  onClick={handleCancelProcessing}
                  className="text-gray-500 hover:text-gray-800 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <iframe
                src={redirectUrl}
                width="100%"
                height="600"
                sandbox="allow-forms allow-scripts allow-same-origin"
                onError={handleIframeError}
                onLoad={() => {
                  // Set a timeout fallback in case iframe loaded but doesn't work
                  setTimeout(() => {
                    if (currentStep === "processing" && pollingRef.current) {
                      // Still processing after 5s - iframe might have issues
                    }
                  }, 5000);
                }}
                className="border-0"
              />
              <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
                Verifying your payment...
              </div>
            </div>
          )}

          {/* Fallback: opened in new tab */}
          {iframeError && (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
              <p className="text-yellow-800 font-medium">
                Complete verification in the new tab
              </p>
              <p className="text-yellow-600 text-sm mt-2">
                We opened the 3DS verification in a new tab. Complete it there, and this page will update automatically.
              </p>
              <button
                onClick={() => window.open(redirectUrl, "_blank")}
                className="mt-4 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Reopen verification tab
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {!sdkActionRequired && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          )}

          <button
            onClick={handleCancelProcessing}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Cancel and go back
          </button>
        </div>
      )}

      {/* Step 4: Result */}
      {currentStep === "result" && (
        <div className="text-center space-y-6">
          {paymentStatus === "SUCCEEDED" ? (
            <>
              <div className="text-6xl">✅</div>
              <h2 className="text-3xl font-bold text-green-600">Payment Successful!</h2>
            </>
          ) : (
            <>
              <div className="text-6xl">❌</div>
              <h2 className="text-3xl font-bold text-red-600">Payment {paymentStatus}</h2>
            </>
          )}

          {paymentResult && (
            <div className="max-w-md mx-auto text-left bg-gray-50 rounded-lg p-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-sm">{paymentResult.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold">{paymentResult.sub_status || paymentResult.status}</span>
              </div>
              {paymentResult.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">
                    {paymentResult.amount.currency} {paymentResult.amount.value}
                  </span>
                </div>
              )}
              {paymentResult.merchant_order_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-sm">{paymentResult.merchant_order_id}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <Link
              href="/profile"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full transition"
            >
              View Profile
            </Link>
            <Link
              href="/products"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
