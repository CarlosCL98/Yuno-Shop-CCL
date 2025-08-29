"use client";

import { useCurrency } from "../context/CurrencyContext";
import { countries } from "../data/countries";

export default function CurrencySelector() {
  const { country, setCountry, currency, currencySymbol } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Country:</span>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {countries.map((countryOption) => (
          <option key={countryOption.isoCode} value={countryOption.isoCode}>
            {countryOption.name} ({countryOption.currencySymbol} {countryOption.currency})
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">
        ({currencySymbol} {currency})
      </span>
    </div>
  );
}
