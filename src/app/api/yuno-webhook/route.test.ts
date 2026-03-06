import { createMockRequest } from "@/test-utils/mock-request";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

import { POST, GET } from "./route";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/yuno-webhook", () => {
  const eventTypes = [
    "payment.created",
    "payment.approved",
    "payment.declined",
    "payment.cancelled",
    "payment.refunded",
  ];

  for (const eventType of eventTypes) {
    it(`returns success for ${eventType}`, async () => {
      const req = createMockRequest({
        event_type: eventType,
        data: { id: "pay_1", merchant_order_id: "order_1", status: "OK" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  }

  it("unknown event type still returns 200", async () => {
    const req = createMockRequest({
      event_type: "unknown.event",
      data: { id: "pay_1" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("malformed JSON returns 500", async () => {
    const req = new Request("http://localhost:3000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/yuno-webhook", () => {
  it("returns active message", async () => {
    const req = new Request("http://localhost:3000");
    const res = await GET(req);
    const data = await res.json();
    expect(data.message).toContain("active");
  });
});
