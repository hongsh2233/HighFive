'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    orgName: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    password: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, termsAccepted: agreed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || '가입 중 오류가 발생했습니다.');
        return;
      }
      router.push('/login?registered=1');
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
          <p className={styles.brandDesc}>
            새 조직을 등록하고<br />업무 관리를 시작하세요
          </p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>조직 등록</h2>
            <p className={styles.formSubtitle}>회사 정보와 관리자 계정을 입력하세요</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.section}>
              <p className={styles.sectionLabel}>조직 정보</p>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>회사명</label>
                <input
                  type="text"
                  value={form.orgName}
                  onChange={set('orgName')}
                  placeholder="예: ACME 주식회사"
                  className={styles.input}
                  disabled={loading}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>슬러그 <span className={styles.hint}>(영소문자·숫자·하이픈만)</span></label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={set('slug')}
                  placeholder="예: acme"
                  className={styles.input}
                  disabled={loading}
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>관리자 계정</p>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>이름</label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={set('adminName')}
                  placeholder="홍길동"
                  className={styles.input}
                  disabled={loading}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>이메일</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={set('adminEmail')}
                  placeholder="admin@company.com"
                  className={styles.input}
                  disabled={loading}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>비밀번호 <span className={styles.hint}>(8자 이상)</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  className={styles.input}
                  disabled={loading}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <label className={styles.consentRow}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
              />
              <span>
                <Link href="/legal/terms" target="_blank">이용약관</Link> 및{' '}
                <Link href="/legal/privacy" target="_blank">개인정보처리방침</Link>에 동의합니다.
              </span>
            </label>

            <button type="submit" disabled={loading || !agreed} className={styles.submitBtn}>
              {loading ? '처리 중...' : '조직 등록'}
            </button>
          </form>

          <p className={styles.formFooter}>
            이미 계정이 있으신가요? <Link href="/login">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
