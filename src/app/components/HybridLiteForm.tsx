"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import { usePayments } from "../context/PaymentContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Hybrid APM leg — SDK Lite.
 *
 * Slim version of CheckoutFormLite's payment section. The session was already created on
 * /checkout-hybrid; here we read it from localStorage and the selected method from the
 * query string, then startCheckout + mountCheckoutLite (or mountExternalButtons for
 * wallet-style methods) for that single method.
 */

const EXTERNAL_TYPES = ["GOOGLE_PAY", "APPLE_PAY", "PAYPAL"];

export default function HybridLiteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addPayment } = usePayments();
  const { currency } = useCurrency();
  const { customerData } = useCustomer();

  const methodType = searchParams.get("type") || "";
  const vaultedToken = searchParams.get("vaulted") || "";
  const methodName = searchParams.get("name") || methodType;
  const isExternal = EXTERNAL_TYPES.includes(methodType);

  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [formMounted, setFormMounted] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [displayCurrency, setDisplayCurrency] = useState<string>(currency);

  const mountedRef = useRef(false);
  const instanceRef = useRef<YunoInstance | null>(null);

  // ── Initialize the checkout session for the SDK (does not mount the form yet) ──
  const initCheckout = (instance: YunoInstance, session: string) => {
    instance.startCheckout({
      checkoutSession: session,
      countryCode: customerData.country || localStorage.getItem("yuno_checkout_country") || "",
      elementSelector: "#form-element",
      language: "es",
      showLoading: true,
      issuersFormEnable: true,
      showPaymentStatus: false,
      showPayButton: true,
      card: {
        isCreditCardProcessingOnly: false,
        type: "extends",
        styles: "",
        cardSaveEnable: true,
        texts: {},
      },
      onLoading: (args: any) => console.log(args),
      yunoPaymentMethodSelected: (e: any) => console.log("Payment method selected", e),
      yunoPaymentResult: (status: any) => {
        console.log("Payment result:", status);
        if (status === "SUCCEEDED") {
          router.push("/payment-result?status=success");
        }
      },
      yunoError: (message: any, data: any) => console.error("Payment error:", message, data),
      async yunoCreatePayment(oneTimeToken: any, tokenWithInformation: any) {
        console.log("Token with information:", tokenWithInformation);
        console.log("One time token:", oneTimeToken);

        try {
          const checkoutSessionId = localStorage.getItem("yuno_checkout_session");
          const options = JSON.parse(localStorage.getItem("yuno_hybrid_options") || "{}");
          const storedCurrency = localStorage.getItem("yuno_checkout_currency") || currency;
          const storedCountry = localStorage.getItem("yuno_checkout_country") || customerData.country || "";
          const storedAmount = Number(localStorage.getItem("yuno_checkout_amount") || 0);

          const paymentBody: any = {
            oneTimeToken,
            checkoutSessionId,
            total: storedAmount,
            currency: storedCurrency,
            country: storedCountry,
            merchant_customer_created_at: customerData.merchant_customer_created_at,
            isGuestCheckout: !!options.isGuestCheckout,
            paymentMethodType: methodType,
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

          const responseAction = await instance?.continuePayment({ showPaymentStatus: false });
          console.log("Response action:", responseAction);
        } catch (error) {
          console.error("Error creating payment:", error);
        }
      },
      renderMode: {
        type: "element",
        elementSelector: {
          apmForm: "#form-element",
          actionForm: "#action-form-element",
        },
      },
    });
  };

  // ── Mount the SDK Lite form for the selected method (no terms gate) ───────────
  const mountForm = (instance: YunoInstance) => {
    if (isExternal) {
      instance.mountExternalButtons([
        { paymentMethodType: methodType, elementSelector: "#external-pay-button" },
      ]);
    } else {
      instance.mountCheckoutLite({
        paymentMethodType: methodType,
        vaultedToken: vaultedToken || undefined,
      });
    }
    setFormMounted(true);
  };

  // ── SDK bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const session = localStorage.getItem("yuno_checkout_session");
    setAmount(Number(localStorage.getItem("yuno_checkout_amount") || 0));
    setDisplayCurrency(localStorage.getItem("yuno_checkout_currency") || currency);

    if (!session || !methodType) {
      setSessionMissing(true);
      return;
    }

    // Guard BEFORE initialize() so React Strict Mode's double-effect doesn't create
    // a second SDK instance (which would have no session and break mountCheckoutLite).
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
      console.log("Yuno SDK initialized — starting checkout for", methodType);
      initCheckout(instance, session);
      // Mount the form directly — no terms gate.
      mountForm(instance);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (sessionMissing) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md text-center space-y-4">
        <p className="text-gray-700">
          {methodType ? "No active checkout session found." : "No payment method selected."} Please start from the beginning.
        </p>
        <Link href="/checkout-hybrid" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition">
          ← Go to Hybrid Checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💳 Complete Your Payment</h2>
          <p className="text-gray-600">
            Paying with {methodName}
            {vaultedToken && <span className="text-green-600 ml-1">(Saved method)</span>}
          </p>
        </div>
        <Link href="/checkout-hybrid" className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Change Payment Method</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form Container */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px]">
            {/* Loading hint until the SDK mounts the form */}
            {!formMounted && (
              <div className="min-h-[160px] flex flex-col items-center justify-center text-gray-500 gap-3">
                <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading {methodName} form…</span>
              </div>
            )}

            {/* External payment button (Google Pay, Apple Pay, PayPal) */}
            {isExternal && (
              <div className={formMounted ? "mb-6" : "hidden"}>
                <div id="external-pay-button" className="min-h-[48px]"></div>
              </div>
            )}

            {/* SDK Lite form elements — always in DOM so the SDK can mount into them */}
            <div className={formMounted && !isExternal ? "" : "hidden"}>
              <div id="form-element"></div>
              <div id="action-form-element" className="mt-4"></div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="order-1 lg:order-2">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="flex justify-between py-3 border-t border-gray-300">
              <span className="text-base font-semibold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-blue-600">
                {displayCurrency} {amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-800">Secure Payment</p>
              <p className="text-xs text-blue-700">Your payment information is encrypted and secure.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
