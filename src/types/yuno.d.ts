interface YunoInstance {
  startCheckout(config: any): void;
  mountCheckout(): void;
  mountCheckoutLite(config: any): void;
  mountExternalButtons(config: any[]): void;
  mountEnrollmentLite(config: any): void;
  startPayment(): void;
  submitOneTimeTokenForm(): Promise<void>;
  continuePayment(config: any): Promise<any>;
  hideLoader(): void;
  // Headless Web SDK — returns an apiClientPayment client for merchant-owned card forms.
  apiClientPayment(config: any): Promise<any>;
}

interface YunoStatic {
  initialize(publicApiKey: string): Promise<YunoInstance>;
}

// eslint-disable-next-line no-var
declare var Yuno: YunoStatic;
