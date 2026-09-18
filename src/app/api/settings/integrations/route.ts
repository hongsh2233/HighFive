import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { INTEGRATION_CHANNELS } from '@/lib/integrations';

function mask(value: string | null) {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 4, 12))}`;
}

// GET /api/settings/integrations - 외부연동 채널 설정 목록 (ADMIN 전용)
export async function GET() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const rows = await prisma.integration.findMany({ where: { organizationId } });
    const byChannel = new Map(rows.map((r) => [r.channel, r]));

    const result = INTEGRATION_CHANNELS.map((channel) => {
      const row = byChannel.get(channel);
      if (!row) {
        return {
          id: null,
          channel,
          webhookUrl: null,
          botToken: null,
          chatId: null,
          isEnabled: false,
          updatedAt: null,
        };
      }
      return {
        ...row,
        webhookUrl: mask(row.webhookUrl),
        botToken: mask(row.botToken),
        chatId: mask(row.chatId),
      };
    });

    return successResponse(result, '외부연동 설정 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('외부연동 설정 조회 중 오류가 발생했습니다.', 500);
  }
}
