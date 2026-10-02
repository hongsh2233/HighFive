'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './integrations.module.css';
import Spinner from '@/components/common/Spinner';
import { Modal } from '@/components/common/Modal';

// 구글 캘린더 연동은 개인 메뉴(사용자 이름 클릭 → 캘린더 연동)로 이동함(라운드 4).
// 구글 드라이브: 당장 안 쓰기로 해서 진입점 자체를 두지 않음(코드는 src/app/settings/drive/ 유지, 필요시 재노출).

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

interface ServiceKeyProject { project: { id: number; name: string } }
interface ServiceKey {
  id: number;
  name: string;
  keyPrefix: string;
  permissions: string;
  allowOrgWide: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: { id: number; name: string };
  projects: ServiceKeyProject[];
}
interface ProjectOption { id: number; name: string }

export default function IntegrationsSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Channel | null>(null);
  const [testing, setTesting] = useState<Channel | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Channel | null>(null);

  // 서비스 API 키(JIA 등 외부 연동) 관리
  const [serviceKeys, setServiceKeys] = useState<ServiceKey[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [keyFormOpen, setKeyFormOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyAllowComment, setKeyAllowComment] = useState(false);
  const [keyAllowOrgWide, setKeyAllowOrgWide] = useState(false);
  const [keyProjectIds, setKeyProjectIds] = useState<number[]>([]);
  const [keyExpiresAt, setKeyExpiresAt] = useState('');
  const [issuingKey, setIssuingKey] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const fetchServiceKeys = async () => {
    try {
      const res = await apiClient.get<{ data: ServiceKey[] }>('/settings/service-keys');
      setServiceKeys(res.data.data);
    } catch {
      // 조용히 무시(웹훅 설정 조회 실패와 별개 영역이라 전체 페이지를 막지 않음)
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get<{ data: { id: number; name: string }[] }>('/projects');
      setProjectOptions(res.data.data.map((p) => ({ id: p.id, name: p.name })));
    } catch {
      // 무시
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchConfigs();
      if ((user as any).role === 'ADMIN') {
        fetchServiceKeys();
        fetchProjects();
      }
    } else if (!authLoading) setLoading(false);
  }, [authLoading, user]);

  const toggleKeyProject = (id: number) => {
    setKeyProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleIssueKey = async () => {
    if (!keyName.trim()) {
      setKeyMessage({ type: 'error', text: '키 이름을 입력해주세요.' });
      return;
    }
    if (!keyAllowOrgWide && keyProjectIds.length === 0) {
      setKeyMessage({ type: 'error', text: '접근을 허용할 프로젝트를 1개 이상 선택하거나, 조직 전체 읽기를 선택해주세요.' });
      return;
    }
    setIssuingKey(true);
    setKeyMessage(null);
    try {
      const permissions = ['READ', ...(keyAllowComment ? ['COMMENT_CREATE'] : [])];
      const res = await apiClient.post<{ data: { apiKey: string } }>('/settings/service-keys', {
        name: keyName.trim(),
        permissions,
        allowOrgWide: keyAllowOrgWide,
        projectIds: keyAllowOrgWide ? [] : keyProjectIds,
        expiresAt: keyExpiresAt || null,
      });
      setIssuedKey(res.data.data.apiKey);
      setKeyFormOpen(false);
      setKeyName('');
      setKeyAllowComment(false);
      setKeyAllowOrgWide(false);
      setKeyProjectIds([]);
      setKeyExpiresAt('');
      await fetchServiceKeys();
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: err.response?.data?.message || '키 발급에 실패했습니다.' });
    } finally {
      setIssuingKey(false);
    }
  };

  const handleRevokeKey = async (key: ServiceKey) => {
    if (!confirm(`"${key.name}" 키를 즉시 회수하시겠습니까? 회수 후에는 이 키로 들어오는 모든 요청이 즉시 거부됩니다.`)) return;
    try {
      await apiClient.patch(`/settings/service-keys/${key.id}`, { revoke: true });
      setKeyMessage({ type: 'success', text: `"${key.name}" 키가 회수되었습니다.` });
      await fetchServiceKeys();
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: err.response?.data?.message || '회수에 실패했습니다.' });
    }
  };

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

        {(user as any).role === 'ADMIN' && (
          <div className={styles.serviceKeySection}>
            <div className={styles.pageHeader}>
              <h2 className={styles.cardTitle}>서비스 API 키 (JIA 등 외부 연동)</h2>
              <p className={styles.pageSubtitle}>외부 서비스가 서버 간 인증으로 업무/프로젝트를 조회하거나 댓글을 작성할 때 사용하는 키입니다. 평문 키는 발급 시 한 번만 확인할 수 있습니다.</p>
            </div>

            {keyMessage && (
              <div className={`${styles.message} ${keyMessage.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
                {keyMessage.text}
              </div>
            )}

            <div className={styles.keyList}>
              {serviceKeys.length === 0 && <p className={styles.cardHint}>발급된 서비스 API 키가 없습니다.</p>}
              {serviceKeys.map((key) => {
                const revoked = !!key.revokedAt;
                const expired = key.expiresAt ? new Date(key.expiresAt) < new Date() : false;
                return (
                  <div key={key.id} className={styles.keyRow}>
                    <div className={styles.keyRowMain}>
                      <span className={styles.keyName}>{key.name}</span>
                      <code className={styles.keyPrefix}>{key.keyPrefix}…</code>
                      {revoked && <span className={styles.keyBadgeRevoked}>회수됨</span>}
                      {!revoked && expired && <span className={styles.keyBadgeRevoked}>만료됨</span>}
                      {!revoked && !expired && <span className={styles.keyBadgeActive}>사용 중</span>}
                    </div>
                    <div className={styles.keyRowMeta}>
                      <span>권한: {key.permissions.split(',').join(', ')}</span>
                      <span>범위: {key.allowOrgWide ? '조직 전체' : (key.projects.map((p) => p.project.name).join(', ') || '(선택된 프로젝트 없음)')}</span>
                      <span>만료: {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString('ko-KR') : '없음'}</span>
                      <span>최근 사용: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('ko-KR') : '없음'}</span>
                    </div>
                    {!revoked && (
                      <button type="button" onClick={() => handleRevokeKey(key)} className={styles.btnRevoke}>즉시 회수</button>
                    )}
                  </div>
                );
              })}
            </div>

            {!keyFormOpen ? (
              <button type="button" onClick={() => setKeyFormOpen(true)} className={styles.btnConnect}>+ 새 서비스 키 발급</button>
            ) : (
              <div className={styles.keyForm}>
                <div className={styles.fieldGrid}>
                  <div>
                    <label className={styles.label}>키 이름</label>
                    <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="예: JIA 연동" className={styles.input} />
                  </div>
                  <div>
                    <label className={styles.label}>만료일(선택)</label>
                    <input type="date" value={keyExpiresAt} onChange={(e) => setKeyExpiresAt(e.target.value)} className={styles.input} />
                  </div>
                </div>

                <label className={styles.enableToggle}>
                  <input type="checkbox" checked={keyAllowComment} onChange={(e) => setKeyAllowComment(e.target.checked)} />
                  댓글 작성(COMMENT_CREATE) 권한도 부여 — 체크하지 않으면 조회(READ)만 가능
                </label>

                <label className={styles.enableToggle}>
                  <input type="checkbox" checked={keyAllowOrgWide} onChange={(e) => setKeyAllowOrgWide(e.target.checked)} />
                  조직 전체 읽기 허용(선택한 프로젝트가 아니라 전체 프로젝트에 접근)
                </label>

                {!keyAllowOrgWide && (
                  <div>
                    <label className={styles.label}>접근 허용 프로젝트</label>
                    <div className={styles.projectCheckList}>
                      {projectOptions.map((p) => (
                        <label key={p.id} className={styles.projectCheckItem} data-checked={keyProjectIds.includes(p.id) ? 'true' : 'false'}>
                          <input type="checkbox" checked={keyProjectIds.includes(p.id)} onChange={() => toggleKeyProject(p.id)} />
                          {p.name}
                        </label>
                      ))}
                      {projectOptions.length === 0 && <span className={styles.cardHint}>선택 가능한 프로젝트가 없습니다.</span>}
                    </div>
                  </div>
                )}

                <div className={styles.cardActions}>
                  <button onClick={handleIssueKey} disabled={issuingKey} className={styles.btnSave}>{issuingKey ? '발급 중...' : '발급'}</button>
                  <button onClick={() => setKeyFormOpen(false)} className={styles.btnTest}>취소</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={!!issuedKey} onClose={() => setIssuedKey(null)} title="서비스 API 키가 발급되었습니다" maxWidth={520}>
        <p className={styles.cardHint}>이 평문 키는 지금만 확인할 수 있습니다. 안전한 곳에 복사해 보관한 뒤 창을 닫아주세요.</p>
        <div className={styles.issuedKeyBox}>
          <code>{issuedKey}</code>
          <button
            type="button"
            className={styles.btnTest}
            onClick={() => { if (issuedKey) navigator.clipboard.writeText(issuedKey); }}
          >
            복사
          </button>
        </div>
        <div className={styles.cardActions}>
          <button onClick={() => setIssuedKey(null)} className={styles.btnSave}>확인했습니다</button>
        </div>
      </Modal>
    </div>
  );
}
