import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import bcryptjs from 'bcryptjs';
import { prisma } from './db';

export function successResponse<T>(data: T, message = 'OK', status = 200) {
  return NextResponse.json(
    { success: true, data, message, timestamp: new Date().toISOString() },
    { status }
  );
}

export function errorResponse(message: string, status = 400, code = 'ERROR') {
  return NextResponse.json(
    { success: false, data: null, message, code, timestamp: new Date().toISOString() },
    { status }
  );
}

// JWT 세션은 최대 30분간 재발급 없이 신뢰되므로, 세션 발급 이후 계정 비활성화/조직
// 비활성화가 발생해도 만료 전까지는 그대로 접근이 허용될 수 있다. 매 요청마다 가볍게
// isActive 상태만 재검증해 그 시차를 없앤다(권한/조직ID 자체는 여전히 JWT를 신뢰).
async function isSessionAccountActive(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, organization: { select: { isActive: true } } },
  });
  if (!user || !user.isActive) return false;
  if (user.organization && !user.organization.isActive) return false;
  return true;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: errorResponse('인증이 필요합니다.', 401, 'AUTH_401') };
  }
  const userId = parseInt((session.user as any).id || '0');
  if (!(await isSessionAccountActive(userId))) {
    return { error: errorResponse('계정 또는 조직이 비활성화되었습니다.', 401, 'AUTH_401') };
  }
  const organizationId = (session.user as any).organizationId as number | undefined;
  return { session, organizationId };
}

// LEADER 외 사용자에게 개별 부여 가능한 담당 권한(capability) key. 새 권한이 필요하면 여기에만
// 추가하면 되고 스키마 마이그레이션은 필요 없다(UserCapability가 key-value로 일반화되어 있음).
// 실제 API 단에서 이 key를 검사하도록 연결된 것: CARD_EXPENSE/LEDGER/WEEKLY_REPORT/ANNOUNCEMENT_MANAGE/
// INQUIRY_MANAGE. 나머지(PROJECT_MANAGE 등)는 2026-09-18 기준 UI에서 부여만 가능하고 아직 API
// 권한검사에 연결되지 않은 "예약된" 키다(라운드8~9에서 점진 적용 예정) — docs/HISTORY.md 참고.
export const CAPABILITY_KEYS = [
  'CARD_EXPENSE',
  'LEDGER',
  'WEEKLY_REPORT',
  'PROJECT_MANAGE',
  'APPROVAL',
  'ANNOUNCEMENT_MANAGE',
  'INQUIRY_MANAGE',
  'USER_MANAGE',
  'STATS_VIEW',
  'AI_SETTINGS',
  'INTEGRATION_MANAGE',
  'AUDIT_LOG_VIEW',
] as const;
export type CapabilityKey = typeof CAPABILITY_KEYS[number];

// 팀원관리에서 "권한 묶음"으로 한 번에 부여할 수 있는 프리셋
export const CAPABILITY_BUNDLES: Record<string, { label: string; keys: CapabilityKey[] }> = {
  PROJECT_MANAGER: { label: '프로젝트 매니저', keys: ['PROJECT_MANAGE'] },
  APPROVER: { label: '결재 담당자', keys: ['APPROVAL'] },
  FINANCE: { label: '재무 담당자', keys: ['CARD_EXPENSE', 'LEDGER'] },
  CONTENT: { label: '콘텐츠 담당자', keys: ['ANNOUNCEMENT_MANAGE', 'INQUIRY_MANAGE'] },
  SYSTEM_OPERATOR: { label: '시스템 운영자', keys: ['USER_MANAGE', 'AI_SETTINGS', 'INTEGRATION_MANAGE', 'AUDIT_LOG_VIEW', 'STATS_VIEW'] },
};

