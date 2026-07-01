'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './calendar-sync.module.css';

export default function CalendarSyncPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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

  if (authLoading) {
    return <div className={styles.loadingPage}>로딩 중...</div>;
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
        내 업무의 목표일을 iCal 구독 URL로 발급해 Google Calendar에서 실시간으로 확인할 수 있습니다.
      </p>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>1. 구독 URL 발급</h2>
        <p className={styles.cardDesc}>
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
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>2. Google Calendar에 등록</h2>
        <ol className={styles.stepList}>
          <li>Google Calendar 웹 화면 좌측의 <strong>다른 캘린더</strong> 옆 <strong>+</strong> 버튼을 클릭합니다.</li>
          <li><strong>URL로 추가</strong>를 선택합니다.</li>
          <li>위에서 복사한 구독 URL을 붙여넣고 <strong>캘린더 추가</strong>를 클릭합니다.</li>
          <li>등록 후 목표일이 있는 업무가 Google Calendar에 자동으로 표시됩니다. (반영까지 최대 몇 시간 소요될 수 있습니다.)</li>
        </ol>
      </div>
    </div>
  );
}
