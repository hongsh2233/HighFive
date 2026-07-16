import * as Sentry from '@sentry/nextjs';

// SENTRY_DSN 미설정 시 조용히 비활성화 — 별도 설정 없이도 빌드/실행에 영향 없음.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}
