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

describe("POST /api/unenroll-payment-method", () => {
  it("missing payment_method_id returns 400", async () => {
    const res = await POST(createMockRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("required");
  });

  it("successful unenroll returns success", async () => {
    fetchMock.mockResolvedValueOnce(createMockFetchResponse({ status: "UNENROLLED" }));

    const res = await POST(createMockRequest({ payment_method_id: "pm_1" }));
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("non-ok Yuno response returns error status", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockFetchResponse({ error: "not found" }, { ok: false, status: 404 })
    );

    const res = await POST(createMockRequest({ payment_method_id: "pm_bad" }));
    expect(res.status).toBe(404);
  });
});
