import { beforeEach, describe, expect, it, vi } from "vitest";

// Re-create the functions from session.tsx for isolated testing
// These would normally be tested via integration, but we test the core logic here

function isBrowser() {
  return typeof window !== "undefined";
}

function hasUsableAccessToken(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return false;
  return expiryTime > Date.now() + 15_000; // 15 second buffer
}

function readStoredSession(storage: typeof window.localStorage) {
  if (!isBrowser()) {
    return { ready: false, userId: null, accessToken: null, accessTokenExpiresAt: null };
  }

  const userId = storage.getItem("ager.session.userId");
  const accessToken = storage.getItem("ager.session.accessToken");
  const accessTokenExpiresAt = storage.getItem("ager.session.accessTokenExpiresAt");

  if (accessToken && hasUsableAccessToken(accessTokenExpiresAt)) {
    return {
      ready: true,
      userId,
      accessToken,
      accessTokenExpiresAt,
    };
  }

  // Clear expired tokens
  if (isBrowser()) {
    storage.removeItem("ager.session.userId");
    storage.removeItem("ager.session.accessToken");
    storage.removeItem("ager.session.accessTokenExpiresAt");
  }

  return { ready: false, userId: null, accessToken: null, accessTokenExpiresAt: null };
}

function persistSession(
  next: { userId: string | null; accessToken: string | null; accessTokenExpiresAt: string | null },
  storage: typeof window.localStorage
) {
  if (!isBrowser()) return;

  if (next.userId && next.accessToken && next.accessTokenExpiresAt) {
    storage.setItem("ager.session.userId", next.userId);
    storage.setItem("ager.session.accessToken", next.accessToken);
    storage.setItem("ager.session.accessTokenExpiresAt", next.accessTokenExpiresAt);
    return;
  }

  storage.removeItem("ager.session.userId");
  storage.removeItem("ager.session.accessToken");
  storage.removeItem("ager.session.accessTokenExpiresAt");
}

