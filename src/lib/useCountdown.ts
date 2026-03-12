"use client";

import { useEffect, useMemo, useState } from "react";

type UseCountdownOptions = {
  enabled?: boolean;
  tickMs?: number;
};

export function useCountdown(
  targetTime: number | null,
  options: UseCountdownOptions = {}
) {
  const { enabled = true, tickMs = 250 } = options;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !targetTime) {
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(timer);
  }, [enabled, targetTime, tickMs]);

  const secondsLeft = useMemo(() => {
    if (!targetTime) {
      return 0;
    }

    return Math.max(0, Math.ceil((targetTime - now) / 1000));
  }, [targetTime, now]);

  return {
    secondsLeft,
    isActive: enabled && secondsLeft > 0,
  };
}