import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { SERVICE_PERMISSIONS } from '@/lib/service-auth';

// PATCH /api/settings/service-keys/[id] - 즉시 회수 또는 범위(프로젝트/만료일) 변경 (ADMIN 전용)
// 회수/범위 변경은 다음 요청부터 즉시 적용된다(캐시 없이 매 요청마다 DB를 조회하기 때문).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId, error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const credentialId = parseInt(id);
    const existing = await prisma.serviceCredential.findFirst({ where: { id: credentialId, organizationId } });
    if (!existing) return errorResponse('서비스 API 키를 찾을 수 없습니다.', 404, 'KEY_404');

    const body = await req.json();

    if (body.revoke === true) {
      const revoked = await prisma.serviceCredential.update({
        where: { id: credentialId },
        data: { revokedAt: new Date() },
      });
      return successResponse({ id: revoked.id, revokedAt: revoked.revokedAt }, '서비스 API 키가 즉시 회수되었습니다.');
    }

    const data: any = {};

    if (body.permissions !== undefined) {
      const permissions = Array.from(new Set(Array.isArray(body.permissions) ? body.permissions : [])).filter((p) =>
        (SERVICE_PERMISSIONS as readonly string[]).includes(p as string)
      );
      data.permissions = (permissions.length ? permissions : ['READ']).join(',');
    }

    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    if (body.allowOrgWide !== undefined) {
      data.allowOrgWide = body.allowOrgWide === true;
    }

    if (Array.isArray(body.projectIds)) {
      const projectIds = body.projectIds.map((pid: any) => parseInt(pid)).filter((pid: number) => !isNaN(pid));
      if (!(data.allowOrgWide ?? existing.allowOrgWide) && projectIds.length === 0) {
        return errorResponse('접근을 허용할 프로젝트를 1개 이상 선택하거나, 조직 전체 읽기를 선택해주세요.', 400, 'VALID_400');
      }
      if (projectIds.length > 0) {
        const validProjects = await prisma.project.count({ where: { id: { in: projectIds }, organizationId } });
        if (validProjects !== projectIds.length) {
          return errorResponse('선택한 프로젝트 중 본인 조직에 속하지 않는 항목이 있습니다.', 400, 'VALID_400');
        }
      }
      await prisma.$transaction([
        prisma.serviceCredentialProject.deleteMany({ where: { serviceCredentialId: credentialId } }),
        prisma.serviceCredentialProject.createMany({ data: projectIds.map((projectId: number) => ({ serviceCredentialId: credentialId, projectId })) }),
      ]);
    }

    const updated = await prisma.serviceCredential.update({ where: { id: credentialId }, data });
    return successResponse(
      { id: updated.id, permissions: updated.permissions, allowOrgWide: updated.allowOrgWide, expiresAt: updated.expiresAt },
      '서비스 API 키 범위가 변경되었습니다.'
    );
  } catch (err) {
    console.error(err);
    return errorResponse('서비스 API 키 변경 중 오류가 발생했습니다.', 500);
  }
}
