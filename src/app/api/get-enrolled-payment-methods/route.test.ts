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

describe("POST /api/get-enrolled-payment-methods", () => {
  it("missing customer_id returns 400", async () => {
    const res = await POST(createMockRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("required");
  });

  it("valid request returns payment methods", async () => {
    const methods = [{ id: "pm_1", type: "CARD" }, { id: "pm_2", type: "PSE" }];
    fetchMock.mockResolvedValueOnce(createMockFetchResponse(methods));

    const res = await POST(createMockRequest({ customer_id: "cust_1" }));
    const data = await res.json();
    expect(data).toEqual(methods);
  });

  it("non-ok Yuno response returns error status", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const res = await POST(createMockRequest({ customer_id: "cust_bad" }));
    expect(res.status).toBe(404);
  });
});
