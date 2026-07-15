import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { emptyFeatureMap, AiFeatureMap } from '@/lib/ai-settings';

// GET /api/settings/ai/status - 기능별 활성화 여부 조회 (인증된 사용자 전체, 키 값은 절대 반환하지 않음)
export async function GET() {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    const settings = organizationId
      ? await prisma.aiSettings.findUnique({ where: { organizationId } })
      : null;
    const features: AiFeatureMap = { ...emptyFeatureMap(), ...((settings?.features as Partial<AiFeatureMap>) || {}) };

    return successResponse({ features });
  } catch (err) {
    console.error(err);
    return errorResponse('AI 기능 상태 조회 중 오류가 발생했습니다.', 500);
  }
}
