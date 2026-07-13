'use client';

import { useEffect, FormEvent, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from '@/app/login/login.module.css';

export default function OrgLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [orgName, setOrgName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/organizations/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrgName(d.data.name);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const checkTotp = async (val: string) => {
    if (!val) { setTotpRequired(false); return; }
    const res = await fetch(`/api/auth/2fa/check?email=${encodeURIComponent(val)}`).then(r => r.json());
    setTotpRequired(res.data?.totpEnabled ?? false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        slug,
        totp,
        redirect: false,
      });

      if (result?.error) {
        setError(totpRequired ? '이메일, 비밀번호 또는 OTP 코드가 올바르지 않습니다.' : '이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (result?.ok) {
        router.push(`/${slug}/dashboard`);
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>조직을 찾을 수 없습니다</h2>
              <p className={styles.formSubtitle}>
                <strong>{slug}</strong> 슬러그에 해당하는 조직이 없습니다.
              </p>
            </div>
            <p className={styles.formFooter}>
              <a href="/login" style={{ color: 'var(--accent)' }}>← 메인으로</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.brandPanel}>
        <div className={styles.bgDecorTop} />
        <div className={styles.bgDecorBottom} />
        <div className={styles.bgGlow} />
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <span className={styles.logoIconText}>H</span>
          </div>
          <h1 className={styles.brandTitle}>High5</h1>
          <p className={styles.brandDesc}>{orgName || slug}</p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>{orgName || slug}</h2>
            <p className={styles.formSubtitle}>조직 계정으로 로그인하세요</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>이메일</label>
              <div className={styles.inputWrap}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => checkTotp(e.target.value)}
                  placeholder="name@company.com"
                  className={styles.input}
                  disabled={loading}
                  required
                />
                {email && (
                  <button type="button" className={styles.clearBtn} onClick={() => { setEmail(''); setTotpRequired(false); }} tabIndex={-1}>✕</button>
                )}
              </div>
            </div>

            <div className={totpRequired ? styles.fieldGroup : styles.fieldGroupLast}>
              <label className={styles.label}>비밀번호</label>
              <div className={styles.inputWrap}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.input}
                  disabled={loading}
                  required
                />
                {password && (
                  <button type="button" className={styles.clearBtn} onClick={() => setPassword('')} tabIndex={-1}>✕</button>
                )}
              </div>
            </div>

            {totpRequired && (
              <div className={styles.fieldGroupLast}>
                <label className={styles.label}>OTP 코드 (2단계 인증)</label>
                <div className={styles.inputWrap}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6자리 코드"
                    className={styles.input}
                    disabled={loading}
                    required
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} data-loading={loading} className={styles.submitBtn}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className={styles.formFooter}>계정 문의는 조직 관리자에게 연락하세요</p>
        </div>
      </div>
    </div>
  );
}
