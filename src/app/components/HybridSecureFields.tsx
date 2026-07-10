"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import { usePayments } from "../context/PaymentContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Hybrid CARD leg — Secure Fields.
 *
 * Slim version of CheckoutFormSecureFields: the payer form and session creation live on
 * /checkout-hybrid. Here we read the already-created checkout session from localStorage,
 * mount the three secure iframes as soon as the SDK is ready, then generateToken → pay.
 *
 * Docs: https://docs.y.uno/docs/sdks/customization/secure-fields/payment-secure-fields
 */

type SecureFieldName = "pan" | "expiration" | "cvv";
type Lang = "en" | "es" | "pt";

// Fully editable custom error messages — OUR messages, not Yuno's.
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

const SDK_LANGUAGE: Record<Lang, string> = { en: "en", es: "es", pt: "pt-BR" };

export default function HybridSecureFields() {
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const { addPayment } = usePayments();
  const { currency } = useCurrency();
  const { customerData } = useCustomer();
  const router = useRouter();

  const [lang, setLang] = useState<Lang>("en");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardHolderTouched, setCardHolderTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<SecureFieldName, boolean>>({ pan: false, expiration: false, cvv: false });
  const [touched, setTouched] = useState<Record<SecureFieldName, boolean>>({ pan: false, expiration: false, cvv: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldsMounted, setFieldsMounted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cvvHidden, setCvvHidden] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [displayCurrency, setDisplayCurrency] = useState<string>(currency);

  const secureFieldsRef = useRef<any>(null);
  const cvvFieldRef = useRef<any>(null);
  const mountedRef = useRef(false);
  const instanceRef = useRef<YunoInstance | null>(null);

  const messages = ERROR_MESSAGES[lang];

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

  const cvvMaskStyles = (hidden: boolean) =>
    `${BASE_FIELD_STYLES}
     input {
       -webkit-text-security: ${hidden ? "disc" : "none"} !important;
       text-security: ${hidden ? "disc" : "none"} !important;
     }`;

  const toggleCvvHidden = () => {
    const next = !cvvHidden;
    setCvvHidden(next);
    cvvFieldRef.current?.updateProps?.({ styles: cvvMaskStyles(next) });
  };

  // ── Build & render the three secure fields ──────────────────────────────────
  const mountSecureFields = async (instance: YunoInstance, checkoutSession: string) => {
    const setFieldError = (name: SecureFieldName, error: boolean) =>
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    const setFieldTouched = (name: SecureFieldName) =>
      setTouched((prev) => ({ ...prev, [name]: true }));

    const secureFields = await (instance as any).secureFields({
      countryCode: customerData.country || localStorage.getItem("yuno_checkout_country") || "",
      checkoutSession,
      language: SDK_LANGUAGE[lang],
      installmentEnable: false,
    });
    secureFieldsRef.current = secureFields;

    const secureNumber = secureFields.create({
      name: "pan",
      options: {
        placeholder: "0000 0000 0000 0000",
        label: "0000 0000 0000 0000",
        styles: BASE_FIELD_STYLES,
        showError: false,
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

  // ── Pay: generate token then create payment ─────────────────────────────────
  const handlePay = async (e: any) => {
    e.preventDefault();
    setFormError(null);
    setCardHolderTouched(true);
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
      const options = JSON.parse(localStorage.getItem("yuno_hybrid_options") || "{}");
      const storedCurrency = localStorage.getItem("yuno_checkout_currency") || currency;
      const storedCountry = localStorage.getItem("yuno_checkout_country") || customerData.country || "";
      const storedAmount = Number(localStorage.getItem("yuno_checkout_amount") || amount || 0);

      const oneTimeToken = await secureFields.generateToken({
        checkoutSession: checkoutSessionId,
        cardHolderName: cardHolderName.trim(),
        saveCard: false,
      });
      console.log("One-time token:", oneTimeToken);

      const paymentBody: any = {
        oneTimeToken,
        checkoutSessionId,
        total: storedAmount,
        currency: storedCurrency,
        country: storedCountry,
        merchant_customer_created_at: customerData.merchant_customer_created_at,
        isGuestCheckout: !!options.isGuestCheckout,
        paymentMethodType: "CARD",
        ...(options.sendStoredCredentials && {
          storedCredentials: {
            reason: options.storedCredentialsReason,
            usage: options.storedCredentialsUsage,
          },
        }),
      };

      if (options.isGuestCheckout) {
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
        paymentBody.customerId = localStorage.getItem("yuno_customer_id");
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
        currency: payment.amount?.currency || storedCurrency,
        created_at: payment.created_at,
      });

      const responseAction = await (instanceRef.current as any)?.continuePayment?.({ showPaymentStatus: true });
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

  // ── SDK bootstrap + auto-mount secure fields for the existing session ────────
  useEffect(() => {
    const session = localStorage.getItem("yuno_checkout_session");
    setAmount(Number(localStorage.getItem("yuno_checkout_amount") || 0));
    setDisplayCurrency(localStorage.getItem("yuno_checkout_currency") || currency);
    if (!session) {
      setSessionMissing(true);
      return;
    }

    // Guard BEFORE initialize() so React Strict Mode's double-effect doesn't create
    // a second SDK instance and mount the secure fields twice.
    if (mountedRef.current) return;
    mountedRef.current = true;

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

    const init = async () => {
      const sdk = await waitForYunoSDK();
      const instance = await sdk.initialize(process.env.NEXT_PUBLIC_API_KEY!);
      if (!instance) return;
      instanceRef.current = instance;
      setYunoInstance(instance);
      console.log("Yuno SDK initialized — mounting secure fields for session", session);
      await mountSecureFields(instance, session);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (sessionMissing) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md text-center space-y-4">
        <p className="text-gray-700">No active checkout session found. Please start from the beginning.</p>
        <Link href="/checkout-hybrid" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition">
          ← Go to Hybrid Checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-white rounded-xl shadow-md space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">💳 Card Details</h2>
          <p className="text-sm text-gray-500">
            Card inputs are secure Yuno iframes; layout and error messages are 100% yours.
          </p>
        </div>
        <Link href="/checkout-hybrid" className="text-sm text-blue-600 hover:text-blue-800 underline">
          ← Change method
        </Link>
      </div>

      {/* Language selector */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-1">🌐 Error message language</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="pt">Português</option>
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Note: changing the language re-labels our messages. The mounted fields keep the language
          selected when the form loaded.
        </p>
      </div>

      <div className="space-y-5 max-w-lg">
        {/* Cardholder name */}
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
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

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
            {formError}
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-t border-gray-200">
          <span className="text-base font-semibold text-gray-900">Total:</span>
          <span className="text-lg font-bold text-blue-600">{displayCurrency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <button
          type="button"
          onClick={handlePay}
          disabled={!fieldsMounted || isPaying}
          className={`w-full px-10 py-3 rounded-full mt-2 transition font-semibold text-white ${
            !fieldsMounted || isPaying ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isPaying ? "Processing…" : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
