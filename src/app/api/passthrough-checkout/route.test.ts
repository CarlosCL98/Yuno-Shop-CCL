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

describe("POST /api/passthrough-checkout", () => {
  it("injects account_id when missing", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ checkout_session: "cs_1" }));

    await POST(createMockRequest({ amount: { value: 100, currency: "PEN" } }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.account_id).toBe("acc_123");
  });

  it("preserves account_id when provided", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ checkout_session: "cs_2" }));

    await POST(createMockRequest({ account_id: "custom_acc", amount: { value: 100 } }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.account_id).toBe("custom_acc");
  });

  it("failed POST with merchant_order_id triggers GET fallback", async () => {
    // POST fails
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse(
        { checkout_session: "cs_existing" },
        { ok: false, status: 409 }
      )
    );
    // GET fallback succeeds
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ checkout_session: "cs_existing", status: "OPEN" })
    );

    const res = await POST(
      createMockRequest({ merchant_order_id: "order_1", amount: { value: 100 } })
    );
    const data = await res.json();
    expect(data.checkout_session).toBe("cs_existing");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("failed POST without merchant_order_id returns error directly", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ error: "bad" }, { ok: false, status: 400 })
    );

    const res = await POST(createMockRequest({ amount: { value: 100 } }));
    expect(res.status).toBe(400);
  });
});
