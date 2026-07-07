'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import { useProjectFields } from '@/hooks/useProjectFields';
import apiClient from '@/lib/api-client';
import { Task, TimeLog, ProjectField } from '@/types';
import styles from './detail.module.css';
import { actionLabel } from '@/lib/task-history';
import Spinner from '@/components/common/Spinner';
import { useDialog } from '@/components/common/DialogProvider';

interface Worker {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { confirm } = useDialog();
  const { getStatuses } = useProjectStatuses();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ notes: '' });
  const [externalLink, setExternalLink] = useState('');
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [histories, setHistories] = useState<any[]>([]);

  const [infoEditing, setInfoEditing] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [infoForm, setInfoForm] = useState({ title: '', workerId: '', targetDate: '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const userRole = (user as any)?.role;
  const canEdit = userRole === 'ADMIN' || userRole === 'LEADER';
  const canDelete = userRole === 'ADMIN' || userRole === 'LEADER';

  // 커스텀 필드(속성) — /tasks 목록과 동일한 개념, 상세 페이지에서도 편집 가능
  const { fields, saveValue } = useProjectFields(task?.projectId ?? null);
  const [fieldValueOverrides, setFieldValueOverrides] = useState<Record<number, string>>({});

  const getFieldValue = (field: ProjectField): string => {
    if (field.id in fieldValueOverrides) return fieldValueOverrides[field.id];
    return task?.fieldValues?.find((fv) => fv.fieldId === field.id)?.value ?? '';
  };

  const handleFieldValueChange = (field: ProjectField, value: string) => {
    if (!task) return;
    setFieldValueOverrides((prev) => ({ ...prev, [field.id]: value }));
    saveValue(task.id, field.id, value || null).catch((err) => console.error(err));
  };

  const renderFieldValue = (field: ProjectField) => {
    const value = getFieldValue(field);
    if (!canEdit) {
      if (field.type === 'CHECKBOX') return value === 'true' ? '✓' : '-';
      if (field.type === 'LINK') {
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', wordBreak: 'break-all' }}>
            {value}
          </a>
        ) : '-';
      }
      return value || '-';
    }
    if (field.type === 'CHECKBOX') {
      return (
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => handleFieldValueChange(field, e.target.checked ? 'true' : 'false')}
        />
      );
    }
    if (field.type === 'SELECT') {
      const options = (field.options || '').split(',').map((o) => o.trim()).filter(Boolean);
      return (
        <select
          value={value}
          onChange={(e) => handleFieldValueChange(field, e.target.value)}
          className={styles.fieldSelect}
        >
          <option value="">-</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : field.type === 'LINK' ? 'url' : 'text'}
        defaultValue={value}
        placeholder={field.type === 'LINK' ? 'https://...' : undefined}
        onBlur={(e) => handleFieldValueChange(field, e.target.value)}
        className={styles.input}
      />
    );
  };

  const fetchTask = async () => {
    try {
      const response = await apiClient.get<{ data: Task }>(`/tasks/${id}`);
      const t = response.data.data;
      setTask(t);
      setFormData({ notes: t.notes || '' });
      setExternalLink(t.externalLink || '');
      setLinkInput(t.externalLink || '');
      setInfoForm({
        title: t.title,
        workerId: t.workerId ? String(t.workerId) : '',
        targetDate: t.targetDate ? new Date(t.targetDate).toISOString().slice(0, 10) : '',
      });

      const logsResponse = await apiClient.get<{ data: { logs: TimeLog[]; totalHours: number } }>(
        `/tasks/${id}/timelogs`
      );
      setTimeLogs(logsResponse.data.data.logs);
      setTotalHours(logsResponse.data.data.totalHours);

      const historyRes = await apiClient.get<{ data: any[] }>(`/tasks/${id}/history`);
      setHistories(historyRes.data.data);
    } catch (err: any) {
      setError(err.message || '업무 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTask();
    }
  }, [id, authLoading]);

  useEffect(() => {
    if (!canEdit) return;
    const fetchWorkers = async () => {
      try {
        const res = await apiClient.get<{ data: Worker[] }>('/users?role=WORKER');
        setWorkers(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkers();
  }, [canEdit]);

  const handleInfoSave = async () => {
    if (!task) return;
    setInfoError(null);
    if (!infoForm.title.trim()) { setInfoError('업무 제목을 입력해주세요.'); return; }
    if (!infoForm.workerId) { setInfoError('담당자를 선택해주세요.'); return; }
    setInfoSaving(true);
    try {
      await apiClient.patch(`/tasks/${task.id}`, {
        title: infoForm.title.trim(),
        workerId: parseInt(infoForm.workerId),
        targetDate: infoForm.targetDate || null,
      });
      setInfoEditing(false);
      await fetchTask();
    } catch (err: any) {
      setInfoError(err.response?.data?.message || '업무 수정 실패');
    } finally {
      setInfoSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!(await confirm('이 업무를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.'))) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      router.push('/tasks');
    } catch (err: any) {
      setInfoError(err.response?.data?.message || '업무 삭제 실패');
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!task) return;
    try {
      const response = await apiClient.patch<{ data: Task }>(`/tasks/${task.id}`, formData);
      setTask(response.data.data);
      setEditing(false);
    } catch (err) {
      setError('저장 실패');
      console.error(err);
    }
  };

  const handleLinkSave = async () => {
    if (!task) return;
    try {
      await apiClient.patch(`/tasks/${task.id}`, { externalLink: linkInput });
      setExternalLink(linkInput);
      setLinkEditing(false);
    } catch (err) {
      setError('링크 저장 실패');
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (error || !task) {
    return (
      <div className={styles.errorPage}>
        <p className={styles.dangerText}>{error || '업무를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const currentStatusDef = getStatuses(task.projectId).find((s) => s.code === task.status);
  const statusColor = currentStatusDef?.color || '#374151';
  const badgeStyle = {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: 'transparent',
    color: statusColor,
    border: `1px solid ${statusColor}`,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{task.title}</h1>
        <p className={styles.pageSubtitle}>
          업무 #{task.id}
          {task.rmsNo && ` · ${task.rmsNo}`}
        </p>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {infoError && <div className={styles.errorBox}>{infoError}</div>}

      {/* 기본 정보 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>기본 정보</h2>
          {canEdit && !infoEditing && (
            <div>
              <button onClick={() => { setInfoEditing(true); setInfoError(null); }} className={styles.btnSecondary}>
                수정
              </button>
              {canDelete && (
                <button onClick={handleDelete} disabled={deleting} className={styles.btnDanger}>
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              )}
            </div>
          )}
        </div>

        {infoEditing ? (
          <div>
            <div className={styles.grid}>
              <div>
                <p className={styles.fieldLabel}>제목</p>
                <input
                  type="text"
                  value={infoForm.title}
                  onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })}
                  className={styles.input}
                  disabled={infoSaving}
                />
              </div>
              <div>
                <p className={styles.fieldLabel}>담당자</p>
                <select
                  value={infoForm.workerId}
                  onChange={(e) => setInfoForm({ ...infoForm, workerId: e.target.value })}
                  className={styles.input}
                  disabled={infoSaving}
                >
                  <option value="">담당자를 선택해주세요.</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className={styles.fieldLabel}>등록자</p>
                <p className={styles.fieldValue}>{task.registrant?.name || '-'}</p>
              </div>
              <div>
                <p className={styles.fieldLabel}>목표일</p>
                <input
                  type="date"
                  value={infoForm.targetDate}
                  onChange={(e) => setInfoForm({ ...infoForm, targetDate: e.target.value })}
                  className={styles.input}
                  disabled={infoSaving}
                />
              </div>
            </div>
            <div className={styles.editActions}>
              <button onClick={handleInfoSave} className={styles.btn} disabled={infoSaving}>
                {infoSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setInfoEditing(false);
                  setInfoError(null);
                  setInfoForm({
                    title: task.title,
                    workerId: task.workerId ? String(task.workerId) : '',
                    targetDate: task.targetDate ? new Date(task.targetDate).toISOString().slice(0, 10) : '',
                  });
                }}
                className={styles.btnSecondary}
                disabled={infoSaving}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            <div>
              <p className={styles.fieldLabel}>상태</p>
              <div style={badgeStyle}>{currentStatusDef?.label ?? task.status}</div>
            </div>
            <div>
              <p className={styles.fieldLabel}>담당자</p>
              <p className={styles.fieldValue}>{task.worker?.name || '-'}</p>
            </div>
            <div>
              <p className={styles.fieldLabel}>등록자</p>
              <p className={styles.fieldValue}>{task.registrant?.name || '-'}</p>
            </div>
            <div>
              <p className={styles.fieldLabel}>목표일</p>
              <p className={styles.fieldValue}>
                {task.targetDate ? new Date(task.targetDate).toLocaleDateString('ko-KR') : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 속성 (프로젝트별 커스텀 필드) */}
      {fields.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>속성</h2>
          </div>
          <div className={styles.grid}>
            {fields.map((field) => (
              <div key={field.id}>
                <p className={styles.fieldLabel}>{field.name}</p>
                <div className={styles.fieldValue}>{renderFieldValue(field)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GitHub 연결 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>GitHub 연결</h2>
          {!linkEditing && (
            <button onClick={() => setLinkEditing(true)} className={styles.btnSecondary}>
              {externalLink ? '수정' : '연결'}
            </button>
          )}
        </div>
        {linkEditing ? (
          <div>
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://github.com/org/repo/issues/1"
              className={styles.textarea}
              style={{ height: 'auto', padding: '8px 10px', resize: 'none' }}
            />
            <div className={styles.editActions}>
              <button onClick={handleLinkSave} className={styles.btn}>저장</button>
              <button onClick={() => { setLinkEditing(false); setLinkInput(externalLink); }} className={styles.btnSecondary}>취소</button>
            </div>
          </div>
        ) : externalLink ? (
          <a href={externalLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: '13px', wordBreak: 'break-all' }}>
            {externalLink}
          </a>
        ) : (
          <p className={styles.emptyLogs}>연결된 GitHub URL이 없습니다.</p>
        )}
      </div>

      {/* 메모 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>메모</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className={styles.btnSecondary}>
              수정
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={styles.textarea}
              placeholder="메모를 입력하세요..."
            />
            <div className={styles.editActions}>
              <button onClick={handleSave} className={styles.btn}>저장</button>
              <button
                onClick={() => { setEditing(false); setFormData({ notes: task.notes || '' }); }}
                className={styles.btnSecondary}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.noteText}>{task.notes || '메모가 없습니다.'}</p>
        )}
      </div>

      {/* 타임로그 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>타임로그</h2>
        </div>
        <p className={styles.emptyLogs} style={{ marginTop: '-8px' }}>
          {task.timeCounterEnabled
            ? '상태가 "진행중"으로 바뀌면 자동으로 시간이 누적되고, 다른 상태로 바뀌면 자동 종료됩니다.'
            : '이 업무는 시간카운터가 꺼져 있어 자동으로 시간이 계산되지 않습니다.'}
        </p>

        <div className={styles.totalTimeBox}>
          <span className={styles.totalTimeLabel}>총 소요 시간</span>
          <span className={styles.totalTimeValue}>{totalHours.toFixed(2)} 시간</span>
        </div>

        {timeLogs.length === 0 ? (
          <p className={styles.emptyLogs}>아직 타이머 기록이 없습니다.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.th}>시작 시간</th>
                  <th className={styles.th}>종료 시간</th>
                  <th className={styles.th}>소요 시간</th>
                  <th className={styles.th}>보정</th>
                  <th className={styles.th}>최종 시간</th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map((log) => (
                  <tr key={log.id} className={styles.tableRow}>
                    <td className={styles.td}>{new Date(log.startTime).toLocaleString('ko-KR')}</td>
                    <td className={styles.td}>{log.endTime ? new Date(log.endTime).toLocaleString('ko-KR') : '진행 중'}</td>
                    <td className={styles.td}>{log.durationHours?.toFixed(2) || '-'} h</td>
                    <td className={styles.td}>{log.adjustedHours > 0 ? '+' : ''}{log.adjustedHours.toFixed(2)} h</td>
                    <td className={styles.tdBold}>{log.finalHours?.toFixed(2) || '-'} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 히스토리 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>활동 히스토리</h2>
        {histories.length === 0 ? (
          <p className={styles.emptyLogs}>히스토리가 없습니다.</p>
        ) : (
          <ul className={styles.historyList}>
            {histories.map((h) => (
              <li key={h.id} className={styles.historyItem}>
                <span className={styles.historyDot} />
                <div className={styles.historyBody}>
                  <span className={styles.historyAction}>{actionLabel[h.action as keyof typeof actionLabel] ?? h.action}</span>
                  {h.detail && <span className={styles.historyDetail}> — {h.detail}</span>}
                  <div className={styles.historyMeta}>
                    <span>{h.user?.name}</span>
                    <span>{new Date(h.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
