import { randomBytes, createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from './db';
import { errorResponse, requireAuth } from './utils';

// 서비스 자격 증명(ServiceCredential)이 가질 수 있는 권한. 업무 생성/수정/상태변경/삭제는
// 이 목록에 없고, 해당 API들은 서비스 인증 자체를 받지 않으므로 권한 설정과 무관하게 항상 거부된다.
export const SERVICE_PERMISSIONS = ['READ', 'COMMENT_CREATE'] as const;
export type ServicePermission = typeof SERVICE_PERMISSIONS[number];

const KEY_PREFIX = 'sk_live_';

export function generateServiceApiKey(): { plainKey: string; keyHash: string; keyPrefix: string } {
  const plainKey = KEY_PREFIX + randomBytes(32).toString('hex');
  const keyHash = createHash('sha256').update(plainKey).digest('hex');
  const keyPrefix = plainKey.slice(0, 13); // "sk_live_" + 5자
  return { plainKey, keyHash, keyPrefix };
}

export function hashServiceApiKey(plainKey: string): string {
  return createHash('sha256').update(plainKey).digest('hex');
}

export type ServiceAuthResult =
  | { error: ReturnType<typeof errorResponse>; credential?: undefined; organizationId?: undefined }
  | { error?: undefined; credential: NonNullable<Awaited<ReturnType<typeof lookupCredential>>>; organizationId: number };

async function lookupCredential(keyHash: string) {
  return prisma.serviceCredential.findUnique({
    where: { keyHash },
    include: { projects: { select: { projectId: true } } },
  });
}

// Authorization: Bearer <키> 헤더를 검증해 서비스 자격 증명을 반환한다. 세션 인증(requireAuth)과는
// 완전히 별도 경로이며, 만료/회수된 키는 즉시 거부한다.
export async function requireServiceAuth(req: NextRequest): Promise<ServiceAuthResult> {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: errorResponse('인증이 필요합니다.', 401, 'AUTH_401') };
  }

  const keyHash = hashServiceApiKey(match[1].trim());
  const credential = await lookupCredential(keyHash);
  if (!credential) {
    return { error: errorResponse('유효하지 않은 API 키입니다.', 401, 'AUTH_401') };
  }
  if (credential.revokedAt) {
    return { error: errorResponse('회수된 API 키입니다.', 401, 'AUTH_401') };
  }
  if (credential.expiresAt && credential.expiresAt < new Date()) {
    return { error: errorResponse('만료된 API 키입니다.', 401, 'AUTH_401') };
  }

  // 조회 1건당 갱신하면 쓰기 부담이 커지므로 비동기로 흘려보내고 응답을 막지 않음
  prisma.serviceCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { credential, organizationId: credential.organizationId };
}

export function serviceHasPermission(
  credential: { permissions: string },
  permission: ServicePermission
): boolean {
  return credential.permissions.split(',').map((p) => p.trim()).includes(permission);
}

// 자격 증명이 해당 프로젝트에 접근 가능한지(allowOrgWide 이거나 명시적으로 선택된 프로젝트인지) 확인
export function serviceProjectAllowed(
  credential: { allowOrgWide: boolean; projects: { projectId: number }[] },
  projectId: number | null
): boolean {
  if (credential.allowOrgWide) return true;
  if (!projectId) return false;
  return credential.projects.some((p) => p.projectId === projectId);
}

// 자격 증명이 접근 가능한 프로젝트 id 목록(Prisma where의 projectId: { in: [...] } 용).
// allowOrgWide면 null을 반환해 "필터 없음(조직 전체)"을 의미하도록 한다.
export function serviceAllowedProjectIds(
  credential: { allowOrgWide: boolean; projects: { projectId: number }[] }
): number[] | null {
  if (credential.allowOrgWide) return null;
  return credential.projects.map((p) => p.projectId);
}

export type ReadAuthResult =
  | { error: ReturnType<typeof errorResponse> }
  | { error?: undefined; organizationId: number | undefined; isService: false; session: NonNullable<Awaited<ReturnType<typeof requireAuth>>['session']> }
  | { error?: undefined; organizationId: number; isService: true; allowedProjectIds: number[] | null; credential: NonNullable<Awaited<ReturnType<typeof lookupCredential>>> };

// 읽기 전용 조회 API(업무/프로젝트 목록·상세) 공용 인증 진입점.
// Authorization 헤더가 있으면 서비스 자격 증명(JIA 등)으로, 없으면 세션(일반 사용자)으로 인증한다.
export async function requireReadAuth(req: NextRequest): Promise<ReadAuthResult> {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const result = await requireServiceAuth(req);
    if (result.error) return { error: result.error };
    if (!serviceHasPermission(result.credential, 'READ')) {
      return { error: errorResponse('조회 권한이 없는 키입니다.', 403, 'AUTH_403') };
    }
    return {
      organizationId: result.organizationId,
      isService: true,
      allowedProjectIds: serviceAllowedProjectIds(result.credential),
      credential: result.credential,
    };
  }

  const { session, organizationId, error } = await requireAuth();
  if (error) return { error };
  return { organizationId, isService: false, session: session! };
}
