'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './ai.module.css';
import Spinner from '@/components/common/Spinner';

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
  hasWeatherKey: boolean;
  hasGithubToken: boolean;
  weatherCity: string | null;
  features: Record<string, boolean>;
  updatedAt: string | null;
}

export default function AiSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<AiSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
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

  const saveKeys = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: any = {};
      if (anthropicKeyInput.trim()) body.anthropicKey = anthropicKeyInput.trim();
      if (weatherKeyInput.trim()) body.weatherKey = weatherKeyInput.trim();
      if (githubTokenInput.trim()) body.githubToken = githubTokenInput.trim();
      body.weatherCity = weatherCityInput.trim() || null;
      const res = await apiClient.put<{ data: AiSettingsData }>('/settings/ai', body);
      setData(res.data.data);
      setAnthropicKeyInput('');
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

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (user?.role !== 'ADMIN') {
    return <div className={styles.loading}>관리자만 접근 가능합니다.</div>;
  }

  if (!data) return null;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>AI 설정</h1>
          <p className={styles.pageSubtitle}>API 키를 등록하고 기능별로 AI 자동화를 켜고 끌 수 있습니다.</p>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Anthropic API 키</h2>
          <p className={styles.cardHint}>
            {data.hasAnthropicKey ? '✅ 설정됨 — 교체하려면 새 키를 입력 후 저장하세요.' : '미설정 — AI 기능을 사용하려면 키를 입력하세요.'}
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
          <h2 className={styles.cardTitle}>날씨 API 키 (날씨 인사말용)</h2>
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
            const keyMissing = f.needsWeather ? !data.hasWeatherKey : !data.hasAnthropicKey;
            return (
              <div key={f.key} className={styles.featureCard}>
                <div>
                  <h3 className={styles.featureTitle}>{f.label}</h3>
                  <p className={styles.featureHint}>{f.hint}</p>
                  {keyMissing && !enabled && (
                    <p className={styles.featureWarn}>
                      {f.needsWeather ? '날씨 API 키/도시를 먼저 설정하세요.' : 'Anthropic API 키를 먼저 설정하세요.'}
                    </p>
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
      </div>
    </div>
  );
}
