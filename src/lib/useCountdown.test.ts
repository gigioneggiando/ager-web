import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns 0 seconds when targetTime is null", () => {
    const { result } = renderHook(() => useCountdown(null));

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it("counts down from target time to zero", () => {
    const targetTime = Date.now() + 10_000; // 10 seconds from now
    const { result } = renderHook(() => useCountdown(targetTime, { tickMs: 1000 }));

    expect(result.current.secondsLeft).toBeGreaterThan(0);
    expect(result.current.isActive).toBe(true);

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsLeft).toBeGreaterThanOrEqual(6);
    expect(result.current.secondsLeft).toBeLessThanOrEqual(7);

    // Advance 7 more seconds to reach zero
    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it("respects enabled:false option", () => {
    const targetTime = Date.now() + 10_000;
    const { result } = renderHook(() => useCountdown(targetTime, { enabled: false }));

    expect(result.current.isActive).toBe(false);
    // When enabled=false, secondsLeft is still calculated but timer doesn't advance
    expect(result.current.secondsLeft).toBeGreaterThan(0);

    // Keep track of initial secondsLeft
    const initialSeconds = result.current.secondsLeft;

    // Advance time - timer should not tick, so secondsLeft should not change
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // secondsLeft should not have updated (timer not running)
    expect(result.current.secondsLeft).toBe(initialSeconds);
  });

  it("stops counting when enabled changes to false", () => {
    const targetTime = Date.now() + 60_000; // 60 seconds
    const { result, rerender } = renderHook(
      ({ enabled }) => useCountdown(targetTime, { enabled, tickMs: 1000 }),
      { initialProps: { enabled: true } }
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const secondsAfterAdvance = result.current.secondsLeft;

    // Disable countdown
    rerender({ enabled: false });

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should not have advanced further
    expect(result.current.secondsLeft).toBe(secondsAfterAdvance);
  });

  it("clears interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const targetTime = Date.now() + 60_000;

    const { unmount } = renderHook(() => useCountdown(targetTime, { tickMs: 1000 }));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("uses custom tickMs interval", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    const targetTime = Date.now() + 60_000;

    renderHook(() => useCountdown(targetTime, { tickMs: 500 }));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it("handles OTP resend scenario (60s cooldown)", () => {
    const resendCooldownMs = 60_000;
    const targetTime = Date.now() + resendCooldownMs;

    const { result } = renderHook(() => useCountdown(targetTime, { tickMs: 1000 }));

    expect(result.current.isActive).toBe(true);

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.secondsLeft).toBeGreaterThanOrEqual(29);
    expect(result.current.secondsLeft).toBeLessThanOrEqual(31);

    // Fast-forward to end
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isActive).toBe(false);
  });
});
