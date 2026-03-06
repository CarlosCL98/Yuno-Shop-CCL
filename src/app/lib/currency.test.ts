import { convertPrice } from "./currency";

describe("convertPrice", () => {
  it("returns original price when currencies are the same", () => {
    expect(convertPrice(100, "USD", "USD")).toBe(100);
    expect(convertPrice(5000, "COP", "COP")).toBe(5000);
  });

  it("converts USD to COP (0 decimals)", () => {
    expect(convertPrice(10, "COP", "USD")).toBe(42000);
  });

  it("converts COP to USD", () => {
    expect(convertPrice(4200, "USD", "COP")).toBe(1);
  });

  it("converts cross-currency PEN to BRL", () => {
    // PEN→USD: 10 / 3.7 ≈ 2.7027, USD→BRL: 2.7027 * 5.2 ≈ 14.054
    const result = convertPrice(10, "BRL", "PEN");
    expect(result).toBeCloseTo(14.05, 1);
  });

  it("CLP rounds to 0 decimals", () => {
    const result = convertPrice(1, "CLP", "USD");
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(900);
  });

  it("PEN rounds to 2 decimals", () => {
    const result = convertPrice(1, "PEN", "USD");
    expect(result).toBe(3.7);
  });
});
