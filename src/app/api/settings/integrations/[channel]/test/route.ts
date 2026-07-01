import { NextRequest } from 'next/server';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { INTEGRATION_CHANNELS, IntegrationChannel, sendTestMessage } from '@/lib/integrations';

function isValidChannel(channel: string): channel is IntegrationChannel {
  return (INTEGRATION_CHANNELS as readonly string[]).includes(channel);
}

// POST /api/settings/integrations/[channel]/test - 테스트 메시지 발송 (ADMIN 전용, 저장 전 값으로도 테스트 가능)
export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { channel } = await params;
    if (!isValidChannel(channel)) {
      return errorResponse('유효하지 않은 채널입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { webhookUrl, botToken, chatId } = body;

    const success = await sendTestMessage(channel, { webhookUrl, botToken, chatId });

    if (!success) {
      return errorResponse('테스트 발송에 실패했습니다. 설정값을 확인해주세요.', 400, 'INTEGRATION_TEST_FAILED');
    }

    return successResponse(null, '테스트 메시지를 발송했습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('테스트 발송 중 오류가 발생했습니다.', 500);
  }
}
