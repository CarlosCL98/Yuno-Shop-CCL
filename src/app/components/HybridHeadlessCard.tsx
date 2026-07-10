"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import { usePayments } from "../context/PaymentContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TERMINAL_STATUSES = ["SUCCEEDED", "DECLINED", "REJECTED", "ERROR", "CANCELLED"];

/**
 * Hybrid CARD leg — Headless Web SDK.
 *
 * Unlike Secure Fields (Yuno-hosted iframes), the Headless SDK renders NO UI: the merchant owns
 * the raw card inputs entirely, and the SDK only tokenizes the entered card into a one-time token
 * (OTT) via apiClientPayment.generateToken(...). The payer form + session creation still live on
 * /checkout-hybrid-headless; here we read the already-created session from localStorage, build our
 * own card form, generate the token, then create the payment.
 *
 * Docs: https://docs.y.uno/docs/sdks/headless-web/payment
 */

// ── Card helpers (merchant-owned validation, mirrors CheckoutFormDirect) ────────
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

// American Express (starts with 34/37) uses a 4-digit CID; everyone else uses 3.
function isAmex(rawNumber: string): boolean {
  return /^3[47]/.test(rawNumber);
}

function expectedCvvLength(rawNumber: string): number {
  return isAmex(rawNumber) ? 4 : 3;
}

// Per-field validators — return an error string (or "" when valid).
function validateCardNumber(rawNumber: string): string {
  if (!rawNumber) return "Card number is required";
  if (!/^\d+$/.test(rawNumber)) return "Card number must contain digits only";
  if (rawNumber.length < 13 || rawNumber.length > 19) return "Card number length is invalid";
  if (!luhnCheck(rawNumber)) return "Invalid card number";
  return "";
}

function validateExpiry(month: string, year: string): string {
  if (!month || !year) return "Select expiration month and year";
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12) return "Invalid expiration month";
  // Expired if the card's last valid month is before the current month.
  const now = new Date();
  const lastValid = new Date(y, m, 0, 23, 59, 59); // last day of the expiry month
  if (lastValid < now) return "Card has expired";
  return "";
}

function validateCvv(code: string, rawNumber: string): string {
  const need = expectedCvvLength(rawNumber);
  if (!code) return "Security code is required";
  if (!/^\d+$/.test(code)) return "Security code must be digits only";
  if (code.length !== need) return `Security code must be ${need} digits`;
  return "";
}

function validateHolder(name: string): string {
  if (!name.trim()) return "Cardholder name is required";
  if (name.trim().length < 2) return "Enter the full cardholder name";
  return "";
}

