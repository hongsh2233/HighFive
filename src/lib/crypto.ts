import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// NEXTAUTH_SECRET을 scrypt로 파생시켜 AES-256-GCM 키로 사용한다.
// 추가 환경변수 없이, 이미 필수인 NEXTAUTH_SECRET을 재사용한다(ical-token.ts와 동일 전략).
function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다. 시크릿 암호화에 필요합니다.');
  }
  return scryptSync(secret, 'highfive-ai-settings-salt', 32);
}

// 반환 형식: base64url(iv):base64url(authTag):base64url(ciphertext)
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64url')).join(':');
}

export function decryptSecret(encoded: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = encoded.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64url');
    const authTag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}
