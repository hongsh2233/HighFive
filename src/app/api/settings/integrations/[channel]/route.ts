import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { INTEGRATION_CHANNELS, IntegrationChannel } from '@/lib/integrations';

function isValidChannel(channel: string): channel is IntegrationChannel {
  return (INTEGRATION_CHANNELS as readonly string[]).includes(channel);
}

// PUT /api/settings/integrations/[channel] - 채널 설정 저장 (ADMIN 전용)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { channel } = await params;
    if (!isValidChannel(channel)) {
      return errorResponse('유효하지 않은 채널입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { webhookUrl, botToken, chatId, isEnabled } = body;

    const row = await prisma.integration.upsert({
      where: { channel },
      update: {
        webhookUrl: webhookUrl ?? null,
        botToken: botToken ?? null,
        chatId: chatId ?? null,
        isEnabled: !!isEnabled,
      },
      create: {
        channel,
        webhookUrl: webhookUrl ?? null,
        botToken: botToken ?? null,
        chatId: chatId ?? null,
        isEnabled: !!isEnabled,
      },
    });

    return successResponse(row, '저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('저장 중 오류가 발생했습니다.', 500);
  }
}
