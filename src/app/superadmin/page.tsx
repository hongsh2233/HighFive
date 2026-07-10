'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './superadmin.module.css';

interface OrgRow {
  id: number;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  bizNo: string | null;
  phone: string | null;
  ceoName: string | null;
  createdAt: string;
  _count: { users: number };
}

const emptyForm = { name: '', slug: '', bizNo: '', phone: '', ceoName: '', plan: 'FREE' };

export default function SuperAdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isLoading && (user as any)?.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const loadOrgs = () => {
    fetch('/api/superadmin/organizations')
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrgs(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrgs(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message || '오류가 발생했습니다.'); return; }
      setForm(emptyForm);
      setShowForm(false);
      loadOrgs();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>시스템관리자 — 가입 현황</h1>
        <span className={styles.badge}>{orgs.length}개 조직</span>
        <button
          className={styles.btnPrimary}
          style={{ marginLeft: 'auto' }}
          onClick={() => { setShowForm((v) => !v); setFormError(''); }}
        >
          {showForm ? '취소' : '+ 조직 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className={styles.addForm}>
          {formError && <div className={styles.formError}>{formError}</div>}
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>
              회사명 *
              <input className={styles.formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className={styles.formLabel}>
              슬러그 *
              <input className={styles.formInput} value={form.slug} placeholder="my-company" onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </label>
            <label className={styles.formLabel}>
              사업자번호
              <input className={styles.formInput} value={form.bizNo} placeholder="000-00-00000" onChange={(e) => setForm({ ...form, bizNo: e.target.value })} />
            </label>
            <label className={styles.formLabel}>
              대표번호
              <input className={styles.formInput} value={form.phone} placeholder="02-0000-0000" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className={styles.formLabel}>
              대표자명
              <input className={styles.formInput} value={form.ceoName} onChange={(e) => setForm({ ...form, ceoName: e.target.value })} />
            </label>
            <label className={styles.formLabel}>
              플랜
              <select className={styles.planSelect} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : orgs.length === 0 ? (
        <p className={styles.empty}>조직이 없습니다.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>조직명</th>
                <th>슬러그</th>
                <th>로그인 URL</th>
                <th>사업자번호</th>
                <th>대표번호</th>
                <th>대표자명</th>
                <th>플랜</th>
                <th>사용자 수</th>
                <th>상태</th>
                <th>가입일</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className={styles.row}
                  onClick={() => router.push(`/superadmin/${org.id}`)}
                >
                  <td>{org.id}</td>
                  <td className={styles.orgName}>{org.name}</td>
                  <td><code>{org.slug}</code></td>
                  <td>
                    <a
                      href={`/${org.slug}/login`}
                      className={styles.loginLink}
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      /{org.slug}/login
                    </a>
                  </td>
                  <td>{org.bizNo || '-'}</td>
                  <td>{org.phone || '-'}</td>
                  <td>{org.ceoName || '-'}</td>
                  <td><span className={`${styles.planBadge} ${styles[`plan${org.plan}`]}`}>{org.plan}</span></td>
                  <td>{org._count.users}명</td>
                  <td>
                    <span className={org.isActive ? styles.statusActive : styles.statusInactive}>
                      {org.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td>{new Date(org.createdAt).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
