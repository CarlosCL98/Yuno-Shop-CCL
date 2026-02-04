"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCountryData, getPhoneCountryCode, getDefaultDocumentType, getSampleDocumentNumber, getDefaultAddress } from "../data/countries";

export interface CustomerData {
  merchant_customer_id?: string;
  merchant_customer_created_at?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  country?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  document?: {
    document_type?: string;
    document_number?: string;
  };
  phone?: {
    number?: string;
    country_code?: string;
  };
  billing_address?: {
    address_line_1?: string;
    address_line_2?: string;
    country?: string;
    state?: string;
    city?: string;
    zip_code?: string;
  };
  shipping_address?: {
    address_line_1?: string;
    address_line_2?: string;
    country?: string;
    state?: string;
    city?: string;
    zip_code?: string;
  };
}

interface CustomerContextType {
  customerData: CustomerData;
  updateCustomerData: (updates: Partial<CustomerData>) => void;
  updateCustomerField: (field: keyof CustomerData, value: any) => void;
  updateNestedField: (section: keyof Pick<CustomerData, 'document' | 'phone' | 'billing_address' | 'shipping_address'>, field: string, value: string) => void;
  updateCountryData: (countryCode: string) => void;
  resetCustomerData: () => void;
  clearCachedCustomerId: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

// Default customer data
const getDefaultCustomerData = (): CustomerData => ({
  merchant_customer_id: "shopccl_customertest_001_co_date",
  merchant_customer_created_at: "2026-02-03T14:50:58Z",
  first_name: "Test",
  last_name: "User",
  email: "carlos.medina@y.uno", // For MP test_user_1631154188@testuser.com
  country: "CO",
  gender: "M",
  date_of_birth: "2000-12-14",
  nationality: "CO",
  document: {
    document_type: "CC",
    document_number: "1234567890",
  },
  phone: {
    number: "3991111111",
    country_code: "57",
  },
  billing_address: {
    address_line_1: "Cra 15 No 93-50",
    address_line_2: "Apt 301",
    country: "CO",
    state: "Cundinamarca",
    city: "Bogotá",
    zip_code: "010101",
  },
  shipping_address: {
    address_line_1: "Cra 1 No 1 1",
    address_line_2: "",
    country: "CO",
    state: "Cundinamarca",
    city: "Bogotá",
    zip_code: "010101",
  }
});

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customerData, setCustomerData] = useState<CustomerData>(getDefaultCustomerData());

  // Clear cached customer ID to force creating/updating customer
  const clearCachedCustomerId = () => {
    localStorage.removeItem("yuno_customer_id");
    localStorage.removeItem("customerData");
  };

  // Load customer data from localStorage on mount
  useEffect(() => {
    const storedCustomerData = localStorage.getItem("customerData");
    if (storedCustomerData) {
      try {
        setCustomerData(JSON.parse(storedCustomerData));
      } catch (error) {
        console.error("Error parsing stored customer data:", error);
        setCustomerData(getDefaultCustomerData());
      }
    } else {
      localStorage.setItem("customerData", JSON.stringify(customerData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save customer data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("customerData", JSON.stringify(customerData));
  }, [customerData]);

  // Update entire customer data object
  const updateCustomerData = (updates: Partial<CustomerData>) => {
    setCustomerData((prev) => ({ ...prev, ...updates }));
  };

  // Update a single field
  const updateCustomerField = (field: keyof CustomerData, value: any) => {
    setCustomerData((prev) => ({ ...prev, [field]: value }));
    
    // Clear cached customer ID for significant changes
    if (['merchant_customer_id', 'email', 'country'].includes(field)) {
      clearCachedCustomerId();
    }
  };

  // Update nested fields (document, phone, addresses)
  const updateNestedField = (
    section: keyof Pick<CustomerData, 'document' | 'phone' | 'billing_address' | 'shipping_address'>,
    field: string,
    value: string
  ) => {
    setCustomerData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Update all country-related data based on country selection
  const updateCountryData = (countryCode: string) => {
    const countryData = getCountryData(countryCode);
    if (!countryData) return;

    const defaultAddress = getDefaultAddress(countryCode);
    const phoneCode = getPhoneCountryCode(countryCode);
    const documentType = getDefaultDocumentType(countryCode);
    const sampleDocNumber = getSampleDocumentNumber(countryCode);

    setCustomerData((prev) => ({
      ...prev,
      country: countryCode,
      nationality: countryCode,
      document: {
        document_type: documentType,
        document_number: sampleDocNumber,
      },
      phone: {
        ...prev.phone,
        country_code: phoneCode,
      },
      billing_address: {
        ...prev.billing_address,
        country: countryCode,
        state: defaultAddress.state,
        city: defaultAddress.city,
        zip_code: defaultAddress.zipCode,
        address_line_1: defaultAddress.sampleAddress,
      },
      shipping_address: {
        ...prev.shipping_address,
        country: countryCode,
        state: defaultAddress.state,
        city: defaultAddress.city,
        zip_code: defaultAddress.zipCode,
        address_line_1: defaultAddress.sampleAddress,
      },
    }));
    
    // Clear cached customer ID when country changes
    clearCachedCustomerId();
  };

  // Reset to default customer data
  const resetCustomerData = () => {
    setCustomerData(getDefaultCustomerData());
    clearCachedCustomerId();
  };

  const value: CustomerContextType = {
    customerData,
    updateCustomerData,
    updateCustomerField,
    updateNestedField,
    updateCountryData,
    resetCustomerData,
    clearCachedCustomerId,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
};
