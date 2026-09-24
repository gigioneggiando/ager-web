"use client";

import { useCallback, useEffect, useId, useRef } from "react";

/**
 * Invisible hCaptcha.
 *
 * The onboarding is a pixel-exact design with no room for a captcha widget, so
 * the challenge is only rendered if hCaptcha decides the visitor looks like a
 * bot. When no site key is configured the hook is inert and the form still works
 * - the endpoint accepts a missing token only when it has no secret either.
 */

type HCaptcha = {
  render: (container: string, config: Record<string, unknown>) => string;
  execute: (widgetId: string, options: { async: true }) => Promise<{ response: string }>;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

/** Read off window without redeclaring the global that HCaptchaWidget already owns. */
function hcaptcha(): HCaptcha | undefined {
  return (window as unknown as { hcaptcha?: HCaptcha }).hcaptcha;
}

const SCRIPT_ID = "hcaptcha-api-script";
const SCRIPT_SRC = "https://js.hcaptcha.com/1/api.js?render=explicit";

function loadScriptOnce(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (hcaptcha()) return resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("hCaptcha failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("hCaptcha failed")), { once: true });
    document.head.appendChild(script);
  });
}

export function useInvisibleCaptcha(siteKey: string) {
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadScriptOnce()
      .then(() => {
        const api = hcaptcha();
        if (cancelled || !api || widgetIdRef.current) return;
        widgetIdRef.current = api.render(containerId, {
          sitekey: siteKey,
          size: "invisible",
        });
      })
      .catch(() => {
        // Blocked or offline: the other defences still apply.
      });

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      if (widgetId) hcaptcha()?.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [containerId, siteKey]);

  /** Returns a token, or undefined when the captcha is not available. */
  const getToken = useCallback(async (): Promise<string | undefined> => {
    const widgetId = widgetIdRef.current;
    const api = hcaptcha();
    if (!widgetId || !api) return undefined;

    try {
      const { response } = await api.execute(widgetId, { async: true });
      return response;
    } catch {
      return undefined;
    } finally {
      if (widgetIdRef.current) hcaptcha()?.reset(widgetIdRef.current);
    }
  }, []);

  return { containerId, getToken };
}
