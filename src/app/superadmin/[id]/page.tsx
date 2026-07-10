'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from '../superadmin.module.css';

interface OrgDetail {
  id: number;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

interface OrgUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function SuperAdminOrgPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
  const [userFormError, setUserFormError] = useState('');
  const [userSaving, setUserSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && (user as any)?.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/superadmin/organizations`).then((r) => r.json()),
      fetch(`/api/superadmin/organizations/${orgId}/users`).then((r) => r.json()),
    ]).then(([orgsData, usersData]) => {
      if (orgsData.success) {
        const found = orgsData.data.find((o: OrgDetail) => String(o.id) === orgId);
        setOrg(found || null);
      }
      if (usersData.success) setUsers(usersData.data);
    }).finally(() => setLoading(false));
  }, [orgId]);

  const handleToggleActive = async () => {
    if (!org) return;
    setSaving(true);
    const res = await fetch(`/api/superadmin/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !org.isActive }),
    });
    const data = await res.json();
    if (data.success) setOrg(data.data);
    setSaving(false);
  };

  const handlePlanChange = async (plan: string) => {
    if (!org) return;
    setSaving(true);
    const res = await fetch(`/api/superadmin/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.success) setOrg(data.data);
    setSaving(false);
  };

  const loadUsers = () =>
    fetch(`/api/superadmin/organizations/${orgId}/users`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setUsers(d.data); });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    setUserSaving(true);
    try {
      const res = await fetch(`/api/superadmin/organizations/${orgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (!res.ok) { setUserFormError(data.message || '오류가 발생했습니다.'); return; }
      setUserForm({ name: '', email: '', password: '', role: 'ADMIN' });
      setShowUserForm(false);
      await loadUsers();
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!org) return;
    if (!confirm(`"${org.name}" 조직과 모든 데이터를 영구 삭제합니다. 계속하시겠습니까?`)) return;
    setSaving(true);
    const res = await fetch(`/api/superadmin/organizations/${orgId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/superadmin');
    } else {
      alert('삭제 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.page}><p className={styles.empty}>불러오는 중...</p></div>;
  if (!org) return <div className={styles.page}><p className={styles.empty}>조직을 찾을 수 없습니다.</p></div>;

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push('/superadmin')}>← 목록</button>

      <div className={styles.detailHeader}>
        <div>
          <h1 className={styles.title}>{org.name}</h1>
          <p className={styles.slug}><code>{org.slug}</code> · 가입일 {new Date(org.createdAt).toLocaleDateString('ko-KR')}</p>
        </div>
        <div className={styles.actions}>
          <select
            value={org.plan}
            onChange={(e) => handlePlanChange(e.target.value)}
            disabled={saving}
            className={styles.planSelect}
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
          <button
            onClick={handleToggleActive}
            disabled={saving}
            className={org.isActive ? styles.btnDanger : styles.btnPrimary}
          >
            {org.isActive ? '비활성화' : '활성화'}
          </button>
          <button
            onClick={handleDeleteOrg}
            disabled={saving}
            className={styles.btnDanger}
          >
            조직 삭제
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 12px' }}>
        <h2 className={styles.subtitle} style={{ margin: 0 }}>사용자 목록 ({users.length}명)</h2>
        <button
          className={styles.btnPrimary}
          onClick={() => { setShowUserForm((v) => !v); setUserFormError(''); }}
        >
          {showUserForm ? '취소' : '+ 사용자 추가'}
        </button>
      </div>

      {showUserForm && (
        <form onSubmit={handleAddUser} className={styles.addForm}>
          {userFormError && <div className={styles.formError}>{userFormError}</div>}
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>
              이름 *
              <input className={styles.formInput} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
            </label>
            <label className={styles.formLabel}>
              이메일 *
              <input type="email" className={styles.formInput} value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </label>
            <label className={styles.formLabel}>
              비밀번호 * (8자 이상)
              <input type="password" className={styles.formInput} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
            </label>
            <label className={styles.formLabel}>
              역할
              <select className={styles.planSelect} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="ADMIN">ADMIN</option>
                <option value="LEADER">LEADER</option>
                <option value="WORKER">WORKER</option>
              </select>
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={userSaving}>
              {userSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>역할</th>
              <th>상태</th>
              <th>가입일</th>
              <th>마지막 로그인</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <span className={u.isActive ? styles.statusActive : styles.statusInactive}>
                    {u.isActive ? '활성' : '비활성'}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
