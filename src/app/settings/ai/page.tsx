'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './ai.module.css';
import Spinner from '@/components/common/Spinner';

type LlmProvider = 'ANTHROPIC' | 'OPENAI' | 'GEMINI' | 'GROQ' | 'NVIDIA';

const PROVIDER_LABEL: Record<LlmProvider, string> = {
  ANTHROPIC: 'Anthropic (Claude)',
  OPENAI: 'OpenAI (GPT)',
  GEMINI: 'Google (Gemini)',
  GROQ: 'Groq',
  NVIDIA: 'NVIDIA NIM',
};

const FEATURE_META: { key: string; label: string; hint: string; needsWeather?: boolean }[] = [
  { key: 'meetingSummary', label: '회의록 자동요약', hint: '회의록 본문에서 액션아이템/결정사항을 요약합니다.' },
  { key: 'meetingToTask', label: '회의록 → 업무 변환', hint: '요약된 액션아이템을 업무로 바로 생성합니다.' },
  { key: 'workloadInsight', label: '담당자별 업무 부하 분석', hint: '팀원별 업무량을 분석해 재배정 인사이트를 제공합니다.' },
  { key: 'taskDraft', label: 'AI 업무 생성 보조', hint: '업무 제목만 입력하면 상세내용 초안을 작성합니다.' },
  { key: 'taskSummary', label: 'AI 업무 요약', hint: '업무 히스토리/댓글을 바탕으로 현황을 요약합니다.' },
  { key: 'aiSearch', label: 'AI 자연어 검색', hint: '자연어 질의에서 검색 키워드/필터를 추출합니다.' },
  { key: 'weeklyReport', label: 'AI 주간 보고서', hint: '이번 주 완료/진행 업무 기반 보고서를 생성합니다.' },
  { key: 'weatherGreeting', label: '날씨 기반 인사말', hint: '대시보드에 날씨 기반 인사 문구를 표시합니다.', needsWeather: true },
];

interface AiSettingsData {
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  hasNvidiaKey: boolean;
  hasWeatherKey: boolean;
  hasGithubToken: boolean;
  weatherCity: string | null;
  features: Record<string, boolean>;
  featureProviders: Partial<Record<string, LlmProvider>>;
  updatedAt: string | null;
}

