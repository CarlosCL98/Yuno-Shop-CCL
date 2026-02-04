import { Country } from "../models/definitions";

export const countries: Country[] = [
  { 
    isoCode: 'CO', 
    name: "Colombia", 
    currency: "COP", 
    currencySymbol: "$",
    phoneCountryCode: "57",
    documentTypes: ["CC", "CE", "PP"],
    defaultDocumentType: "CC",
    sampleDocumentNumber: "1234567890",
    defaultAddress: {
      state: "Cundinamarca",
      city: "Bogotá",
      zipCode: "11001",
      sampleAddress: "Cra 15 No 93-50"
    }
  },
  { 
    isoCode: 'PE', 
    name: "Perú", 
    currency: "PEN", 
    currencySymbol: "S/.",
    phoneCountryCode: "51",
    documentTypes: ["DNI", "CE", "PP"],
    defaultDocumentType: "DNI",
    sampleDocumentNumber: "46701208",
    defaultAddress: {
      state: "Lima",
      city: "Lima",
      zipCode: "010101",
      sampleAddress: "Av. Javier Prado Este 123"
    }
  },
  { 
    isoCode: 'AR', 
    name: "Argentina", 
    currency: "ARS", 
    currencySymbol: "$",
    phoneCountryCode: "54",
    documentTypes: ["DNI", "LE", "LC", "PP"],
    defaultDocumentType: "DNI",
    sampleDocumentNumber: "12345678",
    defaultAddress: {
      state: "Buenos Aires",
      city: "Buenos Aires",
      zipCode: "C1001",
      sampleAddress: "Av. Corrientes 1234"
    }
  },
  { 
    isoCode: 'PA', 
    name: "Panamá", 
    currency: "USD", 
    currencySymbol: "$",
    phoneCountryCode: "507",
    documentTypes: ["CIP", "CE", "PP"],
    defaultDocumentType: "CIP",
    sampleDocumentNumber: "1-234-567",
    defaultAddress: {
      state: "Panamá",
      city: "Ciudad de Panamá",
      zipCode: "00000",
      sampleAddress: "Calle 50, Edificio Plaza"
    }
  },
  { 
    isoCode: 'BR', 
    name: "Brasil", 
    currency: "BRL", 
    currencySymbol: "R$",
    phoneCountryCode: "55",
    documentTypes: ["CPF", "RG", "PP"],
    defaultDocumentType: "CPF",
    sampleDocumentNumber: "12345678909",
    defaultAddress: {
      state: "São Paulo",
      city: "São Paulo",
      zipCode: "01310-100",
      sampleAddress: "Av. Paulista, 1000"
    }
  },
  { 
    isoCode: 'MX', 
    name: "México", 
    currency: "MXN", 
    currencySymbol: "$",
    phoneCountryCode: "52",
    documentTypes: ["CURP", "IFE", "PP"],
    defaultDocumentType: "CURP",
    sampleDocumentNumber: "ABCD123456HDFGHI01",
    defaultAddress: {
      state: "Ciudad de México",
      city: "Ciudad de México",
      zipCode: "06600",
      sampleAddress: "Av. Reforma 123"
    }
  },
  { 
    isoCode: 'CL', 
    name: "Chile", 
    currency: "CLP", 
    currencySymbol: "$",
    phoneCountryCode: "56",
    documentTypes: ["RUN", "PP"],
    defaultDocumentType: "RUN",
    sampleDocumentNumber: "12.345.678-9",
    defaultAddress: {
      state: "Región Metropolitana",
      city: "Santiago",
      zipCode: "7500000",
      sampleAddress: "Av. Providencia 1234"
    }
  },
  { 
    isoCode: 'US', 
    name: "United States", 
    currency: "USD", 
    currencySymbol: "$",
    phoneCountryCode: "1",
    documentTypes: ["SSN", "PP"],
    defaultDocumentType: "SSN",
    sampleDocumentNumber: "123-45-6789",
    defaultAddress: {
      state: "California",
      city: "Los Angeles",
      zipCode: "90210",
      sampleAddress: "123 Main Street"
    }
  },
  { 
    isoCode: 'UY', 
    name: "Uruguay", 
    currency: "UYU", 
    currencySymbol: "$U",
    phoneCountryCode: "598",
    documentTypes: ["CI", "PP"],
    defaultDocumentType: "CI",
    sampleDocumentNumber: "12345678",
    defaultAddress: {
      state: "Montevideo",
      city: "Montevideo",
      zipCode: "11000",
      sampleAddress: "Av. 18 de Julio 1234"
    }
  },
  { 
    isoCode: 'AQ', 
    name: "Antártida", 
    currency: "USD", 
    currencySymbol: "$",
    phoneCountryCode: "672",
    documentTypes: ["PP", "ID"],
    defaultDocumentType: "PP",
    sampleDocumentNumber: "A12345678",
    defaultAddress: {
      state: "Territorio Antártico",
      city: "Base McMurdo",
      zipCode: "00000",
      sampleAddress: "Research Station 1"
    }
  }
];

// Utility function to get currency by country code
export const getCurrencyByCountry = (countryCode: string): string => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.currency || "USD";
};

// Utility function to get currency symbol by country code
export const getCurrencySymbolByCountry = (countryCode: string): string => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.currencySymbol || "$";
};

// Utility function to get country by currency
export const getCountryByCurrency = (currency: string): Country | undefined => {
  return countries.find(c => c.currency === currency);
};

// Utility function to get full country data by country code
export const getCountryData = (countryCode: string): Country | undefined => {
  return countries.find(c => c.isoCode === countryCode);
};

// Utility function to get phone country code
export const getPhoneCountryCode = (countryCode: string): string => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.phoneCountryCode || "1";
};

// Utility function to get document types for a country
export const getDocumentTypes = (countryCode: string): string[] => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.documentTypes || ["CC", "CE", "PP"];
};

// Utility function to get default document type
export const getDefaultDocumentType = (countryCode: string): string => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.defaultDocumentType || "CC";
};

// Utility function to get sample document number
export const getSampleDocumentNumber = (countryCode: string): string => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.sampleDocumentNumber || "1234567890";
};

// Utility function to get default address data
export const getDefaultAddress = (countryCode: string) => {
  const country = countries.find(c => c.isoCode === countryCode);
  return country?.defaultAddress || {
    state: "State",
    city: "City",
    zipCode: "00000",
    sampleAddress: "Sample Address 123"
  };
};