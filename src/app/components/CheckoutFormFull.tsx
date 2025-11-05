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
import { Country } from "../models/definitions";

export default function CheckoutFormFull() {
  const { cartItems, total } = useCart();
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const { addPayment } = usePayments();
  const { currency, formatPrice, setCountry, country: currencyCountry, convertPrice } = useCurrency();
  const { customerData, updateCustomerField, updateNestedField, updateCountryData, clearCachedCustomerId } = useCustomer();
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const router = useRouter();

  // Calculate the final amount to use (custom or cart total)
  const finalAmount = useCustomAmount && customAmount ? parseFloat(customAmount) : total;

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
    setShowPaymentSection(true);
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
    } catch (error) {
      console.error("Error sending data:", error);
    }

    // Init the checkout
    yunoInstance?.startCheckout({
      checkoutSession: localStorage.getItem("yuno_checkout_session") ?? "",
      elementSelector: "#yuno-checkout",
      /**
       * The complete list of country codes is available on https://docs.y.uno/docs/country-coverage-yuno-sdk
      */
      countryCode: customerData.country || '',
      language: 'en',
      showLoading: true,
      issuersFormEnable: true,
      showPaymentStatus: true,
      showPayButton:true,
      /**
       * Set isCreditCardProcessingOnly as true to process all card transactions are credit
       * isCreditCardProcessingOnly: true | false | undefined
      */
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
          router.push("/payment-result?status=success");
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
      async yunoCreatePayment(oneTimeToken,tokenWithInformation) {
        console.log("Token with information:", tokenWithInformation);
        console.log("One time token:", oneTimeToken); 
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
              country: customerData.country || ''
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
          /*
          if (payment.checkout.sdk_action_required) {      
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
        /**
         * Type can be one of `modal` or `element`
         * By default the system uses 'modal'
         * It is optional
         */
        type: 'modal',
        /**
         * Element where the form will be rendered.
         * It is optional
         * Can be a string (deprecated) or an object with the following structure:
         * {
         *   apmForm: "#form-element",
         *   actionForm: "#action-form-element"
         * }
         */
        elementSelector: {
          apmForm: "#form-element",
          actionForm: "#action-form-element"
        }
      },
    });
    yunoInstance?.mountCheckout();
  };

  const handleStartPayment = (e: any) => {
    e.preventDefault()
    yunoInstance?.startPayment();
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

  // Handle Yuno Checkout Edit button to prevent page refresh
  useEffect(() => {
    const handleButtonClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const editButton = target.closest('[data-testid="edit-payment-method-button"]');
      
      if (editButton) {
        // Stop the event from bubbling and prevent default form submission
        event.preventDefault();
        console.log('Edit button clicked - prevented page refresh');
      }
    };

    // Listen for clicks on the document
    document.addEventListener('click', handleButtonClick, true);

    return () => {
      document.removeEventListener('click', handleButtonClick, true);
    };
  }, [yunoInstance]);

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
          {useCustomAmount && customAmount && (
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Test Amount: {currency} {parseFloat(customAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </section>

      {/* Payer Information */}
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
            options={countries.map(country => ({ 
              value: country.isoCode, 
              label: country.name 
            }))}
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

      {/* Payment Methods */}
      <section className={`${showPaymentSection ? "block" : "hidden"}`}>
        <h2 className="text-2xl font-bold mb-4">💳 Payment Method</h2>
        <div className="space-y-4">
          <div id="yuno-checkout" className="w-full" />
          <div id="form-element" className="w-full" />
          <div id="action-form-element" className="w-full" />
          <button
            id="button-pay"
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white px-10 py-2 rounded-full mt-2 transition"
            onClick={handleStartPayment}
          >
            Pay Now
          </button>
        </div>
      </section>
    </form>
  );

}