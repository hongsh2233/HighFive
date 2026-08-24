'use client';

import { useEffect, FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from '@/app/register/register.module.css';

const INQUIRY_TYPES = [
  { value: 'QUOTE', label: '견적문의' },
  { value: 'SUPPORT', label: '기술지원' },
  { value: 'PARTNERSHIP', label: '제휴' },
  { value: 'ETC', label: '기타' },
];

export default function InquiryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [orgName, setOrgName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', type: 'QUOTE', content: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/organizations/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrgName(d.data.name);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/organizations/${slug}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || '문의 접수 중 오류가 발생했습니다.');
        return;
      }
      setDone(true);
    } catch {
      setError('서버 오류가 발생했습니다.');
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>문의가 접수되었습니다</h2>
              <p className={styles.formSubtitle}>담당자 확인 후 빠르게 연락드리겠습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>{orgName || slug} 문의하기</h2>
            <p className={styles.formSubtitle}>아래 내용을 입력해주시면 담당자가 확인 후 연락드립니다.</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>이름</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className={styles.input}
                disabled={loading}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>연락처 <span className={styles.hint}>(이메일 또는 전화번호)</span></label>
              <input
                type="text"
                value={form.contact}
                onChange={set('contact')}
                className={styles.input}
                disabled={loading}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>문의유형</label>
              <select value={form.type} onChange={set('type')} className={styles.input} disabled={loading}>
                {INQUIRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>문의내용</label>
              <textarea
                value={form.content}
                onChange={set('content')}
                className={styles.input}
                rows={5}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? '접수 중...' : '문의하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
