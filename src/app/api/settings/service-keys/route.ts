import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { generateServiceApiKey, SERVICE_PERMISSIONS } from '@/lib/service-auth';

// GET /api/settings/service-keys - 조직의 서비스 API 키 목록 (ADMIN 전용, 평문 키는 노출 안 함)
export async function GET() {
  try {
    const { organizationId, error } = await requireRole(['ADMIN']);
    if (error) return error;

    const keys = await prisma.serviceCredential.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        allowOrgWide: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
        projects: { select: { project: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(keys, '서비스 API 키 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('서비스 API 키 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/settings/service-keys - 서비스 API 키 발급 (ADMIN 전용)
// 평문 키는 이 응답에서 1회만 노출되고 DB에는 해시만 저장됨.
export async function POST(req: NextRequest) {
  try {
    const { session, organizationId, error } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const name = (body.name || '').trim();
    if (!name) return errorResponse('키 이름을 입력해주세요.', 400, 'VALID_400');

    const requestedPermissions: string[] = Array.isArray(body.permissions) ? body.permissions : ['READ'];
    const permissions = Array.from(new Set(requestedPermissions)).filter((p) =>
      (SERVICE_PERMISSIONS as readonly string[]).includes(p)
    );
    if (permissions.length === 0) permissions.push('READ');

    // 조직 전체 읽기는 ADMIN이 명시적으로 allowOrgWide:true를 선택한 경우에만 허용.
    // 기본값은 false이며, 이때는 반드시 1개 이상의 프로젝트를 명시적으로 선택해야 한다.
    const allowOrgWide = body.allowOrgWide === true;
    const projectIds: number[] = Array.isArray(body.projectIds)
      ? body.projectIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
      : [];

    if (!allowOrgWide && projectIds.length === 0) {
      return errorResponse('접근을 허용할 프로젝트를 1개 이상 선택하거나, 조직 전체 읽기를 명시적으로 선택해주세요.', 400, 'VALID_400');
    }

    if (projectIds.length > 0) {
      const validProjects = await prisma.project.count({ where: { id: { in: projectIds }, organizationId } });
      if (validProjects !== projectIds.length) {
        return errorResponse('선택한 프로젝트 중 본인 조직에 속하지 않는 항목이 있습니다.', 400, 'VALID_400');
      }
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const createdById = parseInt((session!.user as any).id || '0');

    const { plainKey, keyHash, keyPrefix } = generateServiceApiKey();

    const credential = await prisma.serviceCredential.create({
      data: {
        organizationId: organizationId!,
        name,
        keyPrefix,
        keyHash,
        permissions: permissions.join(','),
        allowOrgWide,
        createdById,
        expiresAt,
        projects: allowOrgWide ? undefined : { create: projectIds.map((projectId) => ({ projectId })) },
      },
    });

    return successResponse(
      { id: credential.id, name: credential.name, apiKey: plainKey, keyPrefix },
      '서비스 API 키가 발급되었습니다. 이 평문 키는 지금만 확인할 수 있으니 안전한 곳에 보관하세요.',
      201
    );
  } catch (err) {
    console.error(err);
    return errorResponse('서비스 API 키 발급 중 오류가 발생했습니다.', 500);
  }
}
