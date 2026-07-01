'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './statuses.module.css';

interface StatusRow {
  code: string | null;
  label: string;
  color: string;
  isProgress: boolean;
  isDone: boolean;
}

const DEFAULT_COLOR = '#71717A';

export default function ProjectStatusesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id);

  const { user, isLoading: authLoading } = useAuth();
  const canManage = ['ADMIN', 'LEADER'].includes(user?.role || '');

  const [projectName, setProjectName] = useState('');
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    try {
      const [projectRes, statusRes] = await Promise.all([
        apiClient.get<{ data: { name: string } }>(`/projects/${projectId}`),
        apiClient.get<{ data: any[] }>(`/projects/${projectId}/statuses`),
      ]);
      setProjectName(projectRes.data.data.name);
      setRows(statusRes.data.data.map((s) => ({
        code: s.code,
        label: s.label,
        color: s.color || DEFAULT_COLOR,
        isProgress: s.isProgress,
        isDone: s.isDone,
      })));
    } catch {
      setMessage({ type: 'error', text: '상태 단계 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && canManage) fetchAll();
    else if (!authLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canManage]);

  const updateRow = (index: number, patch: Partial<StatusRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { code: null, label: '', color: DEFAULT_COLOR, isProgress: false, isDone: false }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      setMessage({ type: 'error', text: '최소 1개 이상의 단계가 필요합니다.' });
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (rows.some((r) => !r.label.trim())) {
      setMessage({ type: 'error', text: '모든 단계에 이름을 입력해주세요.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put(`/projects/${projectId}/statuses`, { statuses: rows });
      setMessage({ type: 'success', text: '상태 단계가 저장되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (!canManage) {
    return <div className={styles.loading}>관리자/리더만 접근 가능합니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <Link href="/projects" className={styles.backLink}>← 프로젝트</Link>
            <h1 className={styles.pageTitle}>{projectName} 상태 관리</h1>
            <p className={styles.pageSubtitle}>이 프로젝트의 업무 상태(칸반 단계)를 자유롭게 구성합니다.</p>
          </div>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.list}>
          {rows.map((row, index) => (
            <div key={index} className={styles.row}>
              <div className={styles.orderControls}>
                <button type="button" onClick={() => moveRow(index, -1)} disabled={index === 0} className={styles.btnOrder}>▲</button>
                <button type="button" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1} className={styles.btnOrder}>▼</button>
              </div>

              <input
                type="color"
                value={row.color}
                onChange={(e) => updateRow(index, { color: e.target.value })}
                className={styles.colorInput}
              />

              <input
                type="text"
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
                placeholder="단계 이름 (예: 기획)"
                className={styles.labelInput}
              />

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={row.isProgress}
                  onChange={(e) => updateRow(index, { isProgress: e.target.checked })}
                />
                진행중 단계
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={row.isDone}
                  onChange={(e) => updateRow(index, { isDone: e.target.checked })}
                />
                완료 단계
              </label>

              <button type="button" onClick={() => removeRow(index)} className={styles.btnRemove}>삭제</button>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={addRow} className={styles.btnAdd}>+ 단계 추가</button>
          <button type="button" onClick={handleSave} disabled={saving} className={styles.btnSave}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        <p className={styles.hint}>
          "진행중 단계"로 표시된 상태로 들어오면 자동 시간카운터가 시작되고, 벗어나면 종료됩니다. "완료 단계"는 통계의 완료율 계산에 사용됩니다.
          기존 업무가 참조 중인 단계를 삭제하면 해당 업무는 목록/칸반에서 "기타"로 표시되니 주의하세요.
        </p>
      </div>
    </div>
  );
}
