"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type PaymentContextType = {
  customerId: string | null;
  checkoutSessionId: string | null;
  setCustomerId: (id: string) => void;
  setCheckoutSessionId: (id: string) => void;
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [customerId, setCustomerIdState] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionIdState] = useState<string | null>(null);

  // Leer del localStorage al montar
  useEffect(() => {
    const storedCustomerId = localStorage.getItem("yuno_customer_id");
    const storedSessionId = localStorage.getItem("yuno_checkout_session");

    if (storedCustomerId) setCustomerIdState(storedCustomerId);
    if (storedSessionId) setCheckoutSessionIdState(storedSessionId);
  }, []);

  // Actualizar localStorage cuando cambia
  const setCustomerId = (id: string) => {
    setCustomerIdState(id);
    localStorage.setItem("yuno_customer_id", id);
  };

  const setCheckoutSessionId = (id: string) => {
    setCheckoutSessionIdState(id);
    localStorage.setItem("yuno_checkout_session", id);
  };

  return (
    <PaymentContext.Provider
      value={{ customerId, checkoutSessionId, setCustomerId, setCheckoutSessionId }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error("usePayment must be used within a PaymentProvider");
  return context;
};