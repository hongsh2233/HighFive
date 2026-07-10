'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styles from './audit.module.css';

interface AuditEntry {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  detail: Record<string, unknown> | null;
  userEmail: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: '로그인',
  USER_CREATED: '사용자 생성',
  USER_DELETED: '사용자 삭제',
  USER_ROLE_CHANGED: '역할 변경',
  '2FA_ENABLED': '2FA 활성화',
  '2FA_DISABLED': '2FA 비활성화',
  ORG_DELETED: '조직 삭제',
  SETTING_CHANGED: '설정 변경',
};

export default function AuditPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (!isLoading && user && !['ADMIN', 'LEADER'].includes((user as any).role)) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (actionFilter) params.set('action', actionFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const res = await fetch(`/api/settings/audit?${params}`).then(r => r.json());
    if (res.success) {
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    }
    setLoading(false);
  }, [actionFilter, from, to]);

  useEffect(() => { if (user) load(1); }, [user, load]);

  if (isLoading) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>감사 로그</h1>
          <p className={styles.subtitle}>조직 내 주요 활동 기록 ({total.toLocaleString()}건)</p>
        </div>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">전체 액션</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="date" className={styles.filterInput} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="시작일" />
        <span className={styles.filterSep}>~</span>
        <input type="date" className={styles.filterInput} value={to} onChange={(e) => setTo(e.target.value)} placeholder="종료일" />
        <button className={styles.filterBtn} onClick={() => load(1)}>조회</button>
        <button className={styles.filterBtnReset} onClick={() => { setActionFilter(''); setFrom(''); setTo(''); }}>초기화</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>일시</th>
              <th>액션</th>
              <th>수행자</th>
              <th>대상</th>
              <th>상세</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.center}>불러오는 중...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className={styles.center}>기록이 없습니다.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td className={styles.nowrap}>{new Date(log.createdAt).toLocaleString('ko-KR')}</td>
                <td><span className={styles.actionBadge}>{ACTION_LABELS[log.action] ?? log.action}</span></td>
                <td className={styles.email}>{log.userEmail || '-'}</td>
                <td>{log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ''}` : '-'}</td>
                <td className={styles.detail}>
                  {log.detail ? (
                    <span title={JSON.stringify(log.detail, null, 2)}>
                      {Object.entries(log.detail).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </span>
                  ) : '-'}
                </td>
                <td className={styles.ip}>{log.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => load(page - 1)}>이전</button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => load(page + 1)}>다음</button>
        </div>
      )}
    </div>
  );
}
