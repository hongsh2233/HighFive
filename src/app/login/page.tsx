'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* 좌측 브랜드 패널 */}
      <div className={styles.brandPanel}>
        <div className={styles.bgDecorTop} />
        <div className={styles.bgDecorBottom} />

        {/* 로고 */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <span className={styles.logoIconText}>T</span>
          </div>
          <h1 className={styles.brandTitle}>TMS</h1>
          <p className={styles.brandDesc}>
            Task Management System<br />
            AI 웹 개발 비즈니스에 최적화된<br />
            경량 업무 관리 플랫폼
          </p>
        </div>

        {/* 기능 목록 */}
        <div className={styles.featureList}>
          {[
            { icon: '⚡', label: '실시간 칸반 보드' },
            { icon: '⏱', label: '타임 트래킹 & 공수 분석' },
            { icon: '🔔', label: 'Slack · 잔디 자동 알림' },
            { icon: '📊', label: '통계 리포트 & CSV 내보내기' },
          ].map((item) => (
            <div key={item.label} className={styles.featureItem}>
              <span className={styles.featureIcon}>{item.icon}</span>
              <span className={styles.featureLabel}>{item.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* 우측 로그인 폼 */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>로그인</h2>
            <p className={styles.formSubtitle}>TMS 계정으로 로그인하세요</p>
          </div>

          {error && (
            <div className={styles.errorBox}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.fieldGroupLast}>
              <label className={styles.label}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-loading={loading}
              className={styles.submitBtn}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className={styles.formFooter}>
            계정 문의는 시스템 관리자에게 연락하세요
          </p>
        </div>
      </div>
    </div>
  );
}
