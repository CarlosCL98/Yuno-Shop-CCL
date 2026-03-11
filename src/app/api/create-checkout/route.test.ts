import { createMockRequest, createMockFetchResponse } from "@/test-utils/mock-request";

vi.stubEnv("NEXT_PUBLIC_API_KEY", "sandbox_test");
vi.stubEnv("PRIVATE_SECRET_KEY", "secret_test");
vi.stubEnv("ACCOUNT_CODE", "acc_123");

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
}));

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

describe("POST /api/create-checkout", () => {
  it("rounds amount to 2 decimals (19.999 → 20)", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ checkout_session: "cs_1" }));

    await POST(createMockRequest({ amount: 19.999, country: "PE", currency: "PEN" }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.amount.value).toBe(20);
  });

  it("handles floating-point: 0.1 + 0.2 → 0.3", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ checkout_session: "cs_2" }));

    await POST(createMockRequest({ amount: 0.1 + 0.2, country: "PE", currency: "PEN" }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.amount.value).toBe(0.3);
  });

  it("uses provided country and currency", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ checkout_session: "cs_3" }));

    await POST(createMockRequest({ amount: 100, country: "CO", currency: "COP" }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.country).toBe("CO");
    expect(body.amount.currency).toBe("COP");
  });

  it("defaults currency to USD", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ checkout_session: "cs_4" }));

    await POST(createMockRequest({ amount: 50, country: "PE" }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.amount.currency).toBe("USD");
  });

  it("non-ok response returns error with status", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ message: "Bad request" }, { ok: false, status: 400 })
    );

    const res = await POST(createMockRequest({ amount: 10, country: "PE" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Yuno API Error");
  });

  it("exception returns 500", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network failure"));

    const res = await POST(createMockRequest({ amount: 10, country: "PE" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error creating Yuno session");
  });
});
