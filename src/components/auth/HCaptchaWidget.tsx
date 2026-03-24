"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

type Props = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  disabled?: boolean;
};

const SCRIPT_ID = "hcaptcha-api-script";
const SCRIPT_SRC = "https://js.hcaptcha.com/1/api.js?render=explicit";

function loadScriptOnce(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load hCaptcha")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("Failed to load hCaptcha")));
    document.head.appendChild(script);
  });
}

export default function HCaptchaWidget({ siteKey, onTokenChange, disabled = false }: Props) {
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    onTokenChange(null);

    loadScriptOnce()
      .then(() => {
        if (cancelled || !window.hcaptcha || widgetIdRef.current) return;

        widgetIdRef.current = window.hcaptcha.render(containerId, {
          sitekey: siteKey,
          callback: (token: string) => onTokenChange(token),
          "expired-callback": () => onTokenChange(null),
          "error-callback": () => onTokenChange(null),
        });
      })
      .catch(() => {
        onTokenChange(null);
      });

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      if (widgetId && window.hcaptcha) {
        window.hcaptcha.remove(widgetId);
      }
      widgetIdRef.current = null;
    };
  }, [containerId, onTokenChange, siteKey]);

  useEffect(() => {
    if (!disabled || !widgetIdRef.current || !window.hcaptcha) return;
    window.hcaptcha.reset(widgetIdRef.current);
    onTokenChange(null);
  }, [disabled, onTokenChange]);

  return <div id={containerId} className={disabled ? "pointer-events-none opacity-60" : ""} />;
}