export default function AiSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isFreePlan = ((user as any)?.organizationPlan ?? 'FREE') === 'FREE';
  const [data, setData] = useState<AiSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [nvidiaKeyInput, setNvidiaKeyInput] = useState('');
  const [weatherKeyInput, setWeatherKeyInput] = useState('');
  const [weatherCityInput, setWeatherCityInput] = useState('');
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get<{ data: AiSettingsData }>('/settings/ai');
      setData(res.data.data);
      setWeatherCityInput(res.data.data.weatherCity || '');
    } catch {
      setMessage({ type: 'error', text: '설정 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') fetchData();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user]);

  const availableProviders = (): LlmProvider[] => {
    if (!data) return [];
    const list: LlmProvider[] = [];
    if (data.hasAnthropicKey) list.push('ANTHROPIC');
    if (data.hasOpenaiKey) list.push('OPENAI');
    if (data.hasGeminiKey) list.push('GEMINI');
    if (data.hasGroqKey) list.push('GROQ');
    if (data.hasNvidiaKey && isFreePlan) list.push('NVIDIA');
    return list;
  };

  const saveKeys = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: any = {};
      if (anthropicKeyInput.trim()) body.anthropicKey = anthropicKeyInput.trim();
      if (openaiKeyInput.trim()) body.openaiKey = openaiKeyInput.trim();
      if (geminiKeyInput.trim()) body.geminiKey = geminiKeyInput.trim();
      if (groqKeyInput.trim()) body.groqKey = groqKeyInput.trim();
      if (nvidiaKeyInput.trim()) body.nvidiaKey = nvidiaKeyInput.trim();
      if (weatherKeyInput.trim()) body.weatherKey = weatherKeyInput.trim();
      if (githubTokenInput.trim()) body.githubToken = githubTokenInput.trim();
      body.weatherCity = weatherCityInput.trim() || null;
      const res = await apiClient.put<{ data: AiSettingsData }>('/settings/ai', body);
      setData(res.data.data);
      setAnthropicKeyInput('');
      setOpenaiKeyInput('');
      setGeminiKeyInput('');
      setGroqKeyInput('');
      setNvidiaKeyInput('');
      setWeatherKeyInput('');
      setGithubTokenInput('');
      setMessage({ type: 'success', text: 'API 키가 저장되었습니다.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 실패' });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (key: string, value: boolean) => {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const nextFeatures = { ...data.features, [key]: value };
      const res = await apiClient.put<{ data: AiSettingsData }>('/settings/ai', { features: nextFeatures });
      setData(res.data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '기능 토글에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const changeFeatureProvider = async (key: string, provider: LlmProvider) => {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const nextFeatureProviders = { ...data.featureProviders, [key]: provider };
      const res = await apiClient.put<{ data: AiSettingsData }>('/settings/ai', { featureProviders: nextFeatureProviders });
      setData(res.data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '프로바이더 변경에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (user?.role !== 'ADMIN') {
    return <div className={styles.loading}>관리자만 접근 가능합니다.</div>;
  }

  const providers = data ? availableProviders() : [];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>AI 설정</h1>
          <p className={styles.pageSubtitle}>사용할 AI 프로바이더(Anthropic/OpenAI/Gemini/Groq)의 API 키를 등록하고, 기능별로 어떤 프로바이더를 쓸지 선택할 수 있습니다.</p>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {!data && !message && <p className={styles.cardHint}>불러오는 중...</p>}

        {data && (
        <>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Anthropic API 키 (Claude)</h2>
          <p className={styles.cardHint}>
            {data.hasAnthropicKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — 사용하려면 키를 입력하세요.'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>API 키</label>
              <input
                type="password"
                value={anthropicKeyInput}
                onChange={(e) => setAnthropicKeyInput(e.target.value)}
                placeholder={data.hasAnthropicKey ? '새 키로 교체하려면 입력' : 'sk-ant-...'}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>OpenAI API 키 (GPT)</h2>
          <p className={styles.cardHint}>
            {data.hasOpenaiKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — 사용하려면 키를 입력하세요.'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>API 키</label>
              <input
                type="password"
                value={openaiKeyInput}
                onChange={(e) => setOpenaiKeyInput(e.target.value)}
                placeholder={data.hasOpenaiKey ? '새 키로 교체하려면 입력' : 'sk-...'}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Google API 키 (Gemini)</h2>
          <p className={styles.cardHint}>
            {data.hasGeminiKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — 사용하려면 키를 입력하세요.'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>API 키</label>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={data.hasGeminiKey ? '새 키로 교체하려면 입력' : 'AIza...'}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {isFreePlan && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>NVIDIA NIM API 키 <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>무료 플랜 전용</span></h2>
          <p className={styles.cardHint}>
            {data.hasNvidiaKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — build.nvidia.com에서 무료 API 키를 발급받아 입력하세요.'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>API 키</label>
              <input
                type="password"
                value={nvidiaKeyInput}
                onChange={(e) => setNvidiaKeyInput(e.target.value)}
                placeholder={data.hasNvidiaKey ? '새 키로 교체하려면 입력' : 'nvapi-...'}
                className={styles.input}
              />
            </div>
          </div>
        </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Groq API 키</h2>
          <p className={styles.cardHint}>
            {data.hasGroqKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — 사용하려면 키를 입력하세요. (console.groq.com에서 발급)'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>API 키</label>
              <input
                type="password"
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
                placeholder={data.hasGroqKey ? '새 키로 교체하려면 입력' : 'gsk_...'}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>날씨 API 키 (날씨 인사말용)</h2>
          <p className={styles.cardHint}>
            OpenWeatherMap(openweathermap.org) API 키를 사용합니다. 해당 사이트에서 무료로 발급받을 수 있습니다.
          </p>
          <p className={styles.cardHint}>
            {data.hasWeatherKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — 날씨 인사말 기능을 사용하려면 키와 도시를 입력하세요.'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>API 키</label>
              <input
                type="password"
                value={weatherKeyInput}
                onChange={(e) => setWeatherKeyInput(e.target.value)}
                placeholder={data.hasWeatherKey ? '새 키로 교체하려면 입력' : '날씨 API 키'}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>기본 도시</label>
              <input
                type="text"
                value={weatherCityInput}
                onChange={(e) => setWeatherCityInput(e.target.value)}
                placeholder="예: Seoul"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>GitHub 연동 (완료 코멘트 자동 발송)</h2>
          <p className={styles.cardHint}>
            {data.hasGithubToken
              ? '✅ 설정됨 — 교체하려면 새 토큰을 입력 후 저장하세요.'
              : '미설정 — 업무 완료 시 연결된 PR/이슈에 자동으로 완료 코멘트를 남기려면 Personal Access Token(issues 쓰기 권한)을 입력하세요.'}
          </p>
          <div className={styles.fieldGrid}>
            <div>
              <label className={styles.label}>Personal Access Token</label>
              <input
                type="password"
                value={githubTokenInput}
                onChange={(e) => setGithubTokenInput(e.target.value)}
                placeholder={data.hasGithubToken ? '새 토큰으로 교체하려면 입력' : 'ghp_...'}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.cardActions}>
          <button onClick={saveKeys} disabled={saving} className={styles.btnSave}>
            {saving ? '저장 중...' : 'API 키 저장'}
          </button>
          {data.updatedAt && (
            <span className={styles.updatedAt}>최근 저장: {new Date(data.updatedAt).toLocaleString('ko-KR')}</span>
          )}
        </div>

        <h2 className={styles.sectionTitle}>기능별 활성화</h2>
        <div className={styles.list}>
          {FEATURE_META.map((f) => {
            const enabled = !!data.features[f.key];
            const keyMissing = f.needsWeather ? !data.hasWeatherKey : providers.length === 0;
            const selectedProvider = (data.featureProviders[f.key] as LlmProvider | undefined) || providers[0];
            return (
              <div key={f.key} className={styles.featureCard}>
                <div>
                  <h3 className={styles.featureTitle}>{f.label}</h3>
                  <p className={styles.featureHint}>{f.hint}</p>
                  {keyMissing && !enabled && (
                    <p className={styles.featureWarn}>
                      {f.needsWeather ? '날씨 API 키/도시를 먼저 설정하세요.' : 'API 키를 먼저 설정하세요.'}
                    </p>
                  )}
                  {!f.needsWeather && !keyMissing && (
                    <select
                      value={selectedProvider}
                      onChange={(e) => changeFeatureProvider(f.key, e.target.value as LlmProvider)}
                      disabled={saving}
                      className={styles.input}
                      style={{ marginTop: 6, maxWidth: 220 }}
                    >
                      {providers.map((p) => (
                        <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
                      ))}
                    </select>
                  )}
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={saving || (keyMissing && !enabled)}
                    onChange={(e) => toggleFeature(f.key, e.target.checked)}
                  />
                  사용
                </label>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
