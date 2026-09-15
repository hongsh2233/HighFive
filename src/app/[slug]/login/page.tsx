'use client';

import { useEffect, FormEvent, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from '@/app/login/login.module.css';

const DEMO_PASSWORD = '1234567890';
const DEMO_ACCOUNTS = [
  { name: '관리자', email: 'admin@demo.co.kr', role: 'ADMIN' },
  { name: '김데모', email: 'abcd@demo.co.kr', role: 'LEADER' },
  { name: '이데모', email: 'lee123@demo.co.kr', role: 'WORKER' },
];

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
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap" />
      <div className={styles.brandPanel}>
        <div className={styles.bgDecorTop} />
        <div className={styles.bgDecorBottom} />
        <div className={styles.bgGlow} />
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <text x="34" y="150" fontFamily="Fraunces, Georgia, serif" fontWeight="600" fontSize="156" fill="#FF6B4A">5</text>
              <g stroke="#FFB238" strokeWidth="9" strokeLinecap="round" fill="none">
                <line x1="118" y1="46" x2="132" y2="30" />
                <line x1="140" y1="58" x2="160" y2="46" />
                <line x1="150" y1="76" x2="174" y2="72" />
              </g>
            </svg>
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

          {slug === 'demo' && (
            <div style={{ marginTop: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-subtle)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>데모 계정 (클릭하면 자동 입력)</p>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(DEMO_PASSWORD); checkTotp(acc.email); }}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 4px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}
                >
                  <span>{acc.role} · {acc.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{acc.email}</span>
                </button>
              ))}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>비밀번호: {DEMO_PASSWORD}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
