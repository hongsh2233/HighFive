'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './calendar-sync.module.css';
import Spinner from '@/components/common/Spinner';

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
}

export default function CalendarSyncPage() {
  return (
    <Suspense fallback={<div className={styles.loadingPage}><Spinner /></div>}>
      <CalendarSyncContent />
    </Suspense>
  );
}

function CalendarSyncContent() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<'connected' | 'error' | null>(null);

  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (googleParam === 'connected' || googleParam === 'error') {
      setOauthNotice(googleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    apiClient.get<{ data: GoogleStatus }>('/auth/google/status')
      .then(res => setGoogleStatus(res.data.data))
      .catch(() => setGoogleStatus({ configured: false, connected: false, connectedAt: null }))
      .finally(() => setGoogleLoading(false));
  }, [authLoading]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const res = await apiClient.get<{ data: { url: string } }>('/calendar/ical-url');
      setUrl(res.data.data.url);
    } catch {
      setError('구독 URL 발급 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('복사에 실패했습니다.');
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = '/api/auth/google/authorize';
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm('Google 캘린더 연동을 해제하시겠습니까? 생성된 이벤트 매핑 정보가 삭제됩니다.')) return;
    setDisconnecting(true);
    try {
      await apiClient.delete('/auth/google/disconnect');
      setGoogleStatus(prev => prev ? { ...prev, connected: false, connectedAt: null } : prev);
    } catch {
      setError('연동 해제 중 오류가 발생했습니다.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (authLoading) {
    return <div className={styles.loadingPage}><Spinner /></div>;
  }

  if (!user) {
    return (
      <div className={styles.loadingPage}>
        <p className={styles.dangerText}>로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>구글 캘린더 연동</h1>
      <p className={styles.subtitle}>
        내 업무의 목표일과 승인된 휴가 일정을 Google Calendar에서 확인할 수 있습니다.
      </p>

      {error && <div className={styles.errorBox}>{error}</div>}
      {oauthNotice === 'connected' && <div className={styles.successBox}>Google 캘린더가 연동되었습니다.</div>}
      {oauthNotice === 'error' && <div className={styles.errorBox}>Google 캘린더 연동에 실패했습니다. 다시 시도해주세요.</div>}

      {/* 실시간 연동 (OAuth, 권장) */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>실시간 연동 (권장)</h2>
        <p className={styles.cardDesc}>
          Google 계정을 연결하면 업무 등록/수정/삭제, 휴가 승인이 실시간으로 내 Google 캘린더에 반영됩니다.
          (구글 → High5 방향 반영은 지원하지 않습니다. Google Calendar에서 직접 수정한 내용은 High5에 반영되지 않습니다.)
        </p>

        {googleLoading ? (
          <Spinner />
        ) : !googleStatus?.configured ? (
          <p className={styles.hintMuted}>실시간 연동은 아직 준비 중입니다.</p>
        ) : googleStatus.connected ? (
          <div className={styles.connectedRow}>
            <span className={styles.connectedBadge}>✅ 연동됨</span>
            <button onClick={handleGoogleDisconnect} disabled={disconnecting} className={styles.btnDisconnect}>
              {disconnecting ? '해제 중...' : '연동 해제'}
            </button>
          </div>
        ) : (
          <button onClick={handleGoogleConnect} className={styles.btnGenerate}>
            Google 계정 연결
          </button>
        )}
      </div>

      {/* 구독 URL 방식 (대안, 반영 지연) */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>대안: 구독 URL 방식</h2>
        <p className={styles.cardDesc}>
          Google 계정 연결 없이도 사용할 수 있지만, 반영까지 최대 몇 시간이 걸릴 수 있습니다.
          아래 버튼을 눌러 나만의 구독 URL을 발급받으세요. URL에는 본인 인증 토큰이 포함되어 있으니 타인에게 공유하지 마세요.
        </p>
        <button onClick={handleGenerate} disabled={loading} className={styles.btnGenerate}>
          {loading ? '발급 중...' : url ? 'URL 다시 발급' : '구독 URL 발급'}
        </button>

        {url && (
          <div className={styles.urlRow}>
            <input type="text" readOnly value={url} className={styles.urlInput} onFocus={(e) => e.target.select()} />
            <button onClick={handleCopy} className={styles.btnCopy}>
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        )}

        <ol className={styles.stepList}>
          <li>Google Calendar 웹 화면 좌측의 <strong>다른 캘린더</strong> 옆 <strong>+</strong> 버튼을 클릭합니다.</li>
          <li><strong>URL로 추가</strong>를 선택합니다.</li>
          <li>위에서 복사한 구독 URL을 붙여넣고 <strong>캘린더 추가</strong>를 클릭합니다.</li>
        </ol>
      </div>
    </div>
  );
}
