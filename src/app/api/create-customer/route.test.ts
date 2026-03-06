import { createMockRequest, createMockFetchResponse } from "@/test-utils/mock-request";

vi.stubEnv("NEXT_PUBLIC_API_KEY", "sandbox_test");
vi.stubEnv("PRIVATE_SECRET_KEY", "secret_test");

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
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/create-customer", () => {
  it("successful creation returns data", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "cust_1", name: "John" }));

    const res = await POST(createMockRequest({ merchant_customer_id: "m1", first_name: "John" }));
    const data = await res.json();
    expect(data).toEqual({ id: "cust_1", name: "John" });
  });

  it("duplicate → GET existing → PATCH update → returns updated data", async () => {
    // POST returns duplicate
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ code: "CUSTOMER_ID_DUPLICATED" }));
    // GET existing customer
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "cust_existing", name: "Old" }));
    // PATCH update succeeds
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ id: "cust_existing", name: "Updated" })
    );

    const res = await POST(createMockRequest({ merchant_customer_id: "m1", first_name: "Updated" }));
    const data = await res.json();
    expect(data).toEqual({ id: "cust_existing", name: "Updated" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("duplicate → GET → PATCH fails → returns existing data", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ code: "CUSTOMER_ID_DUPLICATED" }));
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "cust_existing", name: "Old" }));
    // PATCH fails
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ error: "fail" }, { ok: false, status: 500 })
    );

    const res = await POST(createMockRequest({ merchant_customer_id: "m1" }));
    const data = await res.json();
    expect(data).toEqual({ id: "cust_existing", name: "Old" });
  });

  it("exception returns 500", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const res = await POST(createMockRequest({ merchant_customer_id: "m1" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error creating customer");
  });
});
