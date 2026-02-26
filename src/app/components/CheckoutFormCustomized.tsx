"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useCustomer } from "../context/CustomerContext";

// Default JSON templates
const getDefaultCustomerJson = (customerData: any) => ({
  merchant_customer_id: customerData.merchant_customer_id || "shopccl_customertest_001_co_date",
  merchant_customer_created_at: customerData.merchant_customer_created_at || "2026-02-03T14:50:58Z",
  first_name: customerData.first_name || "Test",
  last_name: customerData.last_name || "User",
  email: customerData.email || "test_user@testuser.com",
  country: customerData.country || "CO",
  gender: customerData.gender || "M",
  date_of_birth: customerData.date_of_birth || "2000-12-14",
  nationality: customerData.nationality || "CO",
  document: customerData.document || {
    document_type: "CC",
    document_number: "1234567890",
  },
  phone: customerData.phone || {
    number: "3991111111",
    country_code: "57",
  },
  billing_address: customerData.billing_address || {
    address_line_1: "Cra 15 No 93-50",
    country: "CO",
    state: "Cundinamarca",
    city: "Bogota",
    zip_code: "010101",
  },
  shipping_address: customerData.shipping_address || {
    address_line_1: "Cra 1 No 1 1",
    country: "CO",
    state: "Cundinamarca",
    city: "Bogota",
    zip_code: "010101",
  },
});

const getDefaultCheckoutJson = (customerId?: string) => ({
  merchant_order_id: `shopccl-custom-${Date.now()}`,
  payment_description: "Test Yuno Shop CCL - Customized",
  country: "CO",
  customer_id: customerId || null,
  amount: {
    currency: "COP",
    value: 10000,
  },
});

const getDefaultPaymentJson = (checkoutSession?: string, customerId?: string) => ({
  merchant_order_id: `shopccl-custom-pay-${Date.now()}`,
  description: "Customized payment test",
  country: "CO",
  amount: {
    currency: "COP",
    value: 10000,
  },
  checkout: {
    session: checkoutSession || "",
  },
  customer_payer: customerId ? { id: customerId } : {},
  payment_method: {
    token: "",
    vault_on_success: false,
  },
});

