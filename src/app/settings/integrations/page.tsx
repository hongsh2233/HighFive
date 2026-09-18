'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './integrations.module.css';
import Spinner from '@/components/common/Spinner';

const GOOGLE_SHORTCUTS = [
  { key: 'calendar', label: '구글 캘린더', hint: '일정을 구글 캘린더와 자동 동기화합니다.', icon: '📅', iconBg: '#1A73E8', href: '/settings/calendar-sync' },
  // 구글 드라이브: 당장 안 쓰기로 해서 진입점만 숨김 (코드는 그대로 유지, 필요시 주석 해제)
  // { key: 'drive', label: '구글 드라이브', hint: '파일을 구글 드라이브에 저장하고 바로 열어봅니다.', icon: '📁', iconBg: '#0F9D58', href: '/settings/drive' },
];

type Channel = 'SLACK' | 'JANDI' | 'TEAMS' | 'TELEGRAM' | 'KAKAO';

interface IntegrationConfig {
  channel: Channel;
  webhookUrl: string | null;
  botToken: string | null;
  chatId: string | null;
  isEnabled: boolean;
  updatedAt: string | null;
}

const CHANNEL_META: Record<Channel, { label: string; fields: ('webhookUrl' | 'botToken' | 'chatId')[]; hint: string; icon: string; iconBg: string }> = {
  SLACK: { label: 'Slack', fields: ['webhookUrl'], hint: 'Slack Incoming Webhook URL을 입력하세요.', icon: '💬', iconBg: '#4A154B' },
  JANDI: { label: '잔디', fields: ['webhookUrl'], hint: '잔디 Incoming Webhook URL을 입력하세요.', icon: '🟢', iconBg: '#00C4B3' },
  TEAMS: { label: 'Microsoft Teams', fields: ['webhookUrl'], hint: 'Teams 채널의 Incoming Webhook URL을 입력하세요.', icon: '👥', iconBg: '#5B5FC7' },
  TELEGRAM: { label: '텔레그램', fields: ['botToken', 'chatId'], hint: '봇 토큰과 메시지를 받을 채팅방(chat id)을 입력하세요.', icon: '✈️', iconBg: '#229ED9' },
  KAKAO: { label: '카카오톡', fields: ['webhookUrl'], hint: '카카오톡 알림 발송용 Webhook URL을 입력하세요.', icon: '💛', iconBg: '#FEE500' },
};

const FIELD_LABEL: Record<string, string> = {
  webhookUrl: 'Webhook URL',
  botToken: '봇 토큰',
  chatId: 'Chat ID',
};

export default function IntegrationsSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Channel | null>(null);
  const [testing, setTesting] = useState<Channel | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Channel | null>(null);

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
    if (!authLoading && user) fetchConfigs();
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
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (!user) {
    return <div className={styles.loading}>로그인이 필요합니다.</div>;
  }

  if ((user as any).role !== 'ADMIN') {
    return <div className={styles.loading}>관리자만 접근할 수 있는 페이지입니다.</div>;
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

        <div className={styles.grid}>
          {GOOGLE_SHORTCUTS.map((g) => (
            <div key={g.key} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardIcon} style={{ background: g.iconBg }}>{g.icon}</span>
                <div className={styles.cardTopText}>
                  <h2 className={styles.cardTitle}>{g.label}</h2>
                  <p className={styles.cardHint}>{g.hint}</p>
                </div>
                <button type="button" onClick={() => router.push(g.href)} className={styles.btnConnect}>
                  바로가기
                </button>
              </div>
            </div>
          ))}
          {configs.map((config) => {
            const meta = CHANNEL_META[config.channel];
            const isOpen = expanded === config.channel;
            return (
              <div key={config.channel} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon} style={{ background: meta.iconBg }}>{meta.icon}</span>
                  <div className={styles.cardTopText}>
                    <h2 className={styles.cardTitle}>{meta.label}</h2>
                    <p className={styles.cardHint}>{meta.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : config.channel)}
                    className={config.isEnabled ? styles.btnConnected : styles.btnConnect}
                  >
                    {config.isEnabled ? '연동됨' : '연동하기'}
                  </button>
                </div>

                {isOpen && (
                  <div className={styles.cardExpanded}>
                    <label className={styles.enableToggle}>
                      <input
                        type="checkbox"
                        checked={config.isEnabled}
                        onChange={(e) => updateField(config.channel, 'isEnabled', e.target.checked)}
                      />
                      이 채널 사용
                    </label>

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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
