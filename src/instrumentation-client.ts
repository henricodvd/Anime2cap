import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  ignoreErrors: [
    "Non-Error promise rejection captured with value: undefined",
    "AdSense head tag doesn't support data-nscript attribute.",
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