export default function CheckoutFormCustomized() {
  const { customerData } = useCustomer();

  // Step state
  const [activeStep, setActiveStep] = useState(1);
  const [skipCustomer, setSkipCustomer] = useState(false);

  // JSON editor state
  const [customerJson, setCustomerJson] = useState("");
  const [checkoutJson, setCheckoutJson] = useState("");
  const [paymentJson, setPaymentJson] = useState("");

  // Ref for paymentJson to avoid stale closures in SDK callback
  const paymentJsonRef = useRef(paymentJson);
  useEffect(() => {
    paymentJsonRef.current = paymentJson;
  }, [paymentJson]);

  // JSON validation errors
  const [customerJsonError, setCustomerJsonError] = useState<string | null>(null);
  const [checkoutJsonError, setCheckoutJsonError] = useState<string | null>(null);
  const [paymentJsonError, setPaymentJsonError] = useState<string | null>(null);

  // Response state
  const [customerResponse, setCustomerResponse] = useState<any>(null);
  const [checkoutResponse, setCheckoutResponse] = useState<any>(null);
  const [paymentResponse, setPaymentResponse] = useState<any>(null);

  // Response status codes
  const [customerStatus, setCustomerStatus] = useState<number | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<number | null>(null);

  // Loading state
  const [customerLoading, setCustomerLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // IDs extracted from responses
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<string | null>(null);

  // SDK state
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Promise resolver for pausing SDK flow
  const continuePaymentResolver = useRef<(() => void) | null>(null);

  // Initialize JSON editors with defaults
  useEffect(() => {
    setCustomerJson(JSON.stringify(getDefaultCustomerJson(customerData), null, 2));
    setCheckoutJson(JSON.stringify(getDefaultCheckoutJson(), null, 2));
    setPaymentJson(JSON.stringify(getDefaultPaymentJson(), null, 2));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Yuno SDK
  useEffect(() => {
    const initializeYuno = async () => {
      const instance = await Yuno.initialize(process.env.NEXT_PUBLIC_API_KEY!);
      setYunoInstance(instance);
      if (instance) console.log("Yuno SDK initialized for customized checkout!");
    };
    initializeYuno();
  }, []);

  // JSON validation helper
  const validateJson = (value: string): { valid: boolean; error: string | null } => {
    try {
      JSON.parse(value);
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  };

  // JSON editor change handlers
  const handleCustomerJsonChange = (value: string) => {
    setCustomerJson(value);
    const { error } = validateJson(value);
    setCustomerJsonError(error);
  };

  const handleCheckoutJsonChange = (value: string) => {
    setCheckoutJson(value);
    const { error } = validateJson(value);
    setCheckoutJsonError(error);
  };

  const handlePaymentJsonChange = (value: string) => {
    setPaymentJson(value);
    const { error } = validateJson(value);
    setPaymentJsonError(error);
  };

  // Format JSON helper
  const formatJson = (value: string, setter: (v: string) => void) => {
    try {
      const parsed = JSON.parse(value);
      setter(JSON.stringify(parsed, null, 2));
    } catch {
      // If invalid, leave as-is
    }
  };

  // Step 1: Send Customer
  const handleSendCustomer = async () => {
    if (customerJsonError) return;
    setCustomerLoading(true);
    setCustomerResponse(null);
    setCustomerStatus(null);

    try {
      const response = await fetch("/api/passthrough-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: customerJson,
      });

      const data = await response.json();
      setCustomerResponse(data);
      setCustomerStatus(response.status);
      console.log("Passthrough customer response:", data);

      // Extract customer_id and auto-inject into checkout JSON
      if (response.ok && data.id) {
        setCustomerId(data.id);
        try {
          const checkoutObj = JSON.parse(checkoutJson);
          checkoutObj.customer_id = data.id;
          setCheckoutJson(JSON.stringify(checkoutObj, null, 2));
        } catch {
          // ignore parse error
        }
        setActiveStep(2);
      }
    } catch (error) {
      setCustomerResponse({ error: "Network error", message: (error as Error).message });
      setCustomerStatus(0);
    } finally {
      setCustomerLoading(false);
    }
  };

  // Skip customer step
  const handleSkipCustomer = () => {
    setSkipCustomer(true);
    setActiveStep(2);
  };

  // Step 2: Send Checkout Session
  const handleSendCheckout = async () => {
    if (checkoutJsonError) return;
    setCheckoutLoading(true);
    setCheckoutResponse(null);
    setCheckoutStatus(null);

    try {
      const response = await fetch("/api/passthrough-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: checkoutJson,
      });

      const data = await response.json();
      setCheckoutResponse(data);
      setCheckoutStatus(response.status);
      console.log("Passthrough checkout response:", data);

      // Extract checkout_session and auto-inject into payment JSON
      if (response.ok && data.checkout_session) {
        setCheckoutSession(data.checkout_session);
        try {
          const paymentObj = JSON.parse(paymentJson);
          paymentObj.checkout = { ...paymentObj.checkout, session: data.checkout_session };
          if (customerId) {
            paymentObj.customer_payer = { id: customerId };
          }
          setPaymentJson(JSON.stringify(paymentObj, null, 2));
        } catch {
          // ignore parse error
        }
        setActiveStep(3);
      }
    } catch (error) {
      setCheckoutResponse({ error: "Network error", message: (error as Error).message });
      setCheckoutStatus(0);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Step 3: Mount SDK after checkout session is ready
  const mountSdk = useCallback(() => {
    if (!yunoInstance || !checkoutSession) return;

    setSdkReady(false);

    yunoInstance.startCheckout({
      checkoutSession: checkoutSession,
      elementSelector: "#yuno-checkout-customized",
      countryCode: "CO",
      language: "en",
      showLoading: true,
      issuersFormEnable: true,
      showPaymentStatus: true,
      card: {
        isCreditCardProcessingOnly: false,
        type: "extends",
        cardSaveEnable: false,
      },
      onLoading: (args: any) => {
        console.log("SDK loading:", args);
      },
      yunoPaymentMethodSelected: (e: any) => {
        console.log("Payment method selected:", e);
      },
      yunoPaymentResult: (status: any) => {
        console.log("Payment result:", status);
      },
      yunoError: (message: any, data: any) => {
        console.error("SDK error:", message, data);
      },
      async yunoCreatePayment(oneTimeToken: any, tokenWithInformation: any) {
        console.log("oneTimeToken:", oneTimeToken);
        console.log("tokenWithInformation:", tokenWithInformation);

        // Inject oneTimeToken into payment JSON
        try {
          const paymentObj = JSON.parse(paymentJsonRef.current);
          paymentObj.payment_method = {
            ...paymentObj.payment_method,
            token: oneTimeToken,
          };
          setPaymentJson(JSON.stringify(paymentObj, null, 2));
        } catch {
          // ignore
        }

        setActiveStep(4);

        // Pause here - wait for user to review/edit and click Send Payment
        await new Promise<void>((resolve) => {
          continuePaymentResolver.current = resolve;
        });

        // After user sends payment, continuePayment is called
        await yunoInstance?.continuePayment({ showPaymentStatus: true });
      },
      renderMode: {
        type: "element",
        elementSelector: {
          apmForm: "#form-element-customized",
          actionForm: "#action-form-customized",
        },
      },
    });

    yunoInstance.mountCheckout();
    setSdkReady(true);
  }, [yunoInstance, checkoutSession]);

  // Auto-mount SDK when step 3 becomes active and checkout session exists
  useEffect(() => {
    if (activeStep >= 3 && checkoutSession && yunoInstance) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => mountSdk(), 200);
      return () => clearTimeout(timer);
    }
  }, [activeStep, checkoutSession, yunoInstance, mountSdk]);

  // Step 4: Send Payment
  const handleSendPayment = async () => {
    if (paymentJsonError) return;
    setPaymentLoading(true);
    setPaymentResponse(null);
    setPaymentStatus(null);

    try {
      const response = await fetch("/api/passthrough-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: paymentJson,
      });

      const data = await response.json();
      setPaymentResponse(data);
      setPaymentStatus(response.status);
      console.log("Passthrough payment response:", data);

      // Resolve the promise so SDK can call continuePayment
      if (continuePaymentResolver.current) {
        continuePaymentResolver.current();
        continuePaymentResolver.current = null;
      }
    } catch (error) {
      setPaymentResponse({ error: "Network error", message: (error as Error).message });
      setPaymentStatus(0);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Helper: step styling
  const getStepClass = (step: number) => {
    if (step <= activeStep) return "opacity-100";
    return "opacity-40 pointer-events-none";
  };

  const getStepHeaderClass = (step: number) => {
    if (step < activeStep) return "bg-green-100 border-green-300 text-green-800";
    if (step === activeStep) return "bg-blue-100 border-blue-300 text-blue-800";
    return "bg-gray-100 border-gray-300 text-gray-500";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      {/* Step 1: Create Customer */}
      <section className={`bg-white rounded-xl shadow-md overflow-hidden ${getStepClass(1)}`}>
        <div className={`px-6 py-3 border-b-2 flex items-center justify-between ${getStepHeaderClass(1)}`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-current bg-opacity-20 font-bold text-sm">
              {activeStep > 1 ? "✓" : "1"}
            </span>
            <h2 className="text-lg font-bold">Create Customer</h2>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={skipCustomer}
              onChange={(e) => {
                if (e.target.checked) handleSkipCustomer();
                else {
                  setSkipCustomer(false);
                  setActiveStep(1);
                }
              }}
              className="w-4 h-4"
            />
            Skip (guest checkout)
          </label>
        </div>
        {!skipCustomer && (
          <div className="p-6 space-y-4">
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => formatJson(customerJson, setCustomerJson)}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
              >
                Format JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultJson = JSON.stringify(getDefaultCustomerJson(customerData), null, 2);
                  setCustomerJson(defaultJson);
                  setCustomerJsonError(null);
                }}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
              >
                Reset Default
              </button>
            </div>
            <textarea
              value={customerJson}
              onChange={(e) => handleCustomerJsonChange(e.target.value)}
              className={`w-full h-64 font-mono text-sm p-4 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                customerJsonError
                  ? "border-red-300 focus:ring-red-300"
                  : "border-gray-200 focus:ring-blue-300"
              }`}
              spellCheck={false}
            />
            {customerJsonError && (
              <p className="text-red-500 text-sm">Invalid JSON: {customerJsonError}</p>
            )}
            <button
              type="button"
              onClick={handleSendCustomer}
              disabled={!!customerJsonError || customerLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              {customerLoading ? "Sending..." : "Send POST /v1/customers"}
            </button>
            {customerResponse && (
              <div className={`mt-4 rounded-lg border-2 ${customerStatus && customerStatus >= 200 && customerStatus < 300 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                <div className="px-4 py-2 border-b text-sm font-medium">
                  Response — HTTP {customerStatus}
                </div>
                <pre className="p-4 text-sm font-mono overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(customerResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Create Checkout Session */}
      <section className={`bg-white rounded-xl shadow-md overflow-hidden ${getStepClass(2)}`}>
        <div className={`px-6 py-3 border-b-2 flex items-center gap-3 ${getStepHeaderClass(2)}`}>
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-current bg-opacity-20 font-bold text-sm">
            {activeStep > 2 ? "✓" : "2"}
          </span>
          <h2 className="text-lg font-bold">Create Checkout Session</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => formatJson(checkoutJson, setCheckoutJson)}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
            >
              Format JSON
            </button>
            <button
              type="button"
              onClick={() => {
                const defaultJson = JSON.stringify(getDefaultCheckoutJson(customerId || undefined), null, 2);
                setCheckoutJson(defaultJson);
                setCheckoutJsonError(null);
              }}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
            >
              Reset Default
            </button>
          </div>
          <textarea
            value={checkoutJson}
            onChange={(e) => handleCheckoutJsonChange(e.target.value)}
            className={`w-full h-52 font-mono text-sm p-4 border-2 rounded-lg focus:outline-none focus:ring-2 ${
              checkoutJsonError
                ? "border-red-300 focus:ring-red-300"
                : "border-gray-200 focus:ring-blue-300"
            }`}
            spellCheck={false}
          />
          {checkoutJsonError && (
            <p className="text-red-500 text-sm">Invalid JSON: {checkoutJsonError}</p>
          )}
          <button
            type="button"
            onClick={handleSendCheckout}
            disabled={!!checkoutJsonError || checkoutLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            {checkoutLoading ? "Sending..." : "Send POST /v1/checkout/sessions"}
          </button>
          {checkoutResponse && (
            <div className={`mt-4 rounded-lg border-2 ${checkoutStatus && checkoutStatus >= 200 && checkoutStatus < 300 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <div className="px-4 py-2 border-b text-sm font-medium">
                Response — HTTP {checkoutStatus}
              </div>
              <pre className="p-4 text-sm font-mono overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(checkoutResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* Step 3: SDK Payment Form */}
      <section className={`bg-white rounded-xl shadow-md overflow-hidden ${getStepClass(3)}`}>
        <div className={`px-6 py-3 border-b-2 flex items-center gap-3 ${getStepHeaderClass(3)}`}>
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-current bg-opacity-20 font-bold text-sm">
            {activeStep > 3 ? "✓" : "3"}
          </span>
          <h2 className="text-lg font-bold">SDK Payment Form</h2>
        </div>
        <div className="p-6 space-y-4">
          {activeStep >= 3 && checkoutSession ? (
            <>
              <p className="text-sm text-gray-600">
                Checkout session: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{checkoutSession}</code>
              </p>
              <div id="yuno-checkout-customized" className="w-full min-h-[100px]" />
              <div id="form-element-customized" className="w-full" />
              <div id="action-form-customized" className="w-full" />
              {!sdkReady && (
                <p className="text-sm text-gray-500">Mounting SDK payment form...</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Complete step 2 to mount the SDK payment form.</p>
          )}
        </div>
      </section>

      {/* Step 4: Create Payment */}
      <section className={`bg-white rounded-xl shadow-md overflow-hidden ${getStepClass(4)}`}>
        <div className={`px-6 py-3 border-b-2 flex items-center gap-3 ${getStepHeaderClass(4)}`}>
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-current bg-opacity-20 font-bold text-sm">
            4
          </span>
          <h2 className="text-lg font-bold">Create Payment</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            The <code className="bg-gray-100 px-1 rounded">oneTimeToken</code> is auto-injected when you submit card details in the SDK form above. Review and edit the payment body before sending.
          </p>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => formatJson(paymentJson, setPaymentJson)}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
            >
              Format JSON
            </button>
            <button
              type="button"
              onClick={() => {
                const defaultJson = JSON.stringify(
                  getDefaultPaymentJson(checkoutSession || undefined, customerId || undefined),
                  null,
                  2
                );
                setPaymentJson(defaultJson);
                setPaymentJsonError(null);
              }}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
            >
              Reset Default
            </button>
          </div>
          <textarea
            value={paymentJson}
            onChange={(e) => handlePaymentJsonChange(e.target.value)}
            className={`w-full h-64 font-mono text-sm p-4 border-2 rounded-lg focus:outline-none focus:ring-2 ${
              paymentJsonError
                ? "border-red-300 focus:ring-red-300"
                : "border-gray-200 focus:ring-blue-300"
            }`}
            spellCheck={false}
          />
          {paymentJsonError && (
            <p className="text-red-500 text-sm">Invalid JSON: {paymentJsonError}</p>
          )}
          <button
            type="button"
            onClick={handleSendPayment}
            disabled={!!paymentJsonError || paymentLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            {paymentLoading ? "Sending..." : "Send POST /v1/payments"}
          </button>
          {paymentResponse && (
            <div className={`mt-4 rounded-lg border-2 ${paymentStatus && paymentStatus >= 200 && paymentStatus < 300 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <div className="px-4 py-2 border-b text-sm font-medium">
                Response — HTTP {paymentStatus}
              </div>
              <pre className="p-4 text-sm font-mono overflow-auto max-h-80 whitespace-pre-wrap">
                {JSON.stringify(paymentResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
