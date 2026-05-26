import * as Sentry from "@sentry/nextjs";

/**
 * Strips PII (cookies, request body, sensitive headers) from Sentry events
 * to comply with LGPD/GDPR before data leaves the server.
 */
function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
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
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1,
      debug: false,
      sendDefaultPii: false,
      beforeSend(event) {
        return sanitizeEvent(event)
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1,
      debug: false,
      sendDefaultPii: false,
      beforeSend(event) {
        return sanitizeEvent(event)
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
