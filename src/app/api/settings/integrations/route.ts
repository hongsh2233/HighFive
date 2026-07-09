import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { INTEGRATION_CHANNELS } from '@/lib/integrations';

// GET /api/settings/integrations - 외부연동 채널 설정 목록 (ADMIN 전용)
export async function GET() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const rows = await prisma.integration.findMany({ where: { organizationId } });
    const byChannel = new Map(rows.map((r) => [r.channel, r]));

    const result = INTEGRATION_CHANNELS.map((channel) => {
      const row = byChannel.get(channel);
      return row ?? {
        id: null,
        channel,
        webhookUrl: null,
        botToken: null,
        chatId: null,
        isEnabled: false,
        updatedAt: null,
      };
    });

    return successResponse(result, '외부연동 설정 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('외부연동 설정 조회 중 오류가 발생했습니다.', 500);
  }
}
