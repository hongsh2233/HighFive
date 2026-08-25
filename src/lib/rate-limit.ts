// 로그인 브루트포스 방지를 위한 경량 인메모리 rate limiter.
// 단일 프로세스(Railway) 기준 — 재시작 시 초기화되지만 반복 시도를 즉시 차단하는 1차 방어선 역할.

interface Entry {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15분 내 시도 집계
const LOCK_MS = 15 * 60 * 1000; // 초과 시 15분 잠금

const attempts = new Map<string, Entry>();

function keyFor(identifier: string): string {
  return identifier.toLowerCase().trim();
}

export function isLocked(identifier: string): { locked: boolean; retryAfterSec?: number } {
  const entry = attempts.get(keyFor(identifier));
  if (!entry?.lockedUntil) return { locked: false };
  const now = Date.now();
  if (now < entry.lockedUntil) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  attempts.delete(keyFor(identifier));
  return { locked: false };
}

export function recordFailure(identifier: string): void {
  const key = keyFor(identifier);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
}

export function recordSuccess(identifier: string): void {
  attempts.delete(keyFor(identifier));
}

// 공개 폼(로그인 불필요, 예: 홈페이지 문의 접수) 스팸 방지용 범용 rate limiter.
// 위 로그인 잠금과는 별개의 카운터(버킷)를 사용한다.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= limit) {
    return true;
  }

  bucket.count += 1;
  return false;
}