export default function HybridHeadlessCard() {
  const { addPayment } = usePayments();
  const { currency } = useCurrency();
  const { customerData } = useCustomer();
  const router = useRouter();

  // Card fields (owned by us — no Yuno UI)
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [holderName, setHolderName] = useState("");
  const [cardType, setCardType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [cardError, setCardError] = useState<string | null>(null);

  // Per-field "touched" tracking so we only show an error once the user has interacted
  // with (or attempted to submit) a field.
  const [touched, setTouched] = useState({
    holderName: false,
    cardNumber: false,
    expiry: false,
    cvv: false,
  });
  const markTouched = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const [sdkReady, setSdkReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [displayCurrency, setDisplayCurrency] = useState<string>(currency);

  // 3DS challenge state
  const [threeDsUrl, setThreeDsUrl] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const apiClientRef = useRef<any>(null);
  const mountedRef = useRef(false);
  const pollingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const years = Array.from({ length: 11 }, (_, i) => String(currentYear + i));

  // Derived per-field validation errors (recomputed on every render).
  const rawNumber = cardNumber.replace(/\s/g, "");
  const errors = {
    holderName: validateHolder(holderName),
    cardNumber: validateCardNumber(rawNumber),
    expiry: validateExpiry(expMonth, expYear),
    cvv: validateCvv(securityCode, rawNumber),
  };
  const isFormValid = !errors.holderName && !errors.cardNumber && !errors.expiry && !errors.cvv;

  // ── SDK bootstrap: create the apiClientPayment client for the existing session ──
  useEffect(() => {
    const session = localStorage.getItem("yuno_checkout_session");
    setAmount(Number(localStorage.getItem("yuno_checkout_amount") || 0));
    setDisplayCurrency(localStorage.getItem("yuno_checkout_currency") || currency);
    if (!session) {
      setSessionMissing(true);
      return;
    }

    // Guard BEFORE initialize() so React Strict Mode's double-effect doesn't create
    // a second SDK instance / client.
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
      const countryCode =
        customerData.country || localStorage.getItem("yuno_checkout_country") || "";
      const apiClient = await instance.apiClientPayment({
        country_code: countryCode,
        checkout_session: session,
      });
      apiClientRef.current = apiClient;
      setSdkReady(true);
      console.log("Yuno Headless SDK ready — apiClientPayment created for session", session);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll the payment until it reaches a terminal status (used after 3DS) ──────
  // Headless does NOT fire an SDK callback with the final result; the docs direct you to
  // webhooks + the Retrieve Payment endpoint. We poll get-payment-status here.
  const pollPaymentStatus = useCallback(
    async (pId: string, singlePoll = false) => {
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
          if (res.ok) {
            const data = await res.json();
            const status = data.status || data.sub_status;
            if (TERMINAL_STATUSES.includes(status)) {
              pollingRef.current = false;
              addPayment({
                payment_id: data.id,
                status: data.sub_status || data.status,
                amount: data.amount?.value,
                currency: data.amount?.currency || displayCurrency,
                created_at: data.created_at,
              });
              if (status === "SUCCEEDED") {
                router.push("/payment-result?status=success");
              } else {
                setThreeDsUrl("");
                setIsPaying(false);
                setStatusMessage("");
                setCardError(`Payment ${status.toLowerCase()}. Please try another card.`);
              }
              return;
            }
          }
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.error("Poll error:", err);
        }

        if (!singlePoll) await new Promise((r) => setTimeout(r, 5000));
      }
    },
    [addPayment, displayCurrency, router]
  );

  // ── Detect 3DS challenge completion coming from the embedded iframe ───────────
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Yuno's 3DS iframe posts from an "sdk-3ds" origin with data.origin === "CHALLENGE".
      const from3ds = event.origin?.toLowerCase().includes("sdk-3ds");
      const isChallenge = event.data?.origin === "CHALLENGE";
      if ((from3ds || isChallenge) && paymentId) {
        console.log("3DS challenge completed — polling final status", event.data);
        setStatusMessage("Verifying your payment…");
        pollPaymentStatus(paymentId, true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [paymentId, pollPaymentStatus]);

  // Stop polling on unmount.
  useEffect(() => {
    return () => {
      pollingRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Pay: generateToken (OTT) then create payment ────────────────────────────
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);

    // Reveal every field's inline error and block submission if anything is invalid.
    if (!isFormValid) {
      setTouched({ holderName: true, cardNumber: true, expiry: true, cvv: true });
      setCardError("Please fix the highlighted fields before paying.");
      return;
    }

    const apiClient = apiClientRef.current;
    if (!apiClient) {
      setCardError("Payment client is not ready yet. Please wait a moment and try again.");
      return;
    }

    setIsPaying(true);
    try {
      const checkoutSessionId = localStorage.getItem("yuno_checkout_session") ?? "";
      const options = JSON.parse(localStorage.getItem("yuno_hybrid_options") || "{}");
      const storedCurrency = localStorage.getItem("yuno_checkout_currency") || currency;
      const storedCountry =
        localStorage.getItem("yuno_checkout_country") || customerData.country || "";
      const storedAmount = Number(localStorage.getItem("yuno_checkout_amount") || amount || 0);

      // Headless tokenization — the SDK never rendered any UI; we hand it the raw card.
      const tokenResult = await apiClient.generateToken({
        checkout_session: checkoutSessionId,
        payment_method: {
          type: "CARD",
          vaulted_token: null,
          card: {
            save: false,
            detail: {
              number: rawNumber,
              // Yuno expects 2-digit year in the token payload (e.g. 25), matching the docs example.
              expiration_month: parseInt(expMonth, 10),
              expiration_year: parseInt(expYear, 10) % 100,
              security_code: securityCode,
              holder_name: holderName.trim(),
              type: cardType,
            },
          },
        },
      });
      // generateToken may return the OTT string directly or an object wrapping it.
      const oneTimeToken =
        typeof tokenResult === "string" ? tokenResult : tokenResult?.token ?? tokenResult;
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

      if (!payment.id) {
        console.error("Create payment failed:", payment);
        setCardError(payment?.message || payment?.error || "We couldn't create the payment. Please try again.");
        setIsPaying(false);
        return;
      }

      setPaymentId(payment.id);

      // If the payment needs an SDK action (3DS), fetch the challenge URL from the Headless
      // client and embed it in an iframe. Headless does NOT auto-render it.
      if (payment.checkout?.sdk_action_required) {
        try {
          // getThreeDSecureChallenge takes the checkout session as a positional argument
          // and returns { url } (or null when no challenge is needed).
          const challenge = await apiClientRef.current?.getThreeDSecureChallenge(checkoutSessionId);
          console.log("3DS challenge:", challenge);
          const url = typeof challenge === "string" ? challenge : challenge?.url;
          if (typeof url === "string" && url) {
            setStatusMessage("Complete the 3D Secure verification below…");
            setThreeDsUrl(url);
            // Poll in the background as a fallback in case the iframe completion message
            // never arrives; keep the spinner state active while the challenge is shown.
            pollPaymentStatus(payment.id);
            return; // stay on the page; result handled by the message listener / poll
          }
          console.warn("sdk_action_required but no 3DS challenge URL returned; polling status.");
          setStatusMessage("Confirming your payment…");
          pollPaymentStatus(payment.id);
          return;
        } catch (contErr) {
          console.error("Error getting 3DS challenge:", contErr);
          // Fall back to polling on the created payment.
          setStatusMessage("Confirming your payment…");
          pollPaymentStatus(payment.id);
          return;
        }
      }

      // No action required — record the result immediately.
      addPayment({
        payment_id: payment.id,
        status: payment.sub_status,
        amount: payment.amount?.value,
        currency: payment.amount?.currency || storedCurrency,
        created_at: payment.created_at,
      });

      if (payment.status === "SUCCEEDED" || payment.sub_status === "SUCCEEDED") {
        router.push("/payment-result?status=success");
      } else {
        setCardError(`Payment ${(payment.sub_status || payment.status || "was not approved").toLowerCase()}. Please try another card.`);
        setIsPaying(false);
      }
      return;
    } catch (error) {
      console.error("Error generating token / creating payment:", error);
      setCardError("We couldn't process your card. Please review the details and try again.");
      setIsPaying(false);
    }
  };

  if (sessionMissing) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md text-center space-y-4">
        <p className="text-gray-700">No active checkout session found. Please start from the beginning.</p>
        <Link href="/checkout-hybrid-headless" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition">
          ← Go to Hybrid Headless Checkout
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
            100% merchant-owned card form — the Headless SDK renders no UI and only tokenizes the card.
          </p>
        </div>
        <Link href="/checkout-hybrid-headless" className="text-sm text-blue-600 hover:text-blue-800 underline">
          ← Change method
        </Link>
      </div>

      <form onSubmit={handlePay} className="space-y-5 max-w-lg">
        {/* Cardholder name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
          <input
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            onBlur={() => markTouched("holderName")}
            placeholder="Name as it appears on the card"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent uppercase ${
              touched.holderName && errors.holderName
                ? "border-red-400 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {touched.holderName && errors.holderName && (
            <p className="mt-1 text-sm text-red-600 font-medium">⚠️ {errors.holderName}</p>
          )}
        </div>

        {/* Card number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
          <input
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            onBlur={() => markTouched("cardNumber")}
            placeholder="4111 1111 1111 1111"
            maxLength={23}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-lg tracking-wider ${
              touched.cardNumber && errors.cardNumber
                ? "border-red-400 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {touched.cardNumber && errors.cardNumber && (
            <p className="mt-1 text-sm text-red-600 font-medium">⚠️ {errors.cardNumber}</p>
          )}
        </div>

        {/* Expiration + CVV */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={expMonth}
              onChange={(e) => setExpMonth(e.target.value)}
              onBlur={() => markTouched("expiry")}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                touched.expiry && errors.expiry
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
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
              onBlur={() => markTouched("expiry")}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                touched.expiry && errors.expiry
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            >
              <option value="">YYYY</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
            <input
              type="text"
              inputMode="numeric"
              value={securityCode}
              onChange={(e) =>
                setSecurityCode(e.target.value.replace(/\D/g, "").slice(0, expectedCvvLength(rawNumber)))
              }
              onBlur={() => markTouched("cvv")}
              placeholder={isAmex(rawNumber) ? "1234" : "123"}
              maxLength={expectedCvvLength(rawNumber)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                touched.cvv && errors.cvv
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
          </div>
        </div>

        {/* Expiry + CVV inline errors (span the whole row) */}
        {(touched.expiry && errors.expiry) && (
          <p className="-mt-3 text-sm text-red-600 font-medium">⚠️ {errors.expiry}</p>
        )}
        {(touched.cvv && errors.cvv) && (
          <p className="-mt-3 text-sm text-red-600 font-medium">⚠️ {errors.cvv}</p>
        )}

        {/* Card type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value as "CREDIT" | "DEBIT")}
            className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="CREDIT">CREDIT</option>
            <option value="DEBIT">DEBIT</option>
          </select>
        </div>

        {cardError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
            {cardError}
          </div>
        )}

        {statusMessage && !cardError && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {statusMessage}
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-t border-gray-200">
          <span className="text-base font-semibold text-gray-900">Total:</span>
          <span className="text-lg font-bold text-blue-600">{displayCurrency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <button
          type="submit"
          disabled={!sdkReady || isPaying}
          className={`w-full px-10 py-3 rounded-full mt-2 transition font-semibold text-white ${
            !sdkReady || isPaying ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isPaying ? "Processing…" : sdkReady ? "Pay Now" : "Loading…"}
        </button>
      </form>

      {/* 3DS challenge — the Headless SDK does not render this; we embed the challenge URL
          ourselves and listen for the completion message (see the message-event useEffect). */}
      {threeDsUrl && (
        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-gray-100 border-b font-semibold text-gray-700">
            3D Secure Verification
          </div>
          <iframe
            src={`${threeDsUrl}${threeDsUrl.includes("?") ? "&" : "?"}embedded=true`}
            width="100%"
            height="600"
            sandbox="allow-forms allow-scripts allow-same-origin"
            className="border-0"
          />
          <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
            Complete the verification above — this page updates automatically when you finish.
          </div>
        </div>
      )}
    </div>
  );
}
