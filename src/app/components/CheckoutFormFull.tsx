"use client";

import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { usePayments } from "../context/PaymentContext";
import { loadScript } from '@yuno-payments/sdk-web';
import { Yuno, YunoInstance } from '@yuno-payments/sdk-web-types';
import { useRouter } from "next/navigation";
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries } from "../data/countries";

export default function CheckoutFormFull() {
  const { cartItems, total } = useCart();
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
  const { addPayment } = usePayments();
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    merchant_customer_id: "shopccl_customertest_001",
    first_name: "Carlos",
    last_name: "Medina",
    email: "carlos.medina@yuno.com",
    country: "",
    gender: "M",
    date_of_birth: "2000-12-14",
    nationality: "CO",
    document: {
      document_type: "CC",
      document_number: "1234567891",
    },
    phone: {
      number: "3112221111",
      country_code: "57",
    },
    billing_address: {
      address_line_1: "",
      address_line_2: "",
      country: "",
      state: "Cundinamarca",
      city: "",
      zip_code: "11111",
    },
    shipping_address: {
      address_line_1: "Cra 1 No 1 1",
      address_line_2: "",
      country: "",
      state: "Cundinamarca",
      city: "Bogotá",
      zip_code: "11111",
    },
  });

  const [sameAsShipping, setSameAsShipping] = useState(false);

  const handleCopyAddress = () => {
    setFormData((prev) => ({
      ...prev,
      billing_address: { ...prev.shipping_address },
    }));
  };

  const handleDeleteAddress = () => {
    setFormData((prev) => ({
      ...prev,
      billing_address: {
        address_line_1: "",
        address_line_2: "",
        country: "",
        state: "Cundinamarca",
        city: "",
        zip_code: "11111",
      },
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNestedChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    section: "document" | "phone" | "billing_address" | "shipping_address"
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
      // Auto-sync the main country field when shipping address country changes
      ...(section === "shipping_address" && name === "country" && { country: value }),
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setShowPaymentSection(true);
    try {
      // Create the customer
      const customerResponse = await fetch("/api/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const customer = await customerResponse.json();
      localStorage.setItem("yuno_customer_id", customer.id);
      console.log("Yuno answer customer:", customer);

      // Create the checkout session
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.id,
          amount: total,
          country: customer.country
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
      countryCode: formData.country,
      language: 'en',
      showLoading: true,
      issuersFormEnable: true,
      showPaymentStatus: true,
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
          const paymentResponse = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oneTimeToken, checkoutSessionId, customerId, total }),
          });

          const payment = await paymentResponse.json();
          console.log("Yuno answer payment:", payment);
          const paymentData = {
            payment_id: payment.id,
            status: payment.sub_status,
            amount: payment.amount.value,
            currency: payment.amount.currency || "COP",
            created_at: payment.created_at,
          };
          addPayment(paymentData);
          if (payment.checkout.sdk_action_required) {
            const responseAction = await yunoInstance?.continuePayment({ showPaymentStatus: true });
            console.log("Response action:", responseAction);
            if (responseAction?.action === "REDIRECT_URL") {
              window.location.href = responseAction.action;
            } else {
              console.log("No redirect needed or unexpected format:", responseAction);
            }
          } else {
            console.log("No action needed.");
          }
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
        type: 'element',
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
    yunoInstance?.mountCheckout({
      paymentMethodType: "CARD"
    });
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
              <span>${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <hr className="my-3 border-gray-300" />
          <p className="text-right text-lg font-semibold text-gray-900">
            Total: ${total.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Payer Information */}
      <section>
        <h2 className="text-2xl font-bold mb-4">👤 Payer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleChange} />
          <InputField name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleChange} />
          <SelectField 
            name="country" 
            placeholder="Select Country" 
            value={formData.country} 
            onChange={handleChange}
            options={countries.map(country => ({ 
              value: country.isoCode, 
              label: country.name 
            }))}
          />
          <InputField name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} />
          <InputField name="document_type" placeholder="Document Type (CC, CE, PP)" value={formData.document.document_type} onChange={(e) => handleNestedChange(e, "document")} />
          <InputField name="document_number" placeholder="Document Number" value={formData.document.document_number} onChange={(e) => handleNestedChange(e, "document")} />
          <InputField name="number" type="tel" placeholder="Phone Number" value={formData.phone.number} onChange={(e) => handleNestedChange(e, "phone")} />
        </div>
      </section>

      {/* Shipping Address */}
      <section>
        <h2 className="text-2xl font-bold mb-4">📦 Shipping Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField name="address_line_1" placeholder="Address" value={formData.shipping_address.address_line_1} onChange={(e) => handleNestedChange(e, "shipping_address")} />
          <InputField name="city" placeholder="City" value={formData.shipping_address.city} onChange={(e) => handleNestedChange(e, "shipping_address")} />
          <SelectField 
            name="country" 
            placeholder="Select Country" 
            value={formData.shipping_address.country} 
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
            <InputField name="address_line_1" placeholder="Address" value={formData.billing_address.address_line_1} onChange={(e) => handleNestedChange(e, "billing_address")} />
            <InputField name="city" placeholder="City" value={formData.billing_address.city} onChange={(e) => handleNestedChange(e, "billing_address")} />
            <SelectField 
              name="country" 
              placeholder="Select Country" 
              value={formData.billing_address.country} 
              onChange={(e) => handleNestedChange(e, "billing_address")}
              options={countries.map(country => ({ 
                value: country.isoCode, 
                label: country.name 
              }))}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full mt-4 transition"
        >
          Confirm Information
        </button>
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