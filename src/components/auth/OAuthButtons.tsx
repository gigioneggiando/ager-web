"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAppLocale } from "@/i18n/useAppLocale";
import { useAuthActions } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve();

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(script);
  });
}

export default function OAuthButtons({ disabled }: { disabled?: boolean }) {
  const { locale } = useAppLocale();
  const t = useTranslations("auth.oauth");
  const router = useRouter();
  const { oauthGoogle, oauthApple } = useAuthActions();

  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [actionableError, setActionableError] = useState<{ provider: "Google" | "Apple" } | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const googleInitialized = useRef(false);
  const googleRendered = useRef(false);
  const googleButtonEl = useRef<HTMLDivElement | null>(null);

  const { resolvedTheme } = useTheme();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  const appleRedirectUri = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI;
  const enableApple = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true";

  // Google should be visible even if not configured yet (click will show a helpful message).
  const showGoogle = true;
  const showApple = enableApple && !!appleClientId && !!appleRedirectUri;

  const handleOAuthError = useCallback(
    (provider: "Google" | "Apple", e: unknown) => {
      const err = e as ApiError;
      if (err?.code === "external_auth_email_missing") {
        setActionableError({ provider });
        return;
      }

      const msg = err?.message ?? t("signInFailed");
      toast(t("errorTitle"), { description: msg });
    },
    [t]
  );

  useEffect(() => {
    // Preload Google script to reduce latency.
    if (!googleClientId) return;
    loadScriptOnce("https://accounts.google.com/gsi/client")
      .then(() => setGoogleReady(true))
      .catch(() => {
        setGoogleReady(false);
      });
  }, [googleClientId]);

  // Reset the rendered flag whenever the theme changes so the button is re-rendered
  // with the correct colour scheme (outline ↔ filled_black).
  useEffect(() => {
    googleRendered.current = false;
  }, [resolvedTheme]);

  useEffect(() => {
    // Render the official Google Sign-In button.
    // Unlike One Tap prompt(), this works even when the user is not already logged in.
    if (!googleClientId || !googleReady) return;

    const g = window.google;
    if (!g?.accounts?.id) return;

    if (!googleInitialized.current) {
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp: any) => {
          const idToken = resp?.credential;
          if (!idToken) {
            toast(t("googleMissingToken"));
            setPending(null);
            return;
          }

          try {
            setPending("google");
            await oauthGoogle(idToken);
            router.push(`/${locale}/feed`);
          } catch (e: unknown) {
            handleOAuthError("Google", e);
          } finally {
            setPending(null);
          }
        },
      });
      googleInitialized.current = true;
    }

    if (!googleRendered.current && googleButtonEl.current) {
      googleButtonEl.current.innerHTML = "";
      const w = Math.floor(googleButtonEl.current.getBoundingClientRect().width || 0);
      const buttonWidth = Math.max(200, Math.min(400, w || 400));
      g.accounts.id.renderButton(googleButtonEl.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: buttonWidth,
        locale,
      });
      googleRendered.current = true;
    }
  }, [googleClientId, googleReady, handleOAuthError, locale, oauthGoogle, resolvedTheme, router, t]);

  async function startGoogle() {
    setActionableError(null);
    if (!showGoogle || !googleClientId) {
      toast(t("googleNotConfiguredTitle"), {
        description: t("googleNotConfiguredDescription"),
      });
      return;
    }

    // If Google is configured, the rendered button is the primary path.
    // Keep this handler as a safe fallback (e.g. if the script failed to load).
    toast(t("googleUnavailableTitle"), {
      description: t("googleUnavailableDescription"),
    });
  }

  async function startApple() {
    setActionableError(null);
    if (!showApple) return;
    if (!appleClientId || !appleRedirectUri) {
      toast(t("appleNotConfiguredTitle"), {
        description: t("appleNotConfiguredDescription"),
      });
      return;
    }

    try {
      setPending("apple");
      await loadScriptOnce(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
      );

      const A = window.AppleID;
      if (!A?.auth) {
        toast(t("appleUnavailable"));
        return;
      }

      A.auth.init({
        clientId: appleClientId,
        scope: "name email",
        redirectURI: appleRedirectUri,
        usePopup: true,
      });

      const resp = await A.auth.signIn();
      const idToken = resp?.authorization?.id_token;

      if (!idToken) {
        toast(t("appleMissingToken"));
        return;
      }

      await oauthApple(idToken);
      router.push(`/${locale}/feed`);
    } catch (e: unknown) {
      handleOAuthError("Apple", e);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {showGoogle && (
        googleClientId ? (
          <div className="relative overflow-hidden rounded-full border border-input bg-black">
            <div
              ref={googleButtonEl}
              className={disabled || pending !== null ? "pointer-events-none opacity-60" : ""}
            />
            {(disabled || pending !== null) && (
              <div className="absolute inset-0" aria-hidden />
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center gap-2"
            onClick={startGoogle}
            disabled={disabled || pending !== null}
          >
              <GoogleGlyph />
            {t("continueWithGoogle")}
          </Button>
        )
      )}

      {showApple && (
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center gap-2"
          onClick={startApple}
          disabled={disabled || pending !== null}
        >
          {pending === "apple"
            ? t("signingInWithApple")
            : t("continueWithApple")}
        </Button>
      )}

      {actionableError && (
        <div className="rounded-md border p-3 text-sm">
          <div className="text-foreground">
            {t("missingEmailDescription", { provider: actionableError.provider })}
          </div>
          <div className="mt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setActionableError(null);
                router.push(`/${locale}/login?fallback=external_auth_email_missing`);
              }}
            >
              {t("signInWithEmailCode")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  // Neutral "G" mark (not the Google logo), keeps UI readable.
  return (
    <span
      aria-hidden
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold"
    >
      G
    </span>
  );
}
