'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from '../superadmin.module.css';

const PLANS = ['FREE', 'PRO', 'ENTERPRISE'] as const;

const MENU_ITEMS = [
  { key: 'info', label: '정보' },
  { key: 'requests', label: '신청' },
  { key: 'wiki', label: '위키' },
  { key: 'tasks', label: '업무 (업무등록/목록/칸반/캘린더)' },
  { key: 'search', label: '검색' },
  { key: 'stats', label: '설정 > 통계' },
  { key: 'calendar_sync', label: '설정 > 구글 캘린더 연동' },
  { key: 'integrations', label: '설정 > 외부연동 (ADMIN 전용)' },
];

type PlanFeatures = Record<string, string[]>;

export default function PlanConfigPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [features, setFeatures] = useState<PlanFeatures>({
    FREE: [],
    PRO: [],
    ENTERPRISE: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && (user as any)?.role !== 'SUPERADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('/api/plan-config')
      .then((r) => r.json())
      .then((d) => { if (d.success) setFeatures(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (plan: string, key: string) => {
    const current = features[plan] ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    const newFeatures = { ...features, [plan]: next };
    setFeatures(newFeatures);
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/plan-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planFeatures: newFeatures }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.page}><p className={styles.empty}>불러오는 중...</p></div>;

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push('/superadmin')}>← 가입 현황</button>
      <div className={styles.header}>
        <h1 className={styles.title}>플랜별 메뉴 권한 설정</h1>
        {saving && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>저장 중...</span>}
        {saved && <span style={{ fontSize: 12, color: '#16A34A' }}>저장됨</span>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        체크된 메뉴만 해당 플랜 사용자의 헤더에 표시됩니다.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>메뉴</th>
              {PLANS.map((p) => <th key={p}>{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {MENU_ITEMS.map((item) => (
              <tr key={item.key}>
                <td>{item.label}</td>
                {PLANS.map((plan) => (
                  <td key={plan} style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={(features[plan] ?? []).includes(item.key)}
                      onChange={() => toggle(plan, item.key)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