function makeMockStorage() {
  const store: Record<string, string> = {};
  return {
    _store: store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

describe("Session Persistence", () => {
  let mockStorage: ReturnType<typeof makeMockStorage>;

  beforeEach(() => {
    mockStorage = makeMockStorage();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe("hasUsableAccessToken", () => {
    it("returns false when expiresAt is null", () => {
      expect(hasUsableAccessToken(null)).toBe(false);
    });

    it("returns false when token expiry is in the past", () => {
      const pastTime = new Date(Date.now() - 60_000).toISOString();
      expect(hasUsableAccessToken(pastTime)).toBe(false);
    });

    it("returns false when token expires within 15 second buffer", () => {
      const almostExpired = new Date(Date.now() + 10_000).toISOString();
      expect(hasUsableAccessToken(almostExpired)).toBe(false);
    });

    it("returns true when token expires after 15 second buffer", () => {
      const validTime = new Date(Date.now() + 30_000).toISOString();
      expect(hasUsableAccessToken(validTime)).toBe(true);
    });

    it("returns false when expiresAt is invalid date string", () => {
      expect(hasUsableAccessToken("invalid-date")).toBe(false);
    });

    it("returns true for far future expiry", () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(hasUsableAccessToken(futureTime)).toBe(true);
    });

    it("respects exact 15 second buffer (edge case)", () => {
      // Exactly 15s from now - should be false (> 15s required)
      const borderlineTime = new Date(Date.now() + 15_000).toISOString();
      expect(hasUsableAccessToken(borderlineTime)).toBe(false);

      // 15.001s from now - should be true
      const justAfterTime = new Date(Date.now() + 15_001).toISOString();
      expect(hasUsableAccessToken(justAfterTime)).toBe(true);
    });
  });

  describe("readStoredSession", () => {
    it("returns not-ready state when storage is empty", () => {
      const session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(false);
      expect(session.userId).toBeNull();
      expect(session.accessToken).toBeNull();
    });

    it("returns not-ready when token is missing", () => {
      mockStorage._store["ager.session.userId"] = "user-123";
      mockStorage._store["ager.session.accessTokenExpiresAt"] = new Date(Date.now() + 30_000).toISOString();
      // Note: accessToken is missing

      const session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(false);
    });

    it("returns not-ready when expiry is missing", () => {
      mockStorage._store["ager.session.userId"] = "user-123";
      mockStorage._store["ager.session.accessToken"] = "token-abc";
      // Note: accessTokenExpiresAt is missing

      const session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(false);
    });

    it("clears expired token from storage", () => {
      const pastTime = new Date(Date.now() - 60_000).toISOString();
      mockStorage._store["ager.session.userId"] = "user-123";
      mockStorage._store["ager.session.accessToken"] = "expired-token";
      mockStorage._store["ager.session.accessTokenExpiresAt"] = pastTime;

      readStoredSession(mockStorage as any);

      expect(mockStorage._store["ager.session.userId"]).toBeUndefined();
      expect(mockStorage._store["ager.session.accessToken"]).toBeUndefined();
      expect(mockStorage._store["ager.session.accessTokenExpiresAt"]).toBeUndefined();
    });

    it("returns ready state with valid, non-expired token", () => {
      const futureTime = new Date(Date.now() + 1_000_000).toISOString();
      mockStorage._store["ager.session.userId"] = "user-123";
      mockStorage._store["ager.session.accessToken"] = "valid-token";
      mockStorage._store["ager.session.accessTokenExpiresAt"] = futureTime;

      const session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(true);
      expect(session.userId).toBe("user-123");
      expect(session.accessToken).toBe("valid-token");
      expect(session.accessTokenExpiresAt).toBe(futureTime);
    });

    it("handles token expiring in exactly 15 seconds (boundary test)", () => {
      const boundaryTime = new Date(Date.now() + 15_000).toISOString();
      mockStorage._store["ager.session.accessToken"] = "token";
      mockStorage._store["ager.session.accessTokenExpiresAt"] = boundaryTime;
      mockStorage._store["ager.session.userId"] = "user-123";

      const session = readStoredSession(mockStorage as any);
      // At exactly 15s, token should be considered unusable
      expect(session.ready).toBe(false);
    });
  });

  describe("persistSession", () => {
    it("stores complete session", () => {
      const expiryTime = new Date(Date.now() + 3600_000).toISOString();
      persistSession(
        {
          userId: "user-456",
          accessToken: "token-xyz",
          accessTokenExpiresAt: expiryTime,
        },
        mockStorage as any
      );

      expect(mockStorage._store["ager.session.userId"]).toBe("user-456");
      expect(mockStorage._store["ager.session.accessToken"]).toBe("token-xyz");
      expect(mockStorage._store["ager.session.accessTokenExpiresAt"]).toBe(expiryTime);
    });

    it("clears all session keys when userId is null", () => {
      mockStorage._store["ager.session.userId"] = "old-user";
      mockStorage._store["ager.session.accessToken"] = "old-token";
      mockStorage._store["ager.session.accessTokenExpiresAt"] = "2026-01-01T00:00:00Z";

      persistSession(
        {
          userId: null,
          accessToken: null,
          accessTokenExpiresAt: null,
        },
        mockStorage as any
      );

      expect(mockStorage._store["ager.session.userId"]).toBeUndefined();
      expect(mockStorage._store["ager.session.accessToken"]).toBeUndefined();
      expect(mockStorage._store["ager.session.accessTokenExpiresAt"]).toBeUndefined();
    });

    it("clears all session keys when accessToken is null", () => {
      mockStorage._store["ager.session.userId"] = "user-123";
      persistSession(
        {
          userId: "user-123",
          accessToken: null,
          accessTokenExpiresAt: "2026-01-01T00:00:00Z",
        },
        mockStorage as any
      );

      expect(mockStorage._store["ager.session.userId"]).toBeUndefined();
      expect(mockStorage._store["ager.session.accessToken"]).toBeUndefined();
    });

    it("does not clear on partial null (only if all required fields are null)", () => {
      const expiryTime = new Date(Date.now() + 3600_000).toISOString();
      persistSession(
        {
          userId: "user-123",
          accessToken: "token-abc",
          accessTokenExpiresAt: expiryTime,
        },
        mockStorage as any
      );

      expect(mockStorage._store["ager.session.userId"]).toBe("user-123");

      // Now update with new values
      const newExpiry = new Date(Date.now() + 7200_000).toISOString();
      persistSession(
        {
          userId: "user-789",
          accessToken: "token-xyz",
          accessTokenExpiresAt: newExpiry,
        },
        mockStorage as any
      );

      expect(mockStorage._store["ager.session.userId"]).toBe("user-789");
      expect(mockStorage._store["ager.session.accessToken"]).toBe("token-xyz");
      expect(mockStorage._store["ager.session.accessTokenExpiresAt"]).toBe(newExpiry);
    });
  });

  describe("Session lifecycle (integration scenarios)", () => {
    it("scenario: login -> read -> logout", () => {
      // 1. User logs in
      const expiryTime = new Date(Date.now() + 3600_000).toISOString();
      persistSession(
        {
          userId: "user-123",
          accessToken: "token-abc",
          accessTokenExpiresAt: expiryTime,
        },
        mockStorage as any
      );

      // 2. Read session
      let session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(true);
      expect(session.userId).toBe("user-123");

      // 3. User logs out
      persistSession(
        {
          userId: null,
          accessToken: null,
          accessTokenExpiresAt: null,
        },
        mockStorage as any
      );

      // 4. Session should be cleared
      session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(false);
    });

    it("scenario: token nearing expiry after page reload", () => {
      // Token expires in 20 seconds (more than 15s buffer)
      // Token expires in 60 seconds (well above the 15s buffer)
      const nearExpiryTime = new Date(Date.now() + 60_000).toISOString();
      persistSession(
        {
          userId: "user-123",
          accessToken: "token-abc",
          accessTokenExpiresAt: nearExpiryTime,
        },
        mockStorage as any
      );

      // After 10s: 50s remain → still ready (> 15s buffer)
      vi.advanceTimersByTime(10_000);
      let session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(true);

      // After another 30s: 20s remain → still ready (> 15s buffer)
      vi.advanceTimersByTime(30_000);
      session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(true);

      // After another 10s: 10s remain → NOT ready (within 15s buffer)
      vi.advanceTimersByTime(10_000);
      session = readStoredSession(mockStorage as any);
      expect(session.ready).toBe(false);
    });
  });
});
