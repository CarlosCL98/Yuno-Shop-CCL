"use client";

import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
//import { usePayment } from "../context/PaymentContext";
import { loadScript } from '@yuno-payments/sdk-web';
import { Yuno, YunoInstance } from '@yuno-payments/sdk-web-types';

export default function CheckoutForm() {
  const { cartItems, total } = useCart();
  //const { customerId, checkoutSessionId, setCustomerId, setCheckoutSessionId } = usePayment();
  const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);

  const [formData, setFormData] = useState({
    merchant_customer_id: "shopccl_customertest_001",
    first_name: "",
    last_name: "",
    email: "",
    country: "CO",
    gender: "M",
    date_of_birth: "2000-12-14",
    nationality: "CO",
    document: {
      document_type: "",
      document_number: "",
    },
    phone: {
      number: "",
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
      address_line_1: "",
      address_line_2: "",
      country: "",
      state: "Cundinamarca",
      city: "",
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
    e: React.ChangeEvent<HTMLInputElement>,
    section: "document" | "phone" | "billing_address" | "shipping_address"
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
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
      /**
       * The complete list of country codes is available on https://docs.y.uno/docs/country-coverage-yuno-sdk
      */
      elementSelector: "#yuno-checkout",
      countryCode: "CO",
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
      yunoPaymentMethodSelected: () => {
        console.log('Payment method selected');
      },
      /**
       * Returns the payment result after continuePayment
       * @param {string} status - The payment status
       */
      yunoPaymentResult: (status) => {
        console.log('Payment result:', status);
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
          // Create the customer
          const customerId = localStorage.getItem("yuno_customer_id");
          const checkoutSessionId = localStorage.getItem("yuno_checkout_session");
          const paymentResponse = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oneTimeToken, checkoutSessionId, customerId, total }),
          });

          const payment = await paymentResponse.json();
          console.log("Yuno answer payment:", payment);
          
          yunoInstance.continuePayment({ showPaymentStatus: true })
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
      paymentMethodType: "CARD",
      vaultedToken: "VAULTED_TOKEN"
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


  return (
    <form className="space-y-8">

      {/* Cart Summary */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Purchase Summary</h2>
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between">
            <p>{item.name} x {item.quantity}</p>
            <p>${(item.price * item.quantity).toLocaleString()}</p>
          </div>
        ))}
        <hr className="my-2" />
        <p className="font-bold text-lg">Total: ${total.toLocaleString()}</p>
      </section>

      {/* Payer data */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Payer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="first_name"
            placeholder="Name"
            value={formData.first_name}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="last_name"
            placeholder="Lastname"
            value={formData.last_name}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="document_type"
            placeholder="Document Type (CC, CE, PP)"
            value={formData.document.document_type}
            onChange={(e) => handleNestedChange(e, "document")}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="document_number"
            placeholder="Document Number"
            value={formData.document.document_number}
            onChange={(e) => handleNestedChange(e, "document")}
            className="border p-2 rounded"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          />
          <input
            type="tel"
            name="number"
            placeholder="Phone"
            value={formData.phone.number}
            onChange={(e) => handleNestedChange(e, "phone")}
            className="border p-2 rounded"
            required
          />
        </div>
      </section>

      {/* Shipping Address */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Shipping Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="address_line_1"
            placeholder="Address"
            value={formData.shipping_address.address_line_1}
            onChange={(e) => handleNestedChange(e, "shipping_address")}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            value={formData.shipping_address.city}
            onChange={(e) => handleNestedChange(e, "shipping_address")}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="country"
            placeholder="Country"
            value={formData.shipping_address.country}
            onChange={(e) => handleNestedChange(e, "shipping_address")}
            className="border p-2 rounded"
            required
          />
        </div>
      </section>

      {/* Billing Address */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Billing Address</h2>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={sameAsShipping}
            onChange={(e) => {
              setSameAsShipping(e.target.checked);
              if (e.target.checked) handleCopyAddress();
              else handleDeleteAddress();
            }}
          />
          Use the same shipping address
        </label>

        {!sameAsShipping && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="address_line_1"
              placeholder="Address"
              value={formData.billing_address.address_line_1}
              onChange={(e) => handleNestedChange(e, "billing_address")}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={formData.billing_address.city}
              onChange={(e) => handleNestedChange(e, "billing_address")}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="country"
              placeholder="Country"
              value={formData.billing_address.country}
              onChange={(e) => handleNestedChange(e, "billing_address")}
              className="border p-2 rounded"
              required
            />
          </div>
        )}
        <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mt-3" onClick={handleSubmit}>
          Confirm Information
        </button>
      </section>

      {/* Payment Methods */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Payment Methods</h2>
        <div className="grid grid-flow-row justify-items-center">
          <div id="yuno-checkout" className="w-100"></div>
          <div id="form-element" className="w-100"></div>
          <div id="action-form-element" className="w-100"></div>
          <button id="button-pay" className="bg-blue-600 text-white px-10 py-2 rounded hover:bg-blue-700 mt-3" onClick={handleStartPayment}>Pay now</button>
        </div>
      </section>
    </form>
  );
}