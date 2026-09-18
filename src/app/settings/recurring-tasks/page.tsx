'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { useDialog } from '@/components/common/DialogProvider';
import styles from './recurring-tasks.module.css';
import Spinner from '@/components/common/Spinner';

const FREQUENCY_LABEL: Record<string, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
  WEEKDAY: '특정 요일',
  QUARTERLY: '분기',
  YEARLY: '매년',
  CUSTOM: '사용자 지정(N일마다)',
};

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

interface RuleUser { id: number; name: string }
interface Rule {
  id: number;
  title: string;
  notes: string | null;
  frequency: string;
  config: { weekdays?: number[]; dayOfMonth?: number; intervalDays?: number } | null;
  targetDaysOffset: number;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  worker: RuleUser;
  project: { id: number; name: string } | null;
  createdBy: RuleUser;
}

export default function RecurringTasksPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { confirm } = useDialog();
  const [rules, setRules] = useState<Rule[]>([]);
  const [users, setUsers] = useState<RuleUser[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [frequency, setFrequency] = useState('WEEKLY');
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [intervalDays, setIntervalDays] = useState(14);
  const [targetDaysOffset, setTargetDaysOffset] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rulesRes, usersRes, projectsRes] = await Promise.all([
        apiClient.get<{ data: Rule[] }>('/recurring-tasks'),
        apiClient.get<{ data: RuleUser[] }>('/users?minimal=true'),
        apiClient.get<{ data: { id: number; name: string }[] }>('/projects'),
      ]);
      setRules(rulesRes.data.data);
      setUsers(usersRes.data.data);
      setProjects(projectsRes.data.data);
    } catch {
      setError('목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) fetchAll();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user]);

  const resetForm = () => {
    setTitle(''); setNotes(''); setWorkerId(''); setProjectId('');
    setFrequency('WEEKLY'); setWeekdays([1]); setDayOfMonth(1); setIntervalDays(14); setTargetDaysOffset(0);
  };

  const buildConfig = () => {
    if (frequency === 'WEEKDAY') return { weekdays };
    if (frequency === 'MONTHLY') return { dayOfMonth };
    if (frequency === 'CUSTOM') return { intervalDays };
    return undefined;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !workerId) { setError('업무명과 담당자는 필수입니다.'); return; }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/recurring-tasks', {
        title: title.trim(),
        notes: notes.trim() || undefined,
        workerId: parseInt(workerId),
        projectId: projectId ? parseInt(projectId) : undefined,
        frequency,
        config: buildConfig(),
        targetDaysOffset,
      });
      resetForm();
      setShowForm(false);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: Rule) => {
    await apiClient.patch(`/recurring-tasks/${rule.id}`, { isActive: !rule.isActive });
    fetchAll();
  };

  const handleDelete = async (rule: Rule) => {
    const ok = await confirm(`'${rule.title}' 반복 업무 규칙을 삭제하시겠습니까? (이미 생성된 업무는 삭제되지 않습니다)`);
    if (!ok) return;
    await apiClient.delete(`/recurring-tasks/${rule.id}`);
    fetchAll();
  };

  if (authLoading || loading) return <div className={styles.loading}><Spinner /></div>;
  if (!user || !['ADMIN', 'LEADER'].includes((user as any).role)) {
    return <div className={styles.loading}>관리자/매니저만 접근할 수 있는 페이지입니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>반복 업무</h1>
          <button type="button" className={styles.btnPrimary} onClick={() => setShowForm((v) => !v)}>
            {showForm ? '닫기' : '+ 반복 업무 등록'}
          </button>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        {showForm && (
          <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.formRow}>
              <label className={styles.label}>업무명 *</label>
              <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>비고</label>
              <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>담당자 *</label>
              <select className={styles.input} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
                <option value="">선택</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>프로젝트</label>
              <select className={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">미지정</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>반복 주기</label>
              <select className={styles.input} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {frequency === 'WEEKDAY' && (
              <div className={styles.formRow}>
                <label className={styles.label}>요일 선택</label>
                <div className={styles.weekdayRow}>
                  {WEEKDAY_LABEL.map((label, idx) => (
                    <label key={idx} className={styles.weekdayChip} data-checked={weekdays.includes(idx)}>
                      <input
                        type="checkbox"
                        checked={weekdays.includes(idx)}
                        onChange={(e) => setWeekdays((prev) => e.target.checked ? [...prev, idx] : prev.filter((d) => d !== idx))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {frequency === 'MONTHLY' && (
              <div className={styles.formRow}>
                <label className={styles.label}>매월 며칠</label>
                <input type="number" min={1} max={28} className={styles.input} value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)} />
              </div>
            )}
            {frequency === 'CUSTOM' && (
              <div className={styles.formRow}>
                <label className={styles.label}>반복 간격(일)</label>
                <input type="number" min={1} className={styles.input} value={intervalDays} onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)} />
              </div>
            )}
            <div className={styles.formRow}>
              <label className={styles.label}>목표일 오프셋(생성일+N일)</label>
              <input type="number" min={0} className={styles.input} value={targetDaysOffset} onChange={(e) => setTargetDaysOffset(parseInt(e.target.value) || 0)} />
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? '등록 중...' : '등록'}</button>
          </form>
        )}

        <div className={styles.list}>
          {rules.length === 0 ? (
            <p className={styles.emptyText}>등록된 반복 업무가 없습니다.</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className={styles.ruleCard} data-inactive={!r.isActive}>
                <div className={styles.ruleHeader}>
                  <span className={styles.ruleTitle}>{r.title}</span>
                  <span className={styles.ruleFreq}>{FREQUENCY_LABEL[r.frequency]}</span>
                </div>
                <div className={styles.ruleMeta}>
                  담당자 {r.worker.name}{r.project ? ` · ${r.project.name}` : ''} · 다음 생성 {new Date(r.nextRunAt).toLocaleDateString('ko-KR')}
                </div>
                <div className={styles.ruleActions}>
                  <button type="button" className={styles.linkBtn} onClick={() => toggleActive(r)}>
                    {r.isActive ? '일시중지' : '재개'}
                  </button>
                  <button type="button" className={styles.linkBtnDanger} onClick={() => handleDelete(r)}>삭제</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
