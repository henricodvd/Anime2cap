import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  sendDefaultPii: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  ignoreErrors: [
    "Non-Error promise rejection captured with value: undefined",
    "AdSense head tag doesn't support data-nscript attribute.",
  ],
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies
      delete event.request.data
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['x-api-key']
        delete event.request.headers['cookie']
      }
    }
    return event
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
