import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

const MAX_SIZE_BYTES = 200 * 1024; // 200KB

// POST /api/settings/organization/logo
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { logoBase64 } = body;

    if (!logoBase64) {
      return errorResponse('로고 데이터가 없습니다.', 400, 'VALID_400');
    }

    // base64 크기 검증 (base64 문자열 길이 × 0.75 ≈ 실제 바이트)
    const base64Data = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const sizeBytes = Math.ceil(base64Data.length * 0.75);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return errorResponse('로고 이미지는 200KB 이하여야 합니다.', 400, 'VALID_400');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    const mimeMatch = logoBase64.match(/^data:([a-z/+]+);base64,/);
    if (!mimeMatch || !allowedTypes.includes(mimeMatch[1])) {
      return errorResponse('PNG, JPG, GIF, WebP, SVG 형식만 지원합니다.', 400, 'VALID_400');
    }

    await prisma.organization.update({
      where: { id: organizationId! },
      data: { logoUrl: logoBase64 },
    });

    return successResponse({ logoUrl: logoBase64 }, '로고가 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('로고 저장 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/settings/organization/logo
export async function DELETE() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    await prisma.organization.update({
      where: { id: organizationId! },
      data: { logoUrl: null },
    });

    return successResponse(null, '로고가 삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('로고 삭제 중 오류가 발생했습니다.', 500);
  }
}
