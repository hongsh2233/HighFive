import { broadcastNotification } from './integrations';

interface WebhookPayload {
  taskId: number;
  taskTitle: string;
  status: string;
  workerName: string;
  registrantName: string;
  taskUrl: string;
}

const statusEmoji: { [key: string]: string } = {
  ASSIGNED: '📋',
  PROGRESS: '🔄',
  REVIEW: '👀',
  QA: '✅',
  DONE: '✔️',
};

const statusText: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수 요청',
  QA: 'QA 중',
  DONE: '완료',
};

function buildMessage(payload: WebhookPayload): string {
  const emoji = statusEmoji[payload.status] || '📝';
  const label = statusText[payload.status] || payload.status;
  return `${emoji} [${label}] ${payload.taskTitle}\n담당자: ${payload.workerName}\n등록자: ${payload.registrantName}`;
}

// 상태 변경 시 연동된 외부 채널(Slack/Jandi/Teams/Telegram/카카오톡)에 동시 발송
export async function notifyStatusChange(payload: WebhookPayload) {
  const message = buildMessage(payload);
  return broadcastNotification(message, payload.taskUrl).catch((err) => {
    console.error('Webhook notification error:', err);
    return [];
  });
}
