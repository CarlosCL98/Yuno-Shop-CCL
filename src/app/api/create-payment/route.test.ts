import { createMockRequest, createMockFetchResponse } from "@/test-utils/mock-request";

// Stub environment variables
vi.stubEnv("NEXT_PUBLIC_API_KEY", "sandbox_test");
vi.stubEnv("PRIVATE_SECRET_KEY", "secret_test");
vi.stubEnv("ACCOUNT_CODE", "acc_123");

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
}));

// Mock global fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { POST } from "./route";

beforeEach(() => {
  fetchMock.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/create-payment", () => {
  it("guest checkout builds inline customer_payer (no id field)", async () => {
    const customerInfo = {
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      document: { type: "CC", number: "123" },
      phone: { number: "555" },
      billing_address: { street: "123 Main" },
      shipping_address: { street: "456 Oak" },
    };
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "pay_1" }));

    const req = createMockRequest({
      isGuestCheckout: true,
      customerPayerInfo: customerInfo,
      checkoutSessionId: "sess_1",
      oneTimeToken: "tok_1",
      country: "CO",
      currency: "COP",
      total: 1000,
    });

    await POST(req);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.customer_payer.first_name).toBe("John");
    expect(body.customer_payer.email).toBe("john@example.com");
    expect(body.customer_payer).not.toHaveProperty("id");
  });

  it("registered checkout builds customer_payer with id only", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "pay_2" }));

    const req = createMockRequest({
      isGuestCheckout: false,
      customerId: "cust_123",
      checkoutSessionId: "sess_2",
      oneTimeToken: "tok_2",
    });

    await POST(req);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.customer_payer).toEqual({ id: "cust_123" });
  });

  it("CLICK_TO_PAY adds store_credentials", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "pay_3" }));

    const req = createMockRequest({
      customerId: "cust_1",
      checkoutSessionId: "sess_3",
      oneTimeToken: "tok_3",
      paymentMethodType: "CLICK_TO_PAY",
    });

    await POST(req);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.payment_method.detail.card.store_credentials).toEqual({
      reason: "CARD_ON_FILE",
      usage: "FIRST",
    });
  });

  it("non-CLICK_TO_PAY omits store_credentials", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "pay_4" }));

    const req = createMockRequest({
      customerId: "cust_1",
      checkoutSessionId: "sess_4",
      oneTimeToken: "tok_4",
      paymentMethodType: "CARD",
    });

    await POST(req);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.payment_method.detail.card.store_credentials).toBeUndefined();
  });

  it("returns Yuno API response JSON", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "pay_5", status: "APPROVED" }));

    const req = createMockRequest({
      customerId: "cust_1",
      checkoutSessionId: "sess_5",
      oneTimeToken: "tok_5",
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data).toEqual({ id: "pay_5", status: "APPROVED" });
  });

  it("returns 500 on fetch error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const req = createMockRequest({
      customerId: "cust_1",
      checkoutSessionId: "sess_6",
      oneTimeToken: "tok_6",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error creating payment");
  });
});
