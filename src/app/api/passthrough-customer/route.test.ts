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
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/passthrough-customer", () => {
  it("successful POST returns data", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ id: "cust_1" }));

    const res = await POST(createMockRequest({ first_name: "John" }));
    const data = await res.json();
    expect(data).toEqual({ id: "cust_1" });
  });

  it("CUSTOMER_ID_DUPLICATED with merchant_customer_id triggers GET fallback", async () => {
    // POST returns duplicate
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ code: "CUSTOMER_ID_DUPLICATED" }, { status: 409 })
    );
    // GET fallback
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ id: "cust_existing", name: "Existing" })
    );

    const res = await POST(
      createMockRequest({ merchant_customer_id: "m1", first_name: "John" })
    );
    const data = await res.json();
    expect(data).toEqual({ id: "cust_existing", name: "Existing" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("exception returns 500", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const res = await POST(createMockRequest({ first_name: "John" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error forwarding customer request");
  });
});
