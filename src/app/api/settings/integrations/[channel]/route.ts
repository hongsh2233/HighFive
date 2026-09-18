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
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const { channel } = await params;
    if (!isValidChannel(channel)) {
      return errorResponse('유효하지 않은 채널입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { webhookUrl, botToken, chatId, isEnabled } = body;

    // 마스킹된 값(*이 포함된 값)이 그대로 전달되면 기존 값 유지 — 프런트에서 미수정 필드를 재전송하는 경우 대비
    const existing = await prisma.integration.findUnique({
      where: { organizationId_channel: { organizationId: organizationId ?? 0, channel } },
    });
    const resolve = (incoming: unknown, current: string | null): string | null =>
      typeof incoming === 'string' && incoming.includes('*') ? (current ?? null) : ((incoming as string | null | undefined) ?? null);

    const resolvedWebhookUrl = resolve(webhookUrl, existing?.webhookUrl ?? null);
    const resolvedBotToken = resolve(botToken, existing?.botToken ?? null);
    const resolvedChatId = resolve(chatId, existing?.chatId ?? null);

    const row = await prisma.integration.upsert({
      where: { organizationId_channel: { organizationId: organizationId ?? 0, channel } },
      update: {
        webhookUrl: resolvedWebhookUrl,
        botToken: resolvedBotToken,
        chatId: resolvedChatId,
        isEnabled: !!isEnabled,
      },
      create: {
        channel,
        organizationId,
        webhookUrl: resolvedWebhookUrl,
        botToken: resolvedBotToken,
        chatId: resolvedChatId,
        isEnabled: !!isEnabled,
      },
    });

    return successResponse(
      { ...row, webhookUrl: undefined, botToken: undefined, chatId: undefined },
      '저장되었습니다.'
    );
  } catch (err) {
    console.error(err);
    return errorResponse('저장 중 오류가 발생했습니다.', 500);
  }
}
