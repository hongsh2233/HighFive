import axios from 'axios';
import { prisma } from './db';

export const INTEGRATION_CHANNELS = ['SLACK', 'JANDI', 'TEAMS', 'TELEGRAM', 'KAKAO'] as const;
export type IntegrationChannel = (typeof INTEGRATION_CHANNELS)[number];

interface ResolvedConfig {
  channel: IntegrationChannel;
  webhookUrl: string | null;
  botToken: string | null;
  chatId: string | null;
}

const ENV_WEBHOOK_URL: Partial<Record<IntegrationChannel, string | undefined>> = {
  SLACK: process.env.SLACK_WEBHOOK_URL,
  JANDI: process.env.JANDI_WEBHOOK_URL,
  KAKAO: process.env.KAKAO_WEBHOOK_URL,
};

// DB에 저장된 설정을 우선 사용하고, 저장된 적이 없는 채널은 .env 값으로 폴백한다.
async function resolveConfig(channel: IntegrationChannel, organizationId?: number): Promise<ResolvedConfig | null> {
  const row = organizationId
    ? await prisma.integration.findUnique({ where: { organizationId_channel: { organizationId, channel } } })
    : await prisma.integration.findFirst({ where: { channel } });

  if (row) {
    if (!row.isEnabled) return null;
    return { channel, webhookUrl: row.webhookUrl, botToken: row.botToken, chatId: row.chatId };
  }

  const envUrl = ENV_WEBHOOK_URL[channel];
  if (envUrl) {
    return {
      channel,
      webhookUrl: envUrl,
      botToken: channel === 'KAKAO' ? process.env.KAKAO_ACCESS_TOKEN || null : null,
      chatId: null,
    };
  }

  return null;
}

export async function getWebhookUrl(channel: IntegrationChannel, organizationId?: number): Promise<string | null> {
  const cfg = await resolveConfig(channel, organizationId);
  return cfg?.webhookUrl ?? null;
}

async function dispatch(channel: IntegrationChannel, cfg: ResolvedConfig, text: string, taskUrl?: string) {
  switch (channel) {
    case 'SLACK':
      if (!cfg.webhookUrl) return false;
      await axios.post(cfg.webhookUrl, { text, username: 'High5 Bot' });
      return true;
    case 'JANDI':
      if (!cfg.webhookUrl) return false;
      await axios.post(cfg.webhookUrl, { body: text, connectColor: '#5E6AD2', connectInfo: [] });
      return true;
    case 'TEAMS':
      if (!cfg.webhookUrl) return false;
      await axios.post(cfg.webhookUrl, {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: text.slice(0, 100),
        text,
      });
      return true;
    case 'TELEGRAM':
      if (!cfg.botToken || !cfg.chatId) return false;
      await axios.post(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        chat_id: cfg.chatId,
        text,
      });
      return true;
    case 'KAKAO':
      if (!cfg.webhookUrl) return false;
      await axios.post(cfg.webhookUrl, {
        object_type: 'text',
        text,
        link: taskUrl ? { web_url: taskUrl, mobile_web_url: taskUrl } : undefined,
      });
      return true;
    default:
      return false;
  }
}

export async function sendToChannel(channel: IntegrationChannel, text: string, taskUrl?: string, organizationId?: number): Promise<boolean> {
  const cfg = await resolveConfig(channel, organizationId);
  if (!cfg) return false;
  try {
    return await dispatch(channel, cfg, text, taskUrl);
  } catch (err) {
    console.error(`[integrations] ${channel} 발송 실패:`, err);
    return false;
  }
}

export async function broadcastNotification(text: string, taskUrl?: string, organizationId?: number) {
  const message = taskUrl ? `${text}\n${taskUrl}` : text;
  const results = await Promise.all(
    INTEGRATION_CHANNELS.map(async (channel) => ({
      channel,
      success: await sendToChannel(channel, message, taskUrl, organizationId),
    }))
  );
  return results;
}

// 설정 화면에서 채널 저장 전/후 확인용 테스트 발송 (지정한 설정값을 그대로 사용, DB 저장 여부와 무관)
export async function sendTestMessage(
  channel: IntegrationChannel,
  cfg: { webhookUrl?: string | null; botToken?: string | null; chatId?: string | null }
): Promise<boolean> {
  const text = 'High5 외부연동 테스트 메시지입니다. 이 메시지가 보인다면 연동이 정상 동작합니다. ✅';
  try {
    return await dispatch(
      channel,
      { channel, webhookUrl: cfg.webhookUrl ?? null, botToken: cfg.botToken ?? null, chatId: cfg.chatId ?? null },
      text
    );
  } catch (err) {
    console.error(`[integrations] ${channel} 테스트 발송 실패:`, err);
    return false;
  }
}
