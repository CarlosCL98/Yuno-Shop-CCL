import {
  getCurrencyByCountry,
  getCurrencySymbolByCountry,
  getCountryByCurrency,
  getCountryData,
  getPhoneCountryCode,
  getDocumentTypes,
  getDefaultDocumentType,
  getSampleDocumentNumber,
  getDefaultAddress,
} from "./countries";

describe("getCurrencyByCountry", () => {
  it("returns COP for CO", () => {
    expect(getCurrencyByCountry("CO")).toBe("COP");
  });

  it("returns USD for unknown country", () => {
    expect(getCurrencyByCountry("ZZ")).toBe("USD");
  });
});

describe("getCurrencySymbolByCountry", () => {
  it("returns S/. for PE", () => {
    expect(getCurrencySymbolByCountry("PE")).toBe("S/.");
  });

  it("returns $ for unknown country", () => {
    expect(getCurrencySymbolByCountry("ZZ")).toBe("$");
  });
});

describe("getCountryByCurrency", () => {
  it("returns CO object for COP", () => {
    expect(getCountryByCurrency("COP")?.isoCode).toBe("CO");
  });

  it("returns undefined for unknown currency", () => {
    expect(getCountryByCurrency("XYZ")).toBeUndefined();
  });
});

describe("getCountryData", () => {
  it("returns full object for MX", () => {
    const mx = getCountryData("MX");
    expect(mx).toBeDefined();
    expect(mx!.name).toBe("México");
    expect(mx!.currency).toBe("MXN");
  });

  it("returns undefined for unknown code", () => {
    expect(getCountryData("ZZ")).toBeUndefined();
  });
});

describe("getPhoneCountryCode", () => {
  it("returns 57 for CO", () => {
    expect(getPhoneCountryCode("CO")).toBe("57");
  });

  it("returns 1 for unknown country", () => {
    expect(getPhoneCountryCode("ZZ")).toBe("1");
  });
});

describe("getDocumentTypes", () => {
  it("returns BR document types", () => {
    expect(getDocumentTypes("BR")).toEqual(["CPF", "RG", "PP"]);
  });

  it("returns default types for unknown country", () => {
    expect(getDocumentTypes("ZZ")).toEqual(["CC", "CE", "PP"]);
  });
});

describe("getDefaultDocumentType", () => {
  it("returns DNI for PE", () => {
    expect(getDefaultDocumentType("PE")).toBe("DNI");
  });

  it("returns CC for unknown country", () => {
    expect(getDefaultDocumentType("ZZ")).toBe("CC");
  });
});

describe("getSampleDocumentNumber", () => {
  it("returns CL sample", () => {
    expect(getSampleDocumentNumber("CL")).toBe("12.345.678-9");
  });

  it("returns default for unknown country", () => {
    expect(getSampleDocumentNumber("ZZ")).toBe("1234567890");
  });
});

describe("getDefaultAddress", () => {
  it("returns correct address for AR", () => {
    const addr = getDefaultAddress("AR");
    expect(addr.state).toBe("Buenos Aires");
    expect(addr.city).toBe("Buenos Aires");
    expect(addr.zipCode).toBe("C1001");
    expect(addr.sampleAddress).toBe("Av. Corrientes 1234");
  });

  it("returns fallback for unknown country", () => {
    const addr = getDefaultAddress("ZZ");
    expect(addr.state).toBe("State");
    expect(addr.city).toBe("City");
  });
});
