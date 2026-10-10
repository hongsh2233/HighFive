'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Task } from '@/types';
import { TASK_PRIORITY_TEXT } from '@/lib/constants';
import styles from './TaskDetailPanel.module.css';
import JiaSidePanel from '@/components/work/JiaSidePanel';

interface StatusDef { code: string; label: string; isDone: boolean }
interface Worker { id: number; name: string }

export default function TaskDetailPanel({
  taskId,
  onClose,
  getStatuses,
  workers,
  canEdit,
  onUpdateStatus,
  onUpdateTask,
  width,
  onResizeStart,
}: {
  taskId: number;
  onClose: () => void;
  getStatuses: (projectId: number | null) => StatusDef[];
  workers: Worker[];
  canEdit: boolean;
  onUpdateStatus: (id: number, status: string) => Promise<any>;
  onUpdateTask: (id: number, data: any) => Promise<any>;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const commentInput = drafts[taskId] || '';
  const setCommentInput = (value: React.SetStateAction<string>) => setDrafts(current => ({ ...current, [taskId]: typeof value === 'function' ? value(current[taskId] || '') : value }));
  const [error, setError] = useState('');
  const activeTask = useRef(taskId);
  activeTask.current = taskId;
  const [commentSaving, setCommentSaving] = useState(false);

  const fetchTask = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    apiClient.get<{ data: Task }>(`/tasks/${taskId}`, { signal })
      .then((res) => { if (!signal?.aborted && activeTask.current === taskId) setTask(res.data.data); })
      .catch(() => { if (!signal?.aborted && activeTask.current === taskId) { setTask(null); setError('업무를 불러오지 못했습니다. 다시 시도해 주세요.'); } })
      .finally(() => { if (!signal?.aborted && activeTask.current === taskId) setLoading(false); });
  }, [taskId]);

  const fetchComments = useCallback((signal?: AbortSignal) => {
    apiClient.get<{ data: any[] }>(`/tasks/${taskId}/comments`, { signal })
      .then((res) => { if (!signal?.aborted && activeTask.current === taskId) setComments(res.data.data); })
      .catch(() => { if (!signal?.aborted && activeTask.current === taskId) setError('댓글을 불러오지 못했습니다.'); });
  }, [taskId]);

  useEffect(() => {
    const controller = new AbortController();
    setTask(null); setComments([]); setError('');
    fetchTask(controller.signal); fetchComments(controller.signal);
    return () => controller.abort();
  }, [fetchTask, fetchComments]);

  const handleCommentSubmit = async () => {
    const content = commentInput.trim();
    if (!content || commentSaving) return;
    setCommentSaving(true);
    setError('');
    try {
      const res = await apiClient.post<{ data: any }>(`/tasks/${taskId}/comments`, { content });
      setCommentInput(current => current.trim() === content ? '' : current);
      if (activeTask.current !== taskId) return;
      setComments((prev) => [...prev, res.data.data]);
    } catch {
      if (activeTask.current === taskId) setError('댓글 등록에 실패했습니다. 입력 내용을 유지했습니다.');
    } finally {
      setCommentSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleStatusChange = async (status: string) => {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await onUpdateStatus(taskId, status);
      if (activeTask.current === taskId) fetchTask();
    } catch {
      if (activeTask.current === taskId) setError('상태 변경에 실패했습니다. 권한과 선행 업무·승인 조건을 확인하세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkerChange = async (workerId: string) => {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await onUpdateTask(taskId, { workerId: parseInt(workerId) });
      if (activeTask.current === taskId) fetchTask();
    } catch {
      if (activeTask.current === taskId) setError('담당자 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleTargetDateChange = async (targetDate: string) => {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await onUpdateTask(taskId, { targetDate: targetDate || null });
      if (activeTask.current === taskId) fetchTask();
    } catch {
      if (activeTask.current === taskId) setError('마감일 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.panel} style={{ width }}>
      <div className={styles.resizeHandle} onMouseDown={onResizeStart} />

      <div className={styles.header}>
        <span className={styles.headerLabel}>업무 #{taskId}</span>
        <div className={styles.headerActions}>
          <Link href={`/tasks/${taskId}`} className={styles.expandBtn} title="전체 화면으로 열기">⤢</Link>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="닫기">✕</button>
        </div>
      </div>

      {error && <div role="alert" className={styles.loading}>{error} <button onClick={() => { setError(''); fetchTask(); fetchComments(); }}>다시 시도</button></div>}
      {loading || !task || task.id !== taskId ? (
        <div className={styles.loading}>{loading ? '불러오는 중...' : '업무를 찾을 수 없습니다.'}</div>
      ) : (
        <div className={styles.body}>
          <h2 className={styles.title}>{task.title}</h2>

          {(() => {
            const statuses = getStatuses(task.projectId);
            return (
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>상태</span>
                {canEdit ? (
                  <select value={task.status} disabled={saving} onChange={(e) => handleStatusChange(e.target.value)} className={styles.select}>
                    {statuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                  </select>
                ) : (
                  <span>{statuses.find((s) => s.code === task.status)?.label || task.status}</span>
                )}
              </div>
            );
          })()}

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>담당자</span>
            {canEdit ? (
              <select value={String(task.workerId)} disabled={saving} onChange={(e) => handleWorkerChange(e.target.value)} className={styles.select}>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            ) : (
              <span>{task.worker?.name || '-'}</span>
            )}
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>목표일</span>
            {canEdit ? (
              <input
                type="date"
                value={task.targetDate ? task.targetDate.slice(0, 10) : ''}
                disabled={saving}
                onChange={(e) => handleTargetDateChange(e.target.value)}
                className={styles.select}
              />
            ) : (
              <span>{task.targetDate ? new Date(task.targetDate).toLocaleDateString('ko-KR') : '-'}</span>
            )}
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>우선순위</span>
            <span>{TASK_PRIORITY_TEXT[task.priority] || task.priority}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>프로젝트</span>
            <span>{task.project?.name || '미지정'}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>등록자</span>
            <span>{task.registrant?.name || '-'}</span>
          </div>

          {task.notes && task.notes.trim() !== '<p><br></p>' && (
            <div className={styles.notesSection}>
              <span className={styles.fieldLabel}>비고</span>
              <div className={styles.notesPreview} dangerouslySetInnerHTML={{ __html: task.notes }} />
            </div>
          )}

          <div className={styles.notesSection}>
            <span className={styles.fieldLabel}>댓글 {comments.length > 0 ? `${comments.length}건` : ''}</span>
            {comments.length === 0 ? (
              <p className={styles.emptyComments}>아직 댓글이 없습니다.</p>
            ) : (
              <ul className={styles.commentList}>
                {comments.map((c) => (
                  <li key={c.id} className={styles.commentItem}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentAuthor}>{c.author?.name || 'JIA 연동'}</span>
                      <span className={styles.commentDate}>{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className={styles.commentContent}>{c.content}</div>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.commentForm}>
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className={styles.commentInput}
                rows={2}
              />
              <button
                type="button"
                onClick={handleCommentSubmit}
                disabled={commentSaving || !commentInput.trim()}
                className={styles.commentSubmitBtn}
              >
                등록
              </button>
            </div>
          </div>

          <Link href={`/tasks/${taskId}`} className={styles.fullPageLink}>전체 상세 화면에서 보기 →</Link>
          <JiaSidePanel key={task.id} task={task} getStatuses={projectId => getStatuses(projectId ?? null).map((s, order) => ({ ...s, color: null, order, isProgress: false }))} onDraft={draft => setCommentInput(previous => previous ? `${previous}\n\n${draft}` : draft)} />
        </div>
      )}
    </div>
  );
}
