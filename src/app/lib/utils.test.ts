import { generateUniqueId, getYunoApiBaseUrl } from "./utils";

describe("generateUniqueId", () => {
  it("uses the given prefix", () => {
    const id = generateUniqueId("order");
    expect(id).toMatch(/^order\.\d{17}$/);
  });

  it("defaults prefix to 'id'", () => {
    const id = generateUniqueId();
    expect(id.startsWith("id.")).toBe(true);
  });

  it("produces a 17-digit timestamp", () => {
    const id = generateUniqueId("x");
    const ts = id.split(".")[1];
    expect(ts).toHaveLength(17);
  });

  it("produces exact output with fake timers", () => {
    vi.useFakeTimers();
    // Use local-time constructor to avoid timezone offset issues
    const fakeDate = new Date(2025, 5, 15, 9, 30, 45, 123); // June = month 5
    vi.setSystemTime(fakeDate);
    expect(generateUniqueId("test")).toBe("test.20250615093045123");
    vi.useRealTimers();
  });
});

describe("getYunoApiBaseUrl", () => {
  it("returns sandbox URL for sandbox key", () => {
    expect(getYunoApiBaseUrl("sandbox_abc123")).toBe("https://api-sandbox.y.uno");
  });

  it("returns prod URL for prod key", () => {
    expect(getYunoApiBaseUrl("prod_xyz789")).toBe("https://api.y.uno");
  });

  it("returns sandbox URL and warns for unknown key format", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const url = getYunoApiBaseUrl("unknown_key");
    expect(url).toBe("https://api-sandbox.y.uno");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
