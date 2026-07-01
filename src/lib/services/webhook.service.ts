import { prisma } from '@/lib/db';
import { getWebhookUrl } from '@/lib/integrations';

export interface WebhookPayload {
  taskId: number;
  taskTitle: string;
  workerName: string;
  plannerName?: string;
  status: string;
  taskUrl?: string;
}

function buildMessage(payload: WebhookPayload): string {
  const statusMessages: Record<string, string> = {
    REVIEW:         `📢 [검수요청] ${payload.workerName}님이 '${payload.taskTitle}' 건의 검수를 요청했습니다.`,
    DONE:           `✅ [완료] '${payload.taskTitle}' 업무가 완료되었습니다.`,
    QA:             `🔍 [QA] '${payload.taskTitle}' 업무가 QA 단계로 이동했습니다.`,
    WORKER_CHANGED: `🔀 [담당자변경] '${payload.taskTitle}' 담당자가 ${payload.workerName}으로 변경되었습니다.`,
  };
  const message = statusMessages[payload.status] ?? `🔔 '${payload.taskTitle}' 상태가 ${payload.status}로 변경되었습니다.`;
  return payload.taskUrl ? `${message}\n👉 ${payload.taskUrl}` : message;
}

async function sendToChannel(url: string, message: string, channel: 'SLACK' | 'JANDI') {
  const body = channel === 'SLACK'
    ? { text: message }
    : { body: message, connectColor: '#1A56DB', connectInfo: [] };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function notifyStatusChange(payload: WebhookPayload) {
  const message = buildMessage(payload);
  const results: Array<{ channel: string; success: boolean }> = [];

  const slackUrl = await getWebhookUrl('SLACK');
  if (slackUrl) {
    const success = await sendToChannel(slackUrl, message, 'SLACK').catch(() => false);
    results.push({ channel: 'SLACK', success });
    await prisma.notification.create({
      data: { taskId: payload.taskId, channel: 'SLACK', message, isSuccess: success },
    });
  }

  const jandiUrl = await getWebhookUrl('JANDI');
  if (jandiUrl) {
    const success = await sendToChannel(jandiUrl, message, 'JANDI').catch(() => false);
    results.push({ channel: 'JANDI', success });
    await prisma.notification.create({
      data: { taskId: payload.taskId, channel: 'JANDI', message, isSuccess: success },
    });
  }

  return results;
}
