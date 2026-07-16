'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from '../superadmin.module.css';

interface DemoRequestRow {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', CONTACTED: '연락완료', CLOSED: '종료' };

export default function DemoRequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<DemoRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (user as any)?.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const load = () => {
    fetch('/api/superadmin/demo-requests')
      .then((r) => r.json())
      .then((d) => { if (d.success) setRequests(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: number, status: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: status as DemoRequestRow['status'] } : r)));
    await fetch(`/api/superadmin/demo-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 신청을 삭제하시겠습니까?')) return;
    await fetch(`/api/superadmin/demo-requests/${id}`, { method: 'DELETE' });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>무료 데모 신청 목록</h1>
        <span className={styles.badge}>{requests.length}건</span>
      </div>

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : requests.length === 0 ? (
        <p className={styles.empty}>데모 신청이 없습니다.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>회사명</th>
                <th>이메일</th>
                <th>연락처</th>
                <th>메시지</th>
                <th>상태</th>
                <th>신청일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className={styles.row}>
                  <td>{r.id}</td>
                  <td className={styles.orgName}>{r.name}</td>
                  <td>{r.company}</td>
                  <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                  <td>{r.phone || '-'}</td>
                  <td>{r.message || '-'}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className={styles.planSelect}
                    >
                      {Object.entries(STATUS_LABEL).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <button onClick={() => handleDelete(r.id)} className={styles.btnDanger}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
