"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Payment = {
  payment_id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
};

type PaymentContextType = {
  payments: Payment[];
  addPayment: (payment: Payment) => void;
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("payments");
    if (stored) setPayments(JSON.parse(stored));
  }, []);

  const addPayment = (payment: Payment) => {
    const updated = [payment, ...payments];
    setPayments(updated);
    localStorage.setItem("payments", JSON.stringify(updated));
  };

  return (
    <PaymentContext.Provider value={{ payments, addPayment }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayments = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error("usePayments must be used within PaymentProvider");
  return context;
};