"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { usePayments } from "../context/PaymentContext";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import { useRouter } from "next/navigation";
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries, getDocumentTypes } from "../data/countries";

/**
 * Secure Fields checkout.
 *
 * Unlike the Full/Lite variants (where Yuno renders the whole card form), here the
 * MERCHANT owns the card form. Yuno only provides secure, PCI-compliant iframe inputs
 * for card number / expiration / CVV via `yuno.secureFields()`.
 *
 * Custom error handling: every field is created with `showError: false` (so Yuno's
 * built-in inline messages are suppressed) and an `onChange: ({ error }) => ...`
 * callback that drives our own React state. We render whatever message we want from
 * the editable ERROR_MESSAGES dictionary below.
 *
 * Docs: https://docs.y.uno/docs/sdks/customization/secure-fields/payment-secure-fields
 */

type SecureFieldName = "pan" | "expiration" | "cvv";
type Lang = "en" | "es" | "pt";

// ── Fully editable custom error messages ──────────────────────────────────────
// Change these freely — they are OUR messages, not Yuno's.
const ERROR_MESSAGES: Record<Lang, Record<SecureFieldName | "cardHolderName" | "token", string>> = {
  en: {
    pan: "Please enter a valid card number",
    expiration: "Check the card expiry date (MM / YY)",
    cvv: "Invalid security code (CVV)",
    cardHolderName: "Please enter the cardholder name",
    token: "We couldn't process your card. Please review the details and try again.",
  },
  es: {
    pan: "Ingresa un número de tarjeta válido",
    expiration: "Revisa la fecha de expiración (MM / AA)",
    cvv: "Código de seguridad (CVV) inválido",
    cardHolderName: "Ingresa el nombre del titular de la tarjeta",
    token: "No pudimos procesar tu tarjeta. Revisa los datos e inténtalo de nuevo.",
  },
  pt: {
    pan: "Insira um número de cartão válido",
    expiration: "Verifique a data de validade (MM / AA)",
    cvv: "Código de segurança (CVV) inválido",
    cardHolderName: "Insira o nome do titular do cartão",
    token: "Não foi possível processar seu cartão. Revise os dados e tente novamente.",
  },
};

// Map our language selector to the SDK's language codes.
const SDK_LANGUAGE: Record<Lang, string> = { en: "en", es: "es", pt: "pt-BR" };

