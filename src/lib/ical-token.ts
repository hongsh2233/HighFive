import { createHmac } from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'tms-ical-secret';

export function generateIcalToken(userId: number): string {
  const payload = `${userId}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyIcalToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [payload, sig] = decoded.split(':');
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    const userId = parseInt(payload);
    return isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}
