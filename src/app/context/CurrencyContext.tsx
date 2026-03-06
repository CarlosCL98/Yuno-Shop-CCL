"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrencyByCountry, getCurrencySymbolByCountry } from "../data/countries";
import { convertPrice as convertPricePure } from "../lib/currency";

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  country: string;
  setCurrency: (currency: string) => void;
  setCountry: (countryCode: string) => void;
  formatPrice: (price: number) => string;
  convertPrice: (price: number, fromCurrency?: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<string>("PE"); // Default to Peru
  const [currency, setCurrencyState] = useState<string>("PEN");
  const [currencySymbol, setCurrencySymbolState] = useState<string>("S/.");

  // Load from localStorage on mount and initialize currency
  useEffect(() => {
    const storedCountry = localStorage.getItem("selectedCountry");
    if (storedCountry) {
      setCountry(storedCountry);
    } else {
      // Initialize with default country's currency
      const defaultCurrency = getCurrencyByCountry(country);
      const defaultSymbol = getCurrencySymbolByCountry(country);
      setCurrencyState(defaultCurrency);
      setCurrencySymbolState(defaultSymbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update currency when country changes
  const setCountry = (countryCode: string) => {
    setCountryState(countryCode);
    const newCurrency = getCurrencyByCountry(countryCode);
    const newSymbol = getCurrencySymbolByCountry(countryCode);
    setCurrencyState(newCurrency);
    setCurrencySymbolState(newSymbol);
    localStorage.setItem("selectedCountry", countryCode);
    localStorage.setItem("selectedCurrency", newCurrency);
  };

  // Direct currency setter (if needed)
  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("selectedCurrency", newCurrency);
  };

  // Format price with currency symbol
  const formatPrice = (price: number): string => {
    const convertedPrice = convertPrice(price);
    return `${currencySymbol}${convertedPrice.toLocaleString()}`;
  };

  // Convert price from USD base to current currency
  const convertPrice = (price: number, fromCurrency: string = "USD"): number => {
    return convertPricePure(price, currency, fromCurrency);
  };

  const value: CurrencyContextType = {
    currency,
    currencySymbol,
    country,
    setCurrency,
    setCountry,
    formatPrice,
    convertPrice,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
