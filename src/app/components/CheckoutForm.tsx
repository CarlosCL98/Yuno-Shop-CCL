"use client";

import { useCart } from "../context/CartContext";
import { useState } from "react";

export default function CheckoutForm() {
  const { cartItems, total } = useCart();

  const [payer, setPayer] = useState({
    name: "",
    idType: "",
    idNumber: "",
    email: "",
    phone: "",
  });

  const [delivery, setDelivery] = useState({
    address: "",
    city: "",
    country: "",
  });

  const [billing, setBilling] = useState({
    address: "",
    city: "",
    country: "",
  });

  const [sameAsDelivery, setSameAsDelivery] = useState(true);

  const handleCopyAddress = () => {
    if (sameAsDelivery) {
      setBilling({ ...delivery });
    }
  };

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
            placeholder="Full Name"
            value={payer.name}
            onChange={(e) => setPayer({ ...payer, name: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Document Type (CC, CE, PP)"
            value={payer.idType}
            onChange={(e) => setPayer({ ...payer, idType: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Document Number"
            value={payer.idNumber}
            onChange={(e) => setPayer({ ...payer, idNumber: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={payer.email}
            onChange={(e) => setPayer({ ...payer, email: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={payer.phone}
            onChange={(e) => setPayer({ ...payer, phone: e.target.value })}
            className="border p-2 rounded"
            required
          />
        </div>
      </section>

      {/* Billing Address */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Billing Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Address"
            value={delivery.address}
            onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="City"
            value={delivery.city}
            onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Country"
            value={delivery.country}
            onChange={(e) => setDelivery({ ...delivery, country: e.target.value })}
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
            checked={sameAsDelivery}
            onChange={(e) => {
              setSameAsDelivery(e.target.checked);
              if (e.target.checked) handleCopyAddress();
            }}
          />
          Use the same shipping address
        </label>

        {!sameAsDelivery && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Address"
              value={billing.address}
              onChange={(e) => setBilling({ ...billing, address: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="City"
              value={billing.city}
              onChange={(e) => setBilling({ ...billing, city: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Country"
              value={billing.country}
              onChange={(e) => setBilling({ ...billing, country: e.target.value })}
              className="border p-2 rounded"
              required
            />
          </div>
        )}
      </section>

      {/* Payment Methods */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Medio de pago</h2>
        <div className="flex flex-col gap-2">
          <label>
            <input type="radio" name="payment" value="card" className="mr-2" />
            Credit Card
          </label>
          <label>
            <input type="radio" name="payment" value="pse" className="mr-2" />
            PSE (Bank Transfer)
          </label>
          <label>
            <input type="radio" name="payment" value="cash" className="mr-2" />
            Cash (Efecty, OthersCash)
          </label>
        </div>
      </section>

      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
        Confirm and Pay
      </button>
    </form>
  );
}