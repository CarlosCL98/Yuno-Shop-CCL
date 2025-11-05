"use client";

import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { usePayments } from "../context/PaymentContext";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";
import { loadScript } from '@yuno-payments/sdk-web';
import { Yuno, YunoInstance } from '@yuno-payments/sdk-web-types';
import { useRouter } from "next/navigation";
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries, getDocumentTypes } from "../data/countries";
import { PaymentMethod } from "../models/definitions";

type FlowStep = 'customer_info' | 'payment_selection' | 'payment_form';

export default function CheckoutFormSeamless() {
  const { cartItems, total } = useCart();
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const { addPayment } = usePayments();
  const { currency, formatPrice, setCountry, country: currencyCountry, convertPrice } = useCurrency();
  const { customerData, updateCustomerField, updateNestedField, updateCountryData, clearCachedCustomerId } = useCustomer();
  
  const [currentStep, setCurrentStep] = useState<FlowStep>('customer_info');
  const [enrolledPaymentMethods, setEnrolledPaymentMethods] = useState<PaymentMethod[]>([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [checkoutSession, setCheckoutSession] = useState<string>("");
  
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const router = useRouter();

  // Calculate the final amount to use (custom or cart total)
  const finalAmount = useCustomAmount && customAmount ? parseFloat(customAmount) : total;

  // Sync customer data when currency context country changes
  useEffect(() => {
    if (currencyCountry && currencyCountry !== customerData.country) {
      updateCountryData(currencyCountry);
    }
  }, [currencyCountry, customerData.country, updateCountryData]);

  // Initialize Yuno SDK
  useEffect(() => {
    const initializeYuno = async () => {
      const yuno = (await loadScript()) as Yuno;
      const yunoInstance = await yuno.initialize(process.env.NEXT_PUBLIC_API_KEY!) as YunoInstance;
      setYunoInstance(yunoInstance);
      if (yunoInstance) console.log("Yuno SDK initialized!");
    };
    initializeYuno();
  }, []);

  // Auto-fetch customer and payment methods if customer ID exists
  useEffect(() => {
    const cachedCustomerId = localStorage.getItem("yuno_customer_id");
    if (cachedCustomerId && currentStep === 'customer_info') {
      handleAutoLoadCustomer(cachedCustomerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoLoadCustomer = async (existingCustomerId: string) => {
    try {
      setIsLoadingMethods(true);
      setCustomerId(existingCustomerId);
      
      // Fetch enrolled payment methods
      const enrolledResponse = await fetch("/api/get-enrolled-payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: existingCustomerId }),
      });
      
      if (enrolledResponse.ok) {
        const enrolledData = await enrolledResponse.json();
        if (enrolledData.items && enrolledData.items.length > 0) {
          setEnrolledPaymentMethods(enrolledData.items);
          console.log("Enrolled payment methods:", enrolledData.items);
        }
      }

      // Create checkout session
      await createCheckoutSession(existingCustomerId);
      
      // Move to payment selection
      setCurrentStep('payment_selection');
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const createCheckoutSession = async (customerId: string) => {
    const convertedTotal = useCustomAmount ? finalAmount : convertPrice(finalAmount, "USD");
    const response = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        amount: convertedTotal,
        country: customerData.country,
        currency: currency
      })
    });

    const checkout = await response.json();
    setCheckoutSession(checkout.checkout_session);
    localStorage.setItem("yuno_checkout_session", checkout.checkout_session);
    console.log("Checkout session created:", checkout.checkout_session);

    // Fetch available payment methods
    const paymentMethodsResponse = await fetch("/api/get-payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutSession: checkout.checkout_session })
    });

    const paymentMethodsData = await paymentMethodsResponse.json();
    setAvailablePaymentMethods(paymentMethodsData);
    console.log("Available payment methods:", paymentMethodsData);
  };

  const handleCopyAddress = () => {
    updateNestedField('billing_address', 'address_line_1', customerData.shipping_address?.address_line_1 || '');
    updateNestedField('billing_address', 'address_line_2', customerData.shipping_address?.address_line_2 || '');
    updateNestedField('billing_address', 'country', customerData.shipping_address?.country || '');
    updateNestedField('billing_address', 'state', customerData.shipping_address?.state || '');
    updateNestedField('billing_address', 'city', customerData.shipping_address?.city || '');
    updateNestedField('billing_address', 'zip_code', customerData.shipping_address?.zip_code || '');
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
    setIsLoadingMethods(true);

    try {
      // Create or update customer
      const customerResponse = await fetch("/api/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      const customer = await customerResponse.json();
      setCustomerId(customer.id);
      localStorage.setItem("yuno_customer_id", customer.id);
      console.log("Customer created/updated:", customer.id);

      // Try to fetch enrolled payment methods
      const enrolledResponse = await fetch("/api/get-enrolled-payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.id }),
      });
      
      if (enrolledResponse.ok) {
        const enrolledData = await enrolledResponse.json();
        if (enrolledData.items && enrolledData.items.length > 0) {
          setEnrolledPaymentMethods(enrolledData.items);
        }
      }

      // Create checkout session and fetch available methods
      await createCheckoutSession(customer.id);

      // Move to payment selection
      setCurrentStep('payment_selection');
    } catch (error) {
      console.error("Error processing customer:", error);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handlePaymentMethodSelect = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    setCurrentStep('payment_form');
    
    // Start checkout with selected payment method
    setTimeout(() => handleStartCheckout(paymentMethod), 100);
  };

  const handleStartCheckout = (paymentMethod: PaymentMethod) => {
    if (!yunoInstance || !checkoutSession) return;

    yunoInstance.startCheckout({
      checkoutSession: checkoutSession,
      countryCode: customerData.country || '',
      elementSelector: "#yuno-form-element",
      language: 'en',
      showLoading: true,
      issuersFormEnable: true,
      showPaymentStatus: true,
      card: {
        isCreditCardProcessingOnly: true,
        type: "extends",
        cardSaveEnable: true,
      },
      onLoading: (args) => console.log(args),
      yunoPaymentMethodSelected: (e) => console.log('Payment method selected', e),
      yunoPaymentResult: (status) => {
        console.log('Payment result:', status);
        if (status === "SUCCEEDED") {
          router.push("/payment-result?status=success");
        }
      },
      yunoError: (message, data) => {
        console.error('Payment error:', message, data);
      },
      async yunoCreatePayment(oneTimeToken) {
        try {
          const convertedTotal = useCustomAmount ? finalAmount : convertPrice(total, "USD");
          const paymentResponse = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              oneTimeToken, 
              checkoutSessionId: checkoutSession, 
              customerId, 
              total: convertedTotal, 
              currency, 
              country: customerData.country
            }),
          });

          const payment = await paymentResponse.json();
          console.log("Payment created:", payment);
          
          const paymentData = {
            payment_id: payment.id,
            status: payment.sub_status,
            amount: payment.amount.value,
            currency: payment.amount.currency || currency,
            created_at: payment.created_at,
          };
          addPayment(paymentData);
          
          await yunoInstance?.continuePayment({ showPaymentStatus: true });
        } catch (error) {
          console.error("Error creating payment:", error);
        }
      },
      renderMode: {
        type: 'element',
        elementSelector: {
          apmForm: "#yuno-form-element",
          actionForm: "#yuno-action-element"
        }
      },
    });

    // Mount checkout lite with payment method
    if (paymentMethod.vaulted_token) {
      yunoInstance.mountCheckoutLite({
        paymentMethodType: paymentMethod.type,
        vaultedToken: paymentMethod.vaulted_token,
      });
    } else {
      yunoInstance.mountCheckoutLite({
        paymentMethodType: paymentMethod.type,
      });
    }
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        {(['customer_info', 'payment_selection', 'payment_form'] as FlowStep[]).map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = (['customer_info', 'payment_selection', 'payment_form'] as FlowStep[]).indexOf(currentStep) > index;
          
          return (
            <div key={step} className="flex items-center space-x-2">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full font-semibold
                ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}
              `}>
                {isCompleted ? '✓' : index + 1}
              </div>
              {index < 2 && (
                <div className={`w-16 h-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
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
      {currentStep === 'customer_info' && (
        <form onSubmit={handleCustomerSubmit} className="space-y-8">
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
                Total: {formatPrice(total)}
              </p>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <InputField name="first_name" placeholder="First Name" value={customerData.first_name || ''} onChange={handleChange} required />
              <InputField name="last_name" placeholder="Last Name" value={customerData.last_name || ''} onChange={handleChange} required />
              <SelectField 
                name="country" 
                placeholder="Select Country" 
                value={customerData.country || ''} 
                onChange={handleChange}
                options={countries.map(country => ({ value: country.isoCode, label: country.name }))}
                required
              />
              <InputField name="email" type="email" placeholder="Email" value={customerData.email || ''} onChange={handleChange} required />
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
                type="submit"
                disabled={isLoadingMethods}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full transition disabled:bg-gray-400"
              >
                {isLoadingMethods ? 'Loading...' : 'Continue to Payment'}
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

      {/* Step 2: Payment Method Selection */}
      {currentStep === 'payment_selection' && (
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center">💳 Choose Your Payment Method</h2>
          
          {/* Enrolled Payment Methods */}
          {enrolledPaymentMethods.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-green-700 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Your Saved Payment Methods
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledPaymentMethods.map((method, index) => (
                  <div
                    key={index}
                    onClick={() => handlePaymentMethodSelect(method)}
                    className="border-2 border-green-300 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all bg-green-50 hover:bg-green-100"
                  >
                    <div className="flex items-center space-x-4">
                      <img src={method.icon} alt={method.name} className="w-12 h-12 object-contain" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{method.name}</h4>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <span className="text-xs text-green-600 font-medium">✓ One-click payment</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Payment Methods */}
          {availablePaymentMethods.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                {enrolledPaymentMethods.length > 0 ? 'Or Pay with a New Method' : 'Available Payment Methods'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePaymentMethods
                  .filter(method => !method.vaulted_token)
                  .map((method, index) => (
                    <div
                      key={index}
                      onClick={() => handlePaymentMethodSelect(method)}
                      className="border-2 border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all bg-white"
                    >
                      <div className="flex items-center space-x-4">
                        <img src={method.icon} alt={method.name} className="w-10 h-10 object-contain" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{method.name}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{method.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setCurrentStep('customer_info')}
            className="mt-6 text-blue-600 hover:text-blue-800 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Customer Info</span>
          </button>
        </section>
      )}

      {/* Step 3: Payment Form */}
      {currentStep === 'payment_form' && selectedPaymentMethod && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Payment</h2>
              <p className="text-gray-600">
                Paying with {selectedPaymentMethod.name}
                {selectedPaymentMethod.vaulted_token && <span className="text-green-600 ml-1">✓ Saved method</span>}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPaymentMethod(null);
                setCurrentStep('payment_selection');
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Change Method</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div id="yuno-form-element" className="min-h-[200px]"></div>
                <div id="yuno-action-element" className="mt-4"></div>
              </div>
            </div>

            <div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200 sticky top-6">
                <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Amount:</span>
                    <span className="font-semibold">{formatPrice(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-blue-300">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-blue-600">{formatPrice(finalAmount)}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600">🔒 Your payment is secure and encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

