import * as Sentry from '@sentry/nextjs';

// NEXT_PUBLIC_SENTRY_DSN 미설정 시 조용히 비활성화.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
