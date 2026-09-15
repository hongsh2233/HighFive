'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Task } from '@/types';
import { TASK_PRIORITY_TEXT } from '@/lib/constants';
import styles from './TaskDetailPanel.module.css';

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
  const [commentInput, setCommentInput] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  const fetchTask = () => {
    setLoading(true);
    apiClient.get<{ data: Task }>(`/tasks/${taskId}`)
      .then((res) => setTask(res.data.data))
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  };

  const fetchComments = () => {
    apiClient.get<{ data: any[] }>(`/tasks/${taskId}/comments`)
      .then((res) => setComments(res.data.data))
      .catch(() => setComments([]));
  };

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [taskId]);

  const handleCommentSubmit = async () => {
    const content = commentInput.trim();
    if (!content || commentSaving) return;
    setCommentSaving(true);
    try {
      const res = await apiClient.post<{ data: any }>(`/tasks/${taskId}/comments`, { content });
      setComments((prev) => [...prev, res.data.data]);
      setCommentInput('');
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
    setSaving(true);
    try {
      await onUpdateStatus(taskId, status);
      fetchTask();
    } finally {
      setSaving(false);
    }
  };

  const handleWorkerChange = async (workerId: string) => {
    setSaving(true);
    try {
      await onUpdateTask(taskId, { workerId: parseInt(workerId) });
      fetchTask();
    } finally {
      setSaving(false);
    }
  };

  const handleTargetDateChange = async (targetDate: string) => {
    setSaving(true);
    try {
      await onUpdateTask(taskId, { targetDate: targetDate || null });
      fetchTask();
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

      {loading || !task ? (
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
                      <span className={styles.commentAuthor}>{c.author?.name || '알 수 없음'}</span>
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
        </div>
      )}
    </div>
  );
}
