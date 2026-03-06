// Simple exchange rates - in a real app, you'd fetch these from an API
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,      // Base currency
  COP: 4200,   // Colombian Peso
  PEN: 3.7,    // Peruvian Sol
  ARS: 350,    // Argentine Peso
  BRL: 5.2,    // Brazilian Real
  MXN: 17,     // Mexican Peso
  CLP: 900,    // Chilean Peso
  UYU: 42,     // Uruguayan Peso
};

/**
 * Convert a price between currencies using USD as intermediary.
 */
export function convertPrice(
  price: number,
  targetCurrency: string,
  fromCurrency: string = "USD"
): number {
  if (fromCurrency === targetCurrency) return price;

  // Convert to USD first if not already
  const usdPrice = fromCurrency === "USD" ? price : price / EXCHANGE_RATES[fromCurrency];

  // Convert from USD to target currency
  const convertedPrice = targetCurrency === "USD" ? usdPrice : usdPrice * EXCHANGE_RATES[targetCurrency];

  // Round to 2 decimal places for most currencies, or 0 for currencies like CLP
  const decimals = ["CLP", "COP", "ARS"].includes(targetCurrency) ? 0 : 2;
  return Math.round(convertedPrice * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
