import { createHmac } from 'crypto';

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다. iCal 토큰 서명에 필요합니다.');
  }
  return secret;
}

export function generateIcalToken(userId: number): string {
  const payload = `${userId}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyIcalToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [payload, sig] = decoded.split(':');
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
    if (sig !== expected) return null;
    const userId = parseInt(payload);
    return isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}
