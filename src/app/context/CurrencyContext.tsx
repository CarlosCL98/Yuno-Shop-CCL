"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrencyByCountry, getCurrencySymbolByCountry } from "../data/countries";

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

// Simple exchange rates - in a real app, you'd fetch these from an API
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,      // Base currency
  COP: 4200,   // Colombian Peso
  PEN: 3.7,    // Peruvian Sol
  ARS: 350,    // Argentine Peso
  BRL: 5.2,    // Brazilian Real
  MXN: 17,     // Mexican Peso
  CLP: 900,    // Chilean Peso
};

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
    if (fromCurrency === currency) return price;
    
    // Convert to USD first if not already
    const usdPrice = fromCurrency === "USD" ? price : price / EXCHANGE_RATES[fromCurrency];
    
    // Convert from USD to target currency
    const convertedPrice = currency === "USD" ? usdPrice : usdPrice * EXCHANGE_RATES[currency];
    
    // Round to 2 decimal places for most currencies, or 0 for currencies like CLP
    const decimals = ["CLP", "COP", "ARS"].includes(currency) ? 0 : 2;
    return Math.round(convertedPrice * Math.pow(10, decimals)) / Math.pow(10, decimals);
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
