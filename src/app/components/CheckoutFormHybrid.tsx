"use client";

import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import { useRouter } from "next/navigation";
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries, getDocumentTypes } from "../data/countries";
import { PaymentMethod } from "../models/definitions";

/**
 * Hybrid checkout — entry / selector page.
 *
 * Creates ONE checkout session, lists the available payment methods for it, and then
 * routes the shopper to the right integration WITHOUT creating a new session:
 *   - CARD → /checkout-hybrid/card  (Secure Fields, merchant-owned card form)
 *   - APM  → /checkout-hybrid/apm   (SDK Lite, mountCheckoutLite / mountExternalButtons)
 *
 * The session id, converted amount, currency, country and demo options are persisted to
 * localStorage so the two payment pages are fully self-contained.
 */
export default function CheckoutFormHybrid() {
  const { cartItems, total } = useCart();
  const { currency, formatPrice, convertPrice, setCountry, country: currencyCountry } = useCurrency();
  const { customerData, updateCustomerField, updateNestedField, updateCountryData, clearCachedCustomerId } = useCustomer();

  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [useGuestCheckout, setUseGuestCheckout] = useState(false);
  const [sendStoredCredentials, setSendStoredCredentials] = useState(false);
  const [storedCredentialsReason, setStoredCredentialsReason] = useState("CARD_ON_FILE");
  const [storedCredentialsUsage, setStoredCredentialsUsage] = useState("FIRST");
  const [sameAsShipping, setSameAsShipping] = useState(false);

  const router = useRouter();

  // Final amount (custom or cart total)
  const finalAmount = useCustomAmount && customAmount ? Number(parseFloat(customAmount).toFixed(2)) : total;

  // Sync customer data when currency context country changes (e.g., from navbar)
  useEffect(() => {
    if (currencyCountry && currencyCountry !== customerData.country) {
      updateCountryData(currencyCountry);
    }
  }, [currencyCountry, customerData.country, updateCountryData]);

  const handleCopyAddress = () => {
    updateNestedField('billing_address', 'address_line_1', customerData.shipping_address?.address_line_1 || '');
    updateNestedField('billing_address', 'address_line_2', customerData.shipping_address?.address_line_2 || '');
    updateNestedField('billing_address', 'country', customerData.shipping_address?.country || '');
    updateNestedField('billing_address', 'state', customerData.shipping_address?.state || '');
    updateNestedField('billing_address', 'city', customerData.shipping_address?.city || '');
    updateNestedField('billing_address', 'zip_code', customerData.shipping_address?.zip_code || '');
  };

  const handleDeleteAddress = () => {
    updateNestedField('billing_address', 'address_line_1', '');
    updateNestedField('billing_address', 'address_line_2', '');
    updateNestedField('billing_address', 'country', '');
    updateNestedField('billing_address', 'state', 'Cundinamarca');
    updateNestedField('billing_address', 'city', '');
    updateNestedField('billing_address', 'zip_code', '11111');
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

  // ── Confirm Information → create customer + session + fetch methods ────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      let customerId: string | null = null;

      // Only create customer if NOT using guest checkout
      if (!useGuestCheckout) {
        const customerResponse = await fetch("/api/create-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customerData),
        });
        const customer = await customerResponse.json();
        customerId = customer.id;
        localStorage.setItem("yuno_customer_id", customer.id);
        console.log("Yuno answer customer:", customer);
      } else {
        localStorage.removeItem("yuno_customer_id");
        console.log("Guest checkout - skipping customer creation");
      }

      // If using custom amount, it's already in the selected currency, so don't convert.
      // If using cart total, convert from USD to selected currency.
      const convertedTotal = useCustomAmount ? finalAmount : Math.round(convertPrice(finalAmount, "USD") * 100) / 100;
      console.log("Checkout session amount:", convertedTotal, "useCustomAmount:", useCustomAmount);

      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          amount: convertedTotal,
          country: customerData.country,
          currency: currency,
        }),
      });
      const checkout = await response.json();
      if (!checkout.checkout_session) {
        throw new Error("No checkout session returned");
      }
      console.log("Yuno answer checkout:", checkout);

      // Persist everything the payment pages need to run standalone.
      localStorage.setItem("yuno_checkout_session", checkout.checkout_session);
      localStorage.setItem("yuno_checkout_amount", String(convertedTotal));
      localStorage.setItem("yuno_checkout_currency", currency);
      localStorage.setItem("yuno_checkout_country", customerData.country || "");
      localStorage.setItem(
        "yuno_hybrid_options",
        JSON.stringify({
          isGuestCheckout: useGuestCheckout,
          sendStoredCredentials,
          storedCredentialsReason,
          storedCredentialsUsage,
        })
      );

      // Fetch payment methods for this session
      const paymentMethodsResponse = await fetch("/api/get-payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutSession: checkout.checkout_session }),
      });
      const paymentMethodsData = await paymentMethodsResponse.json();

      if (!Array.isArray(paymentMethodsData)) {
        console.error("Unexpected payment methods response:", paymentMethodsData);
        throw new Error("Could not load payment methods");
      }

      setPaymentMethods(paymentMethodsData);
      setShowPaymentMethods(true);
      console.log("Available payment methods:", paymentMethodsData);
    } catch (err) {
      console.error("Error preparing checkout:", err);
      setError(err instanceof Error ? err.message : "Something went wrong preparing the checkout.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Route to the correct integration based on selected method ─────────────────
  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    if (method.type === "CARD") {
      router.push("/checkout-hybrid/card");
    } else {
      const params = new URLSearchParams({
        type: method.type,
        vaulted: method.vaulted_token || "",
        name: method.name || method.type,
      });
      router.push(`/checkout-hybrid/apm?${params.toString()}`);
    }
  };

  const getPaymentMethodId = (method: PaymentMethod) =>
    method.vaulted_token ? `${method.type}_${method.vaulted_token}` : `${method.type}_new`;

  return (
    <form className="space-y-10 max-w-4xl mx-auto px-4 py-6 bg-white rounded-xl shadow-md">
      {/* Cart Summary + demo toggles */}
      {!showPaymentMethods && (
        <>
          <section>
            <h2 className="text-2xl font-bold mb-4">🧾 Purchase Summary</h2>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-gray-700">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <hr className="my-3 border-gray-300" />
              <p className="text-right text-lg font-semibold text-gray-900">
                Cart Total: {formatPrice(total)}
              </p>
            </div>

            {/* Custom Amount for Testing */}
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                    {currency}
                  </span>
                </div>
              )}
            </div>

            {/* Stored Credentials */}
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <label className="flex items-center gap-2 mb-3 text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendStoredCredentials}
                  onChange={(e) => setSendStoredCredentials(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                🔐 Send Stored Credentials (CARD only)
              </label>
              {sendStoredCredentials && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <select
                      value={storedCredentialsReason}
                      onChange={(e) => setStoredCredentialsReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="CARD_ON_FILE">CARD_ON_FILE</option>
                      <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                      <option value="UNSCHEDULED_CARD_ON_FILE">UNSCHEDULED_CARD_ON_FILE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usage</label>
                    <select
                      value={storedCredentialsUsage}
                      onChange={(e) => setStoredCredentialsUsage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="FIRST">FIRST</option>
                      <option value="USED">USED</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Payer Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4">👤 Payer Information</h2>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={useGuestCheckout}
                  onChange={(e) => setUseGuestCheckout(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                🚀 Guest Checkout (no customer creation)
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                {useGuestCheckout
                  ? "Customer info will be sent directly in the payment request"
                  : "A customer will be created in Yuno before the payment"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField name="first_name" placeholder="First Name" value={customerData.first_name || ''} onChange={handleChange} />
              <InputField name="last_name" placeholder="Last Name" value={customerData.last_name || ''} onChange={handleChange} />
              <SelectField
                name="country"
                placeholder="Select Country"
                value={customerData.country || ''}
                onChange={handleChange}
                options={countries.map(country => ({ value: country.isoCode, label: country.name }))}
              />
              <InputField name="email" type="email" placeholder="Email" value={customerData.email || ''} onChange={handleChange} />
              <SelectField
                name="document_type"
                placeholder="Document Type"
                value={customerData.document?.document_type || ''}
                onChange={(e) => handleNestedChange(e, "document")}
                options={getDocumentTypes(customerData.country || '').map(docType => ({ value: docType, label: docType }))}
              />
              <InputField name="document_number" placeholder="Document Number" value={customerData.document?.document_number || ''} onChange={(e) => handleNestedChange(e, "document")} />
              <InputField name="number" type="tel" placeholder="Phone Number" value={customerData.phone?.number || ''} onChange={(e) => handleNestedChange(e, "phone")} />
            </div>
          </section>

          {/* Shipping Address */}
          <section>
            <h2 className="text-2xl font-bold mb-4">📦 Shipping Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField name="address_line_1" placeholder="Address" value={customerData.shipping_address?.address_line_1 || ''} onChange={(e) => handleNestedChange(e, "shipping_address")} />
              <InputField name="city" placeholder="City" value={customerData.shipping_address?.city || ''} onChange={(e) => handleNestedChange(e, "shipping_address")} />
              <SelectField
                name="country"
                placeholder="Select Country"
                value={customerData.shipping_address?.country || ''}
                onChange={(e) => handleNestedChange(e, "shipping_address")}
                options={countries.map(country => ({ value: country.isoCode, label: country.name }))}
              />
            </div>
          </section>

          {/* Billing Address */}
          <section>
            <h2 className="text-2xl font-bold mb-4">🧾 Billing Address</h2>
            <label className="flex items-center gap-2 mb-4 text-gray-700">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => {
                  setSameAsShipping(e.target.checked);
                  e.target.checked ? handleCopyAddress() : handleDeleteAddress();
                }}
              />
              Use the same as shipping address
            </label>

            {!sameAsShipping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField name="address_line_1" placeholder="Address" value={customerData.billing_address?.address_line_1 || ''} onChange={(e) => handleNestedChange(e, "billing_address")} />
                <InputField name="city" placeholder="City" value={customerData.billing_address?.city || ''} onChange={(e) => handleNestedChange(e, "billing_address")} />
                <SelectField
                  name="country"
                  placeholder="Select Country"
                  value={customerData.billing_address?.country || ''}
                  onChange={(e) => handleNestedChange(e, "billing_address")}
                  options={countries.map(country => ({ value: country.isoCode, label: country.name }))}
                />
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className={`px-6 py-2 rounded-full transition text-white ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isLoading ? "Preparing…" : "Confirm Information"}
              </button>
              <button
                type="button"
                onClick={clearCachedCustomerId}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm transition"
                title="Clear cached customer data to force update"
              >
                🔄 Clear Cache
              </button>
            </div>
          </section>
        </>
      )}

      {/* Payment Methods Selection */}
      {showPaymentMethods && (
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">💳 Choose Your Payment Method</h2>
            <p className="text-gray-600">
              CARD opens the Secure Fields form · other methods open SDK Lite — both on the same session
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method, index) => {
              const isVaulted = method.vaulted_token;
              const isCard = method.type === "CARD";
              return (
                <div
                  key={getPaymentMethodId(method) + index}
                  onClick={() => handlePaymentMethodSelect(method)}
                  className={`
                    relative border-2 rounded-xl p-5 cursor-pointer transition-all duration-200
                    hover:shadow-md hover:-translate-y-0.5 group border-gray-200 bg-white hover:border-blue-300
                    ${isVaulted ? 'ring-2 ring-green-200 ring-opacity-50' : ''}
                  `}
                >
                  {/* Integration badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isCard ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {isCard ? '🔒 Secure Fields' : '🎯 SDK Lite'}
                    </span>
                  </div>

                  {isVaulted && (
                    <div className="absolute top-10 right-3">
                      <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Saved</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-3 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors duration-200">
                      <img src={method.icon} alt={method.name} className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold truncate text-gray-900">{method.name}</h3>
                        {method.preferred && !isVaulted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ⭐ Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-2 line-clamp-2 text-gray-600">{method.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowPaymentMethods(false)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to information
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
