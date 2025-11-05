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
import { countries, getCountryData, getPhoneCountryCode, getDefaultDocumentType, getSampleDocumentNumber, getDefaultAddress, getDocumentTypes } from "../data/countries";
import { PaymentMethod } from "../models/definitions";

export default function CheckoutFormLite() {
  const { cartItems, total } = useCart();
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const { addPayment } = usePayments();
  const { currency, formatPrice, setCountry, country: currencyCountry, convertPrice } = useCurrency();
  const { customerData, updateCustomerField, updateNestedField, updateCountryData, clearCachedCustomerId } = useCustomer();
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [PAYMENT_METHOD_TYPE, setPAYMENT_METHOD_TYPE] = useState<string>("");
  const [VAULTED_TOKEN, setVAULTED_TOKEN] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const router = useRouter();

  // Calculate the final amount to use (custom or cart total)
  const finalAmount = useCustomAmount && customAmount ? parseFloat(customAmount) : total;

  const [sameAsShipping, setSameAsShipping] = useState(false);

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
    
    // Update currency and all country-related data when country changes
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
    
    // Update currency and all country-related data when country changes in any section
    if (name === "country") {
      setCountry(value);
      updateCountryData(value);
    } else {
      updateNestedField(section, name, value);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      // Create the customer
      const customerResponse = await fetch("/api/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      const customer = await customerResponse.json();
      localStorage.setItem("yuno_customer_id", customer.id);
      console.log("Yuno answer customer:", customer);

      // Create the checkout session
      // If using custom amount, it's already in the selected currency, so don't convert
      // If using cart total, convert from USD to selected currency
      const convertedTotal = useCustomAmount ? finalAmount : convertPrice(finalAmount, "USD");
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.id,
          amount: convertedTotal,
          country: customer.country,
          currency: currency
        })
      });

      const checkout = await response.json();
      localStorage.setItem("yuno_checkout_session", checkout.checkout_session);
      console.log("Yuno answer checkout:", checkout);

      // Fetch payment methods
      const paymentMethodsResponse = await fetch("/api/get-payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSession: checkout.checkout_session
        })
      });

      const paymentMethodsData = await paymentMethodsResponse.json();
      setPaymentMethods(paymentMethodsData);
      setShowPaymentMethods(true);
      console.log("Available payment methods:", paymentMethodsData);

    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  const handlePaymentMethodSelect = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    setPAYMENT_METHOD_TYPE(paymentMethod.type);
    setVAULTED_TOKEN(paymentMethod.vaulted_token || "");
    setShowPaymentSection(true);
    
    // Pass the payment method directly to avoid stale state
    handleStartCheckout(paymentMethod);
  };

  // Helper function to create unique identifier for payment methods
  const getPaymentMethodId = (method: PaymentMethod) => {
    return method.vaulted_token ? `${method.type}_${method.vaulted_token}` : `${method.type}_new`;
  };

  const getSelectedPaymentMethodId = () => {
    return selectedPaymentMethod ? getPaymentMethodId(selectedPaymentMethod) : null;
  };

  // Modified to accept paymentMethod parameter
  const handleStartCheckout = (paymentMethod?: PaymentMethod) => {
    // Use the passed payment method or fall back to state
    const currentPaymentMethod = paymentMethod || selectedPaymentMethod;
    
    if (!currentPaymentMethod) return;

    // First initialize the checkout session
    yunoInstance?.startCheckout({
      checkoutSession: localStorage.getItem("yuno_checkout_session") ?? "",
      countryCode: customerData.country || '',
      elementSelector: "#form-element",
      language: 'en',
      showLoading: true,
      issuersFormEnable: true,
      showPaymentStatus: true,
      card: {
        isCreditCardProcessingOnly: true,
        type: "extends",
        styles: '',
        cardSaveEnable: true,
        texts: {}
      },
      onLoading: (args) => {
        console.log(args);
      },
      /**
       * Notifies when a payment method is selected
       */
      yunoPaymentMethodSelected: (e) => {
        console.log('Payment method selected', e);
      },
      /**
       * Returns the payment result after continuePayment
       * @param {string} status - The payment status
       */
      yunoPaymentResult: (status) => {
        console.log('Payment result:', status);
        if (status === "SUCCEEDED") {
          router.push("/profile");
        }
      },
      /**
       * Executes when there are errors
       * @param {string} message - Error message
       * @param {any} data - Additional error data
       */
      yunoError: (message, data) => {
        console.error('Payment error:', message, data);
      },
      async yunoCreatePayment(oneTimeToken) {
        /**
        * The createPayment function calls the backend to create a payment in Yuno.
        * It uses the following endpoint https://docs.y.uno/reference/create-payment
        */
        try {
          // Create the payment
          const customerId = localStorage.getItem("yuno_customer_id");
          const checkoutSessionId = localStorage.getItem("yuno_checkout_session");
          // If using custom amount, it's already in the selected currency, so don't convert
          // If using cart total, convert from USD to selected currency
          const convertedTotal = useCustomAmount ? finalAmount : convertPrice(total, "USD");
          const paymentResponse = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              oneTimeToken, 
              checkoutSessionId, 
              customerId, 
              total: convertedTotal, 
              currency, 
              country: customerData.country
            }),
          });

          const payment = await paymentResponse.json();
          console.log("Yuno answer payment:", payment);
          const paymentData = {
            payment_id: payment.id,
            status: payment.sub_status,
            amount: payment.amount.value,
            currency: payment.amount.currency || currency,
            created_at: payment.created_at,
          };
          addPayment(paymentData);
          const responseAction = await yunoInstance?.continuePayment({ showPaymentStatus: true });
          console.log("Response action:", responseAction);
          /*if (payment.checkout.sdk_action_required) {
            const responseAction = await yunoInstance?.continuePayment({ showPaymentStatus: true });
            console.log("Response action:", responseAction);
            if (responseAction?.action === "REDIRECT_URL") {
              window.location.href = responseAction.action;
            } else {
              console.log("No redirect needed or unexpected format:", responseAction);
            }
          } else {
            console.log("No action needed.");
          }*/
        } catch (error) {
          console.error("Error sending data:", error);
        }
      },
      renderMode: {
        type: 'element',
        elementSelector: {
          apmForm: "#form-element",
          actionForm: "#action-form-element"
        }
      },
    });

    // Then mount the checkout lite form with the current payment method
    yunoInstance?.mountCheckoutLite({
      paymentMethodType: currentPaymentMethod.type,
      vaultedToken: currentPaymentMethod.vaulted_token || undefined,
    });
  };

  useEffect(() => {
    const initializeYuno = async () => {

      const yuno = (await loadScript()) as Yuno;
      const yunoInstance = await yuno.initialize(process.env.NEXT_PUBLIC_API_KEY!) as YunoInstance;
      setYunoInstance(yunoInstance);

      if (!yunoInstance) return;
      else console.log("Yuno SDK initialized!");
    };

    initializeYuno();
  }, []);


  return (
    <form className="space-y-10 max-w-4xl mx-auto px-4 py-6 bg-white rounded-xl shadow-md">
      {/* Cart Summary */}
      {!showPaymentMethods && (
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
            {useCustomAmount && customAmount && (
              <p className="mt-2 text-sm font-semibold text-blue-700">
                Test Amount: {currency} {parseFloat(customAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Payer Information */}
      {!showPaymentMethods && (
        <section>
          <h2 className="text-2xl font-bold mb-4">👤 Payer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField name="first_name" placeholder="First Name" value={customerData.first_name || ''} onChange={handleChange} />
            <InputField name="last_name" placeholder="Last Name" value={customerData.last_name || ''} onChange={handleChange} />
            <SelectField 
              name="country" 
              placeholder="Select Country" 
              value={customerData.country || ''} 
              onChange={handleChange}
              options={countries.map(country => ({ 
                value: country.isoCode, 
                label: country.name 
              }))}
            />
            <InputField name="email" type="email" placeholder="Email" value={customerData.email || ''} onChange={handleChange} />
            <SelectField 
              name="document_type" 
              placeholder="Document Type" 
              value={customerData.document?.document_type || ''} 
              onChange={(e) => handleNestedChange(e, "document")}
              options={getDocumentTypes(customerData.country || '').map(docType => ({ 
                value: docType, 
                label: docType 
              }))}
            />
            <InputField name="document_number" placeholder="Document Number" value={customerData.document?.document_number || ''} onChange={(e) => handleNestedChange(e, "document")} />
            <InputField name="number" type="tel" placeholder="Phone Number" value={customerData.phone?.number || ''} onChange={(e) => handleNestedChange(e, "phone")} />
          </div>
        </section>
      )}

      {/* Shipping Address */}
      {!showPaymentMethods && (
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
              options={countries.map(country => ({ 
                value: country.isoCode, 
                label: country.name 
              }))}
            />
          </div>
        </section>
      )}

      {/* Billing Address */}
      {!showPaymentMethods && (
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
                options={countries.map(country => ({ 
                  value: country.isoCode, 
                  label: country.name 
                }))}
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
      )}

      {/* Payment Methods Selection */}
      {showPaymentMethods && (
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">💳 Choose Your Payment Method</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method, index) => {
              const isSelected = getSelectedPaymentMethodId() === getPaymentMethodId(method);
              const isVaulted = method.vaulted_token;
              
              return (
                <div
                  key={index}
                  onClick={() => handlePaymentMethodSelect(method)}
                  className={`
                    relative border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 
                    hover:shadow-md hover:-translate-y-0.5 group
                    ${isSelected 
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                    }
                    ${isVaulted ? 'ring-2 ring-green-200 ring-opacity-50' : ''}
                  `}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Vaulted token indicator */}
                  {isVaulted && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Saved</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    {/* Payment method icon */}
                    <div className={`
                      flex-shrink-0 p-3 rounded-lg
                      ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-gray-100'}
                      transition-colors duration-200
                    `}>
                      <img
                        src={method.icon}
                        alt={method.name}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    
                    {/* Payment method details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`
                          font-semibold truncate
                          ${isSelected ? 'text-blue-900' : 'text-gray-900'}
                        `}>
                          {method.name}
                        </h3>
                        {method.preferred && !isVaulted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ⭐ Recommended
                          </span>
                        )}
                      </div>
                      
                      <p className={`
                        text-sm mb-2 line-clamp-2
                        ${isSelected ? 'text-blue-700' : 'text-gray-600'}
                      `}>
                        {method.description}
                      </p>
                      
                      {isVaulted && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium">One-click payment</span>
                        </div>
                      )}
                      
                      {!isVaulted && (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-0.257-0.257A6 6 0 1118 8zM2 8a6 6 0 1012 0A6 6 0 002 8z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs">Secure payment</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hover effect overlay */}
                  <div className={`
                    absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-200
                    ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-5 bg-blue-500'}
                  `} />
                </div>
              );
            })}
          </div>
          
        </section>
      )}

        {/* Payment Section */}
        {showPaymentSection && selectedPaymentMethod && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  💳 Complete Your Payment
                </h2>
                <p className="text-gray-600">
                  Paying with {selectedPaymentMethod.name}
                  {selectedPaymentMethod.vaulted_token && <span className="text-green-600 ml-1">(Saved method)</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentMethod(null);
                  setShowPaymentSection(false);
                  setPAYMENT_METHOD_TYPE("");
                  setVAULTED_TOKEN("");
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Change Payment Method</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Form Container */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div id="form-element" className="min-h-[200px]"></div>
                  <div id="action-form-element" className="mt-4"></div>
                </div>
              </div>
              
              {/* Enhanced Payment Summary */}
              <div className="order-1 lg:order-2">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 sticky top-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    Payment Summary
                  </h3>
                  
                  <div className="space-y-3">
                    
                    <div className="flex justify-between py-3 border-t border-gray-300">
                      <span className="text-base font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-blue-600">{formatPrice(finalAmount)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-blue-800">Secure Payment</p>
                        <p className="text-xs text-blue-700">Your payment information is encrypted and secure.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
    </form>
  );
}