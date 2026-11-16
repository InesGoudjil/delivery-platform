"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, the bot check on sign-in, sign-up, password reset and the public forms
 * (docs/auth.md).
 *
 * Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it renders nothing and the forms send no token. That
 * works only while Supabase's CAPTCHA protection and TURNSTILE_SECRET_KEY are also off.
 *
 * The token goes to the server in a hidden `captcha_token` field and through `onToken`. A token is
 * good for one check only, so call `reset()` after every submit that the server refused.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "auto" | "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
      "response-field"?: boolean;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** True when the forms show the check and the server expects a token. */
export function isCaptchaEnabled(): boolean {
  return SITE_KEY !== "";
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn't load")));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Turnstile didn't load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Asks Cloudflare for a fresh token (the previous one was used or refused). */
  reset(): void;
}

interface TurnstileWidgetProps {
  /** Shown in Cloudflare's analytics, e.g. "login". Letters, digits, "-" and "_" only. */
  action: string;
  onToken?: (token: string | null) => void;
  className?: string;
}

export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { action, onToken, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    let cancelled = false;
    const report = (value: string | null) => {
      setToken(value ?? "");
      onTokenRef.current?.(value);
    };

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          action,
          theme: "auto",
          appearance: "interaction-only",
          "response-field": false,
          callback: (value) => report(value),
          "expired-callback": () => report(null),
          "error-callback": () => report(null),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action]);

  useImperativeHandle(ref, () => ({
    reset() {
      setToken("");
      onTokenRef.current?.(null);
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    },
  }));

  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      <input type="hidden" name="captcha_token" value={token} />
      {failed && (
        <p className="text-xs text-destructive">
          The security check couldn&apos;t load. Check your connection or turn off content blockers, then reload the page.
        </p>
      )}
    </div>
  );
});
