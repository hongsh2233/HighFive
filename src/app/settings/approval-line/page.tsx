'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import Spinner from '@/components/common/Spinner';
import styles from './approval-line.module.css';

interface Worker { id: number; name: string; }
interface Step {
  label: string;
  approverId: string;
  canFinalize: boolean;
}

export default function ApprovalLineSettingsPage() {
  const { isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<Worker[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: Worker[] }>('/users'),
      apiClient.get<{ data: { order: number; label: string; approverId: number; canFinalize: boolean }[] }>('/settings/approval-line'),
    ]).then(([usersRes, lineRes]) => {
      setUsers(usersRes.data.data);
      setSteps(lineRes.data.data.map((s) => ({ label: s.label, approverId: String(s.approverId), canFinalize: s.canFinalize })));
    }).catch(() => setMessage({ type: 'error', text: '결재선 조회에 실패했습니다.' }))
      .finally(() => setLoading(false));
  }, []);

  const addStep = () => setSteps((prev) => [...prev, { label: '', approverId: users[0] ? String(users[0].id) : '', canFinalize: false }]);
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));
  const updateStep = (idx: number, patch: Partial<Step>) => setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = prev.slice();
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiClient.put<{ data: any[] }>('/settings/approval-line', { steps });
      setSteps(res.data.data.map((s: any) => ({ label: s.label, approverId: String(s.approverId), canFinalize: s.canFinalize })));
      setMessage({ type: 'success', text: '결재선이 저장되었습니다.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>결재선 설정</h1>
          <p className={styles.pageSubtitle}>
            조직 전체 신청(휴가/비품 등)에 적용되는 결재 단계를 순서대로 구성합니다. 비워두면 기존처럼 담당 리더 1단계 결재로 동작합니다.
            '전결' 체크 시 해당 단계 승인만으로 이후 단계를 생략하고 즉시 최종 승인 처리됩니다.
          </p>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>{message.text}</div>
        )}

        {steps.length === 0 ? (
          <div className={styles.empty}>설정된 결재 단계가 없습니다. 아래 버튼으로 추가해주세요.</div>
        ) : (
          <ul className={styles.stepList}>
            {steps.map((s, idx) => (
              <li key={idx} className={styles.stepItem}>
                <span className={styles.stepOrder}>{idx + 1}</span>
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateStep(idx, { label: e.target.value })}
                  placeholder="직책명 (예: PM, 기획팀장)"
                  className={styles.stepLabelInput}
                />
                <select value={s.approverId} onChange={(e) => updateStep(idx, { approverId: e.target.value })} className={styles.stepSelect}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <label className={styles.finalizeLabel}>
                  <input type="checkbox" checked={s.canFinalize} onChange={(e) => updateStep(idx, { canFinalize: e.target.checked })} />
                  전결
                </label>
                <div className={styles.stepActions}>
                  <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0} className={styles.moveBtn}>↑</button>
                  <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className={styles.moveBtn}>↓</button>
                  <button type="button" onClick={() => removeStep(idx)} className={styles.removeBtn}>×</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actionsRow}>
          <button type="button" onClick={addStep} className={styles.btnSecondary}>+ 단계 추가</button>
          <button type="button" onClick={handleSave} disabled={saving} className={styles.btnPrimary}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