export const CAPABILITY_LABEL: Record<CapabilityKey, string> = {
  CARD_EXPENSE: '법인카드 관리',
  LEDGER: '간편장부 관리',
  WEEKLY_REPORT: '주간보고 작성',
  PROJECT_MANAGE: '프로젝트 관리',
  APPROVAL: '결재 승인',
  ANNOUNCEMENT_MANAGE: '공지 관리',
  INQUIRY_MANAGE: '문의 관리',
  USER_MANAGE: '팀원 관리',
  STATS_VIEW: '통계 조회',
  AI_SETTINGS: 'AI 설정',
  INTEGRATION_MANAGE: '외부연동 관리',
  AUDIT_LOG_VIEW: '감사 로그 조회',
};

export async function hasCapability(userId: number, key: CapabilityKey): Promise<boolean> {
  const row = await prisma.userCapability.findUnique({
    where: { userId_key: { userId, key } },
  });
  return !!row?.value;
}

export async function getCapabilities(userId: number): Promise<Record<CapabilityKey, boolean>> {
  const rows = await prisma.userCapability.findMany({ where: { userId, value: true } });
  const set = new Set(rows.map((r) => r.key));
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, set.has(k)])) as Record<CapabilityKey, boolean>;
}

// 모듈별 접근 권한 체크: ADMIN/LEADER는 항상 통과, 그 외에는 개별 부여된 capability 필요
async function requireCapabilityAccess(key: CapabilityKey, deniedMessage: string) {
  const { session, error, organizationId } = await requireAuth();
  if (error) return { error };

  const userId = parseInt((session!.user as any).id || '0');
  const role = (session!.user as any).role;
  if (role === 'ADMIN' || role === 'LEADER') return { session, organizationId, userId, role };

  if (!(await hasCapability(userId, key))) {
    return { error: errorResponse(deniedMessage, 403, 'AUTH_403') };
  }
  return { session, organizationId, userId, role };
}

export function requireCardExpenseAccess() {
  return requireCapabilityAccess('CARD_EXPENSE', '비용관리 접근 권한이 없습니다.');
}

export function requireAnnouncementManageAccess() {
  return requireCapabilityAccess('ANNOUNCEMENT_MANAGE', '공지 관리 권한이 없습니다.');
}

export function requireInquiryManageAccess() {
  return requireCapabilityAccess('INQUIRY_MANAGE', '문의 관리 권한이 없습니다.');
}

export function requireLedgerAccess() {
  return requireCapabilityAccess('LEDGER', '비용관리 접근 권한이 없습니다.');
}

export function requireWeeklyReportWriteAccess() {
  return requireCapabilityAccess('WEEKLY_REPORT', '주간보고 작성 권한이 없습니다.');
}

export async function requireRole(requiredRoles: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: errorResponse('인증이 필요합니다.', 401, 'AUTH_401') };
  }
  const userId = parseInt((session.user as any).id || '0');
  if (!(await isSessionAccountActive(userId))) {
    return { error: errorResponse('계정 또는 조직이 비활성화되었습니다.', 401, 'AUTH_401') };
  }
  const userRole = (session.user as any).role;
  if (!requiredRoles.includes(userRole)) {
    return { error: errorResponse('권한이 없습니다.', 403, 'AUTH_403') };
  }
  const organizationId = (session.user as any).organizationId as number | undefined;
  return { session, organizationId };
}

export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: errorResponse('인증이 필요합니다.', 401, 'AUTH_401') };
  }
  if ((session.user as any).role !== 'SUPERADMIN') {
    return { error: errorResponse('슈퍼관리자 권한이 필요합니다.', 403, 'AUTH_403') };
  }
  const userId = parseInt((session.user as any).id || '0');
  if (!(await isSessionAccountActive(userId))) {
    return { error: errorResponse('계정이 비활성화되었습니다.', 401, 'AUTH_401') };
  }
  return { session };
}

export function parseRmsNo(title: string): { cleanTitle: string; rmsNo: string | null } {
  const rmsPattern = /\[([A-Z]+-\d+)\]/;
  const match = title.match(rmsPattern);
  if (match) {
    return { cleanTitle: title.replace(match[0], '').trim(), rmsNo: match[1] };
  }
  return { cleanTitle: title, rmsNo: null };
}

export const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(BCRYPT_COST);
  return bcryptjs.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function generateTempPassword(): string {
  return randomBytes(8).toString('hex');
}
