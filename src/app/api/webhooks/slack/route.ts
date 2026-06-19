import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils';
import { notifyStatusChange } from '@/lib/services/webhook.service';

// POST /api/webhooks/slack — 내부 서비스에서 Slack 알림 발송 요청
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, taskTitle, workerName, status, taskUrl } = body;

    if (!taskId || !taskTitle || !workerName || !status) {
      return errorResponse('필수 항목이 누락되었습니다.', 400, 'VALID_400');
    }

    const results = await notifyStatusChange({ taskId, taskTitle, workerName, status, taskUrl });
    return successResponse(results, '알림 발송 처리 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('알림 발송 중 오류가 발생했습니다.', 500, 'WEBHOOK_500');
  }
}
