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
        <div className={styles.bgGlow} />

        {/* 로고 */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <span className={styles.logoIconText}>H</span>
          </div>
          <h1 className={styles.brandTitle}>High5</h1>
          <p className={styles.brandDesc}>
            AI 웹 개발 비즈니스에 최적화된<br />
            경량 업무 관리 플랫폼
          </p>
        </div>
      </div>

      {/* 우측 로그인 폼 */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>로그인</h2>
            <p className={styles.formSubtitle}>High5 계정으로 로그인하세요</p>
          </div>

          {error && (
            <div className={styles.errorBox}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>이메일</label>
              <div className={styles.inputWrap}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={styles.input}
                  disabled={loading}
                />
                {email && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    aria-label="이메일 지우기"
                    onClick={() => setEmail('')}
                    tabIndex={-1}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className={styles.fieldGroupLast}>
              <label className={styles.label}>비밀번호</label>
              <div className={styles.inputWrap}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.input}
                  disabled={loading}
                />
                {password && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    aria-label="비밀번호 지우기"
                    onClick={() => setPassword('')}
                    tabIndex={-1}
                  >
                    ✕
                  </button>
                )}
              </div>
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
