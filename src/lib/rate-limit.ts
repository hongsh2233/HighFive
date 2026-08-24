const buckets = new Map<string, { count: number; resetAt: number }>();

// 인메모리 IP 기준 rate limit. 다중 인스턴스 배포 시 비영속적(인스턴스별로 별도 카운트)이라
// 완벽한 방어는 아니지만, 공개 폼(로그인 불필요) 스팸 방지의 최소 장치로 사용한다.
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
