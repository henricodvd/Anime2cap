import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b4cc12f3bb7cd714e6ce3026cdeb0556@o4511357617307648.ingest.us.sentry.io/4511357625106432",
  tracesSampleRate: 1.0,
  debug: false,
});
