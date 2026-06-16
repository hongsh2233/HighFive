import axios from 'axios';

interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

interface WebhookPayload {
  taskId: number;
  taskTitle: string;
  status: string;
  workerName: string;
  plannerName: string;
  taskUrl: string;
}

// Slack Webhook 발송
export async function sendSlackNotification(payload: WebhookPayload) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured');
    return;
  }

  try {
    const message = buildSlackMessage(payload);
    await axios.post(webhookUrl, message);
    console.log(`✅ Slack notification sent for task ${payload.taskId}`);
  } catch (err) {
    console.error('❌ Failed to send Slack notification:', err);
  }
}

// Jandi Webhook 발송
export async function sendJandiNotification(payload: WebhookPayload) {
  const webhookUrl = process.env.JANDI_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('JANDI_WEBHOOK_URL not configured');
    return;
  }

  try {
    const message = buildJandiMessage(payload);
    await axios.post(webhookUrl, message);
    console.log(`✅ Jandi notification sent for task ${payload.taskId}`);
  } catch (err) {
    console.error('❌ Failed to send Jandi notification:', err);
  }
}

// Slack 메시지 포맷
function buildSlackMessage(payload: WebhookPayload): SlackMessage {
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

  return {
    text: `
${statusEmoji[payload.status] || '📝'} *[${statusText[payload.status]}]* 업무 상태 변경

*${payload.taskTitle}*
담당자: ${payload.workerName}
기획자: ${payload.plannerName}

<${payload.taskUrl}|업무 상세 보기>
    `.trim(),
    username: 'TMS Bot',
    icon_emoji: ':clipboard:',
  };
}

// Jandi 메시지 포맷
function buildJandiMessage(payload: WebhookPayload) {
  const statusText: { [key: string]: string } = {
    ASSIGNED: '배정됨',
    PROGRESS: '진행중',
    REVIEW: '검수 요청',
    QA: 'QA 중',
    DONE: '완료',
  };

  return {
    body: `[${statusText[payload.status]}] ${payload.taskTitle}`,
    connectInfo: {
      commandName: 'TMS',
    },
    author: {
      name: 'TMS Bot',
    },
  };
}

// 카카오톡 알림 발송
export async function sendKakaoNotification(payload: WebhookPayload) {
  const webhookUrl = process.env.KAKAO_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('KAKAO_WEBHOOK_URL not configured');
    return;
  }

  try {
    const message = buildKakaoMessage(payload);
    await axios.post(webhookUrl, message);
    console.log(`✅ Kakao notification sent for task ${payload.taskId}`);
  } catch (err) {
    console.error('❌ Failed to send Kakao notification:', err);
  }
}

// 카카오톡 메시지 포맷
function buildKakaoMessage(payload: WebhookPayload) {
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

  return {
    object_type: 'text',
    text: `${statusEmoji[payload.status] || '📝'} [${statusText[payload.status]}] ${payload.taskTitle}\n\n담당자: ${payload.workerName}\n기획자: ${payload.plannerName}\n\n${payload.taskUrl}`,
    link: {
      web_url: payload.taskUrl,
      mobile_web_url: payload.taskUrl,
    },
    button_title: '업무 상세 보기',
  };
}

// 상태 변경 시 알림 발송
export async function notifyStatusChange(payload: WebhookPayload) {
  // Slack, Jandi, 카카오톡 동시에 발송 (비동기)
  Promise.all([
    sendSlackNotification(payload),
    sendJandiNotification(payload),
    sendKakaoNotification(payload),
  ]).catch((err) => console.error('Webhook notification error:', err));
}
