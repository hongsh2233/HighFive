'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './integrations.module.css';

type Channel = 'SLACK' | 'JANDI' | 'TEAMS' | 'TELEGRAM' | 'KAKAO';

interface IntegrationConfig {
  channel: Channel;
  webhookUrl: string | null;
  botToken: string | null;
  chatId: string | null;
  isEnabled: boolean;
  updatedAt: string | null;
}

const CHANNEL_META: Record<Channel, { label: string; fields: ('webhookUrl' | 'botToken' | 'chatId')[]; hint: string }> = {
  SLACK: { label: 'Slack', fields: ['webhookUrl'], hint: 'Slack Incoming Webhook URL을 입력하세요.' },
  JANDI: { label: '잔디', fields: ['webhookUrl'], hint: '잔디 Incoming Webhook URL을 입력하세요.' },
  TEAMS: { label: 'Microsoft Teams', fields: ['webhookUrl'], hint: 'Teams 채널의 Incoming Webhook URL을 입력하세요.' },
  TELEGRAM: { label: '텔레그램', fields: ['botToken', 'chatId'], hint: '봇 토큰과 메시지를 받을 채팅방(chat id)을 입력하세요.' },
  KAKAO: { label: '카카오톡', fields: ['webhookUrl'], hint: '카카오톡 알림 발송용 Webhook URL을 입력하세요.' },
};

const FIELD_LABEL: Record<string, string> = {
  webhookUrl: 'Webhook URL',
  botToken: '봇 토큰',
  chatId: 'Chat ID',
};

export default function IntegrationsSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Channel | null>(null);
  const [testing, setTesting] = useState<Channel | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfigs = async () => {
    try {
      const res = await apiClient.get<{ data: IntegrationConfig[] }>('/settings/integrations');
      setConfigs(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '설정 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') fetchConfigs();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user]);

  const updateField = (channel: Channel, field: keyof IntegrationConfig, value: any) => {
    setConfigs((prev) => prev.map((c) => (c.channel === channel ? { ...c, [field]: value } : c)));
  };

  const handleSave = async (config: IntegrationConfig) => {
    setSaving(config.channel);
    setMessage(null);
    try {
      await apiClient.put(`/settings/integrations/${config.channel}`, {
        webhookUrl: config.webhookUrl,
        botToken: config.botToken,
        chatId: config.chatId,
        isEnabled: config.isEnabled,
      });
      setMessage({ type: 'success', text: `${CHANNEL_META[config.channel].label} 설정이 저장되었습니다.` });
      await fetchConfigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 실패' });
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (config: IntegrationConfig) => {
    setTesting(config.channel);
    setMessage(null);
    try {
      await apiClient.post(`/settings/integrations/${config.channel}/test`, {
        webhookUrl: config.webhookUrl,
        botToken: config.botToken,
        chatId: config.chatId,
      });
      setMessage({ type: 'success', text: `${CHANNEL_META[config.channel].label}로 테스트 메시지를 발송했습니다.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '테스트 발송 실패' });
    } finally {
      setTesting(null);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (user?.role !== 'ADMIN') {
    return <div className={styles.loading}>관리자만 접근 가능합니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>외부연동</h1>
          <p className={styles.pageSubtitle}>업무 상태가 변경될 때 알림을 보낼 채널을 설정합니다.</p>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.list}>
          {configs.map((config) => {
            const meta = CHANNEL_META[config.channel];
            return (
              <div key={config.channel} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>{meta.label}</h2>
                    <p className={styles.cardHint}>{meta.hint}</p>
                  </div>
                  <label className={styles.enableToggle}>
                    <input
                      type="checkbox"
                      checked={config.isEnabled}
                      onChange={(e) => updateField(config.channel, 'isEnabled', e.target.checked)}
                    />
                    사용
                  </label>
                </div>

                <div className={styles.fieldGrid}>
                  {meta.fields.map((field) => (
                    <div key={field}>
                      <label className={styles.label}>{FIELD_LABEL[field]}</label>
                      <input
                        type="text"
                        value={(config as any)[field] || ''}
                        onChange={(e) => updateField(config.channel, field, e.target.value)}
                        placeholder={FIELD_LABEL[field]}
                        className={styles.input}
                      />
                    </div>
                  ))}
                </div>

                <div className={styles.cardActions}>
                  <button onClick={() => handleSave(config)} disabled={saving === config.channel} className={styles.btnSave}>
                    {saving === config.channel ? '저장 중...' : '저장'}
                  </button>
                  <button onClick={() => handleTest(config)} disabled={testing === config.channel} className={styles.btnTest}>
                    {testing === config.channel ? '발송 중...' : '테스트 발송'}
                  </button>
                  {config.updatedAt && (
                    <span className={styles.updatedAt}>최근 저장: {new Date(config.updatedAt).toLocaleString('ko-KR')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
