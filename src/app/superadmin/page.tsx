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
  createdAt: string;
  _count: { users: number };
}

export default function SuperAdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (user as any)?.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('/api/superadmin/organizations')
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrgs(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>슈퍼관리자 — 조직 목록</h1>
        <span className={styles.badge}>{orgs.length}개 조직</span>
      </div>

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
