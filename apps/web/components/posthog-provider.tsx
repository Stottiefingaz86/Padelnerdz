"use client";

import { useEffect } from "react";

/**
 * Client-only PostHog bootstrap. Avoids posthog-js/react during SSR/prerender.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    void import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) return;
      posthog.init(key, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
      });
      posthog.register({ app: "padel_nerdz", surface: "web" });
    });
  }, []);

  return <>{children}</>;
}