export default function CheckoutFormSecureFields() {
  const { cartItems, total } = useCart();
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const { addPayment } = usePayments();
  const { currency, formatPrice, setCountry, country: currencyCountry, convertPrice } = useCurrency();
  const { customerData, updateCustomerField, updateNestedField, updateCountryData, clearCachedCustomerId } = useCustomer();
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [useGuestCheckout, setUseGuestCheckout] = useState(false);
  const [sendStoredCredentials, setSendStoredCredentials] = useState(false);
  const [storedCredentialsReason, setStoredCredentialsReason] = useState("CARD_ON_FILE");
  const [storedCredentialsUsage, setStoredCredentialsUsage] = useState("FIRST");

  // ── Secure Fields specific state ────────────────────────────────────────────
  const [lang, setLang] = useState<Lang>("en");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardHolderTouched, setCardHolderTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<SecureFieldName, boolean>>({
    pan: false,
    expiration: false,
    cvv: false,
  });
  const [touched, setTouched] = useState<Record<SecureFieldName, boolean>>({
    pan: false,
    expiration: false,
    cvv: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldsMounted, setFieldsMounted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cvvHidden, setCvvHidden] = useState(false);
  const secureFieldsRef = useRef<any>(null);
  const cvvFieldRef = useRef<any>(null);

  const router = useRouter();

  // Base CSS injected into every secure-field iframe. Yuno's default styles render
  // the placeholder transparent (floating-label animation), so we force it visible
  // and set a readable input color/size to match our own inputs.
  const BASE_FIELD_STYLES = `
    input {
      color: #111827 !important;
      font-size: 16px !important;
    }
    input::placeholder {
      color: #9ca3af !important;
      opacity: 1 !important;
    }
  `;

  // CSS injected into the CVV iframe to mask/unmask the value.
  // The eye toggle turns the CVV into ••• (masked) when hidden.
  const cvvMaskStyles = (hidden: boolean) =>
    `${BASE_FIELD_STYLES}
     input {
       -webkit-text-security: ${hidden ? "disc" : "none"} !important;
       text-security: ${hidden ? "disc" : "none"} !important;
     }`;

  const toggleCvvHidden = () => {
    const next = !cvvHidden;
    setCvvHidden(next);
    // Live-update the already-rendered secure CVV field.
    cvvFieldRef.current?.updateProps?.({ styles: cvvMaskStyles(next) });
  };

  // Calculate the final amount to use (custom or cart total)
  const finalAmount = useCustomAmount && customAmount ? parseFloat(customAmount) : total;
  const messages = ERROR_MESSAGES[lang];

  // Sync customer data when currency context country changes (e.g., from navbar)
  useEffect(() => {
    if (currencyCountry && currencyCountry !== customerData.country) {
      updateCountryData(currencyCountry);
    }
  }, [currencyCountry, customerData.country, updateCountryData]);

  // ── Payer-info handlers (reused from CheckoutFormFull) ───────────────────────
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

  // ── Confirm Information → create customer + checkout session, then mount fields
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setShowPaymentSection(true);
    setFormError(null);
    try {
      let customerId = null;

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
      const convertedTotal = Math.round((useCustomAmount ? finalAmount : convertPrice(finalAmount, "USD")) * 100) / 100;
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
      localStorage.setItem("yuno_checkout_session", checkout.checkout_session);
      console.log("Yuno answer checkout:", checkout);

      // Now build the merchant-owned card form with Secure Fields.
      await mountSecureFields(checkout.checkout_session);
    } catch (error) {
      console.error("Error sending data:", error);
      setFormError(messages.token);
    }
  };

  // ── Build & render the three secure fields ──────────────────────────────────
  const mountSecureFields = async (checkoutSession: string) => {
    if (!yunoInstance) {
      console.warn("Yuno SDK not initialized yet");
      return;
    }

    const setFieldError = (name: SecureFieldName, error: boolean) =>
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    const setFieldTouched = (name: SecureFieldName) =>
      setTouched((prev) => ({ ...prev, [name]: true }));

    // `secureFields` returns the controller used to create/render fields + generate token.
    // NOTE: on SDK v1.1+ (we load v1.5) this call is async and MUST be awaited.
    const secureFields = await (yunoInstance as any).secureFields({
      countryCode: customerData.country || "",
      checkoutSession,
      language: SDK_LANGUAGE[lang],
      installmentEnable: false,
    });
    secureFieldsRef.current = secureFields;

    const secureNumber = secureFields.create({
      name: "pan",
      options: {
        placeholder: "0000 0000 0000 0000",
        // In this SDK the `label` is what renders inside the field (floating label
        // acting as the placeholder); the `placeholder` option alone paints nothing.
        label: "0000 0000 0000 0000",
        styles: BASE_FIELD_STYLES,
        showError: false, // ← suppress Yuno's default message; we render our own
        validationType: "on_blur_full",
        onChange: ({ error }: { error: boolean }) => setFieldError("pan", error),
        onBlur: () => setFieldTouched("pan"),
      },
    });
    secureNumber.render("#sf-pan");

    const secureExpiration = secureFields.create({
      name: "expiration",
      options: {
        placeholder: "MM / YY",
        label: "MM / YY",
        styles: BASE_FIELD_STYLES,
        showError: false,
        onChange: ({ error }: { error: boolean }) => setFieldError("expiration", error),
        onBlur: () => setFieldTouched("expiration"),
      },
    });
    secureExpiration.render("#sf-expiration");

    const secureCvv = secureFields.create({
      name: "cvv",
      options: {
        placeholder: "CVV",
        label: "CVV",
        showError: false,
        styles: cvvMaskStyles(cvvHidden),
        onChange: ({ error }: { error: boolean }) => setFieldError("cvv", error),
        onBlur: () => setFieldTouched("cvv"),
      },
    });
    cvvFieldRef.current = secureCvv;
    secureCvv.render("#sf-cvv");

    setFieldsMounted(true);
  };

  // ── Pay: generate one-time token from the secure fields, then create payment ──
  const handlePay = async (e: any) => {
    e.preventDefault();
    setFormError(null);
    setCardHolderTouched(true);
    // Mark all fields touched so any lingering errors surface.
    setTouched({ pan: true, expiration: true, cvv: true });

    const hasFieldError = Object.values(fieldErrors).some(Boolean);
    if (hasFieldError || !cardHolderName.trim()) {
      setFormError(messages.token);
      return;
    }

    const secureFields = secureFieldsRef.current;
    if (!secureFields) {
      setFormError(messages.token);
      return;
    }

    setIsPaying(true);
    try {
      const checkoutSessionId = localStorage.getItem("yuno_checkout_session") ?? "";
      const oneTimeToken = await secureFields.generateToken({
        checkoutSession: checkoutSessionId,
        cardHolderName: cardHolderName.trim(),
        saveCard: false,
      });
      console.log("One-time token:", oneTimeToken);

      const customerId = localStorage.getItem("yuno_customer_id");
      const convertedTotal = Math.round((useCustomAmount ? finalAmount : convertPrice(total, "USD")) * 100) / 100;

      const paymentBody: any = {
        oneTimeToken,
        checkoutSessionId,
        total: convertedTotal,
        currency,
        country: customerData.country || "",
        merchant_customer_created_at: customerData.merchant_customer_created_at,
        isGuestCheckout: useGuestCheckout,
        paymentMethodType: "CARD",
        ...(sendStoredCredentials && {
          storedCredentials: {
            reason: storedCredentialsReason,
            usage: storedCredentialsUsage,
          },
        }),
      };

      if (useGuestCheckout) {
        paymentBody.customerPayerInfo = {
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          email: customerData.email,
          document: customerData.document,
          phone: customerData.phone,
          billing_address: customerData.billing_address,
          shipping_address: customerData.shipping_address,
        };
      } else {
        paymentBody.customerId = customerId;
      }

      const paymentResponse = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentBody),
      });
      const payment = await paymentResponse.json();
      console.log("Yuno answer payment:", payment);

      addPayment({
        payment_id: payment.id,
        status: payment.sub_status,
        amount: payment.amount?.value,
        currency: payment.amount?.currency || currency,
        created_at: payment.created_at,
      });

      const responseAction = await (yunoInstance as any)?.continuePayment?.({ showPaymentStatus: true });
      console.log("Response action:", responseAction);

      if (payment.status === "SUCCEEDED" || payment.sub_status === "SUCCEEDED") {
        router.push("/payment-result?status=success");
      }
    } catch (error) {
      console.error("Error generating token / creating payment:", error);
      setFormError(messages.token);
    } finally {
      setIsPaying(false);
    }
  };

  // ── SDK bootstrap (same pattern as the other checkout components) ────────────
  useEffect(() => {
    const waitForYunoSDK = (): Promise<typeof Yuno> =>
      new Promise((resolve) => {
        if (typeof Yuno !== "undefined") return resolve(Yuno);
        const interval = setInterval(() => {
          if (typeof Yuno !== "undefined") {
            clearInterval(interval);
            resolve(Yuno);
          }
        }, 100);
      });

    const initializeYuno = async () => {
      const sdk = await waitForYunoSDK();
      const instance = await sdk.initialize(process.env.NEXT_PUBLIC_API_KEY!);
      setYunoInstance(instance);
      if (instance) console.log("Yuno SDK initialized!");
    };

    initializeYuno();
  }, []);

  return (
    <form className="space-y-10 max-w-4xl mx-auto px-4 py-6 bg-white rounded-xl shadow-md">
      {/* Cart Summary */}
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
      </section>

      {/* Language selector — drives BOTH our error messages and the SDK field language */}
      <section>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">🌐 Error message language</label>
          <p className="text-sm text-gray-500 mb-3">
            Custom messages below come from your own ERROR_MESSAGES dictionary — not Yuno.
          </p>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="pt">Português</option>
          </select>
        </div>
      </section>

      {/* Stored Credentials */}
      <section>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <label className="flex items-center gap-2 mb-3 text-gray-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={sendStoredCredentials}
              onChange={(e) => setSendStoredCredentials(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            🔐 Send Stored Credentials
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

        <div className="flex gap-4 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition"
          >
            Confirm Information
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

      {/* ── Secure Fields card form (merchant-owned) ──────────────────────────── */}
      <section className={`${showPaymentSection ? "block" : "hidden"}`}>
        <h2 className="text-2xl font-bold mb-1">💳 Card Details</h2>
        <p className="text-sm text-gray-500 mb-4">
          Card inputs are secure Yuno iframes; the layout and error messages are 100% yours.
        </p>

        <div className="space-y-5 max-w-lg">
          {/* Cardholder name — a plain input, not a secure field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
            <input
              type="text"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              onBlur={() => setCardHolderTouched(true)}
              placeholder="Name as it appears on the card"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {cardHolderTouched && !cardHolderName.trim() && (
              <p className="mt-1 text-sm text-red-600 font-medium">⚠️ {messages.cardHolderName}</p>
            )}
          </div>

          {/* Card number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
            <div id="sf-pan" className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg bg-white" />
            {touched.pan && fieldErrors.pan && (
              <p className="mt-1 text-sm text-red-600 font-medium">⚠️ {messages.pan}</p>
            )}
          </div>

          {/* Expiration + CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
              <div id="sf-expiration" className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg bg-white" />
              {touched.expiration && fieldErrors.expiration && (
                <p className="mt-1 text-sm text-red-600 font-medium">⚠️ {messages.expiration}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
              <div className="relative">
                <div id="sf-cvv" className="w-full min-h-[44px] px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white" />
                <button
                  type="button"
                  onClick={toggleCvvHidden}
                  aria-label={cvvHidden ? "Show CVV" : "Hide CVV"}
                  title={cvvHidden ? "Show CVV" : "Hide CVV"}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {cvvHidden ? (
                    // eye-slash (currently masked → click to show)
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    // eye (currently visible → click to hide)
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {touched.cvv && fieldErrors.cvv && (
                <p className="mt-1 text-sm text-red-600 font-medium">⚠️ {messages.cvv}</p>
              )}
            </div>
          </div>

          {/* Form-level error banner */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
              {formError}
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={!fieldsMounted || isPaying}
            className={`w-full px-10 py-3 rounded-full mt-2 transition font-semibold text-white ${
              !fieldsMounted || isPaying
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isPaying ? "Processing…" : "Pay Now"}
          </button>
        </div>
      </section>
    </form>
  );
}
