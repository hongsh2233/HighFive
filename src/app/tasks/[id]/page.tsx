'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
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
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean'],
  ],
};

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
  const [showTimeLogs, setShowTimeLogs] = useState(false);
  const [histories, setHistories] = useState<any[]>([]);

  const [infoEditing, setInfoEditing] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [infoForm, setInfoForm] = useState({ title: '', workerId: '', targetDate: '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  // 대댓글: replyTo = { commentId, authorName }
  const [replyTo, setReplyTo] = useState<{ commentId: number; authorName: string } | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  // @멘션 자동완성
  const [allUsers, setAllUsers] = useState<Worker[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mentionAnchorRef = useRef(0); // ref로 스테일 클로저 방지
  const mentionQueryRef = useRef<string | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const userRole = (user as any)?.role;
  const canEdit = userRole === 'ADMIN' || userRole === 'LEADER';
  const canDelete = userRole === 'ADMIN' || userRole === 'LEADER';
  const currentUserId = parseInt((user as any)?.id || '0');
  const canEditNotes = canEdit || task?.workerId === currentUserId;

  const [attachUploading, setAttachUploading] = useState(false);
  const [attachError, setAttachError] = useState('');

  const handleAttachFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !task) return;
    setAttachError('');
    const MAX_BYTES = 5 * 1024 * 1024;
    const files = Array.from(fileList);
    const tooBig = files.find(f => f.size > MAX_BYTES);
    if (tooBig) { setAttachError(`${tooBig.name} 파일이 5MB를 초과합니다.`); return; }

    setAttachUploading(true);
    try {
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const attachments = await Promise.all(files.map(async f => ({
        filename: f.name,
        mimeType: f.type,
        dataBase64: await toBase64(f),
      })));
      const res = await apiClient.post(`/tasks/${task.id}/attachments`, { attachments });
      setTask(prev => prev ? { ...prev, attachments: res.data.data } : prev);
    } catch (err: any) {
      setAttachError(err?.response?.data?.message || '첨부파일 등록 중 오류가 발생했습니다.');
    } finally {
      setAttachUploading(false);
    }
  };

  const handleAttachDelete = async (attachmentId: number) => {
    if (!task) return;
    const ok = await confirm('첨부파일을 삭제하시겠습니까?');
    if (!ok) return;
    try {
      await apiClient.delete(`/tasks/${task.id}/attachments/${attachmentId}`);
      setTask(prev => prev ? { ...prev, attachments: (prev.attachments || []).filter(a => a.id !== attachmentId) } : prev);
    } catch {
      setAttachError('첨부파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

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

      const commentsRes = await apiClient.get<{ data: any[] }>(`/tasks/${id}/comments`);
      setComments(commentsRes.data.data);
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

  // 멘션용 전체 사용자 목록 (모든 역할 포함, 1회 prefetch)
  useEffect(() => {
    if (authLoading) return;
    apiClient.get<{ data: Worker[] }>('/users').then((res) => {
      setAllUsers(res.data.data || []);
    }).catch(() => {});
  }, [authLoading]);

  const detectMention = (val: string, pos: number) => {
    const before = val.slice(0, pos);
    const match = before.match(/@([^@\n]*)$/);
    if (match) {
      mentionAnchorRef.current = pos - match[0].length;
      const q = match[1];
      mentionQueryRef.current = q;
      setMentionQuery(q);
    } else {
      mentionQueryRef.current = null;
      setMentionQuery(null);
    }
  };

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentInput(val);
    detectMention(val, e.target.selectionStart ?? val.length);
  }, []);

  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyInput(val);
    detectMention(val, e.target.selectionStart ?? val.length);
  }, []);

  const mentionFiltered = mentionQuery !== null
    ? allUsers.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const insertMentionInto = (
    current: string,
    setter: (v: string) => void,
    taRef: React.RefObject<HTMLTextAreaElement | null>,
    u: Worker
  ) => {
    const anchor = mentionAnchorRef.current;
    const q = mentionQueryRef.current ?? '';
    const before = current.slice(0, anchor);
    const after = current.slice(anchor + 1 + q.length);
    const inserted = `@[${u.name}](${u.id}) `;
    setter(before + inserted + after);
    setMentionQuery(null);
    mentionQueryRef.current = null;
    setTimeout(() => {
      const ta = taRef.current;
      if (ta) {
        const cursor = before.length + inserted.length;
        ta.focus();
        ta.setSelectionRange(cursor, cursor);
      }
    }, 0);
  };

  const renderCommentContent = useCallback((content: string) => {
    const parts = content.split(/(@\[[^\]]+\]\(\d+\))/g);
    return parts.map((part, i) => {
      const m = part.match(/^@\[([^\]]+)\]\((\d+)\)$/);
      if (m) {
        const isSelf = parseInt(m[2]) === (user as any)?.id;
        return (
          <span key={i} className={isSelf ? styles.mentionSelf : styles.mention}>
            @{m[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [user]);

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

  const handleCommentSubmit = async () => {
    const content = commentInput.trim();
    if (!content || commentSaving) return;
    setCommentSaving(true);
    try {
      const res = await apiClient.post<{ data: any }>(`/tasks/${id}/comments`, { content });
      setComments((prev) => [...prev, { ...res.data.data, replies: [] }]);
      setCommentInput('');
      setMentionQuery(null);
    } catch (err: any) {
      setInfoError(err.response?.data?.message || '댓글 작성 실패');
    } finally {
      setCommentSaving(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyTo) return;
    const content = replyInput.trim();
    if (!content || replySaving) return;
    setReplySaving(true);
    try {
      const res = await apiClient.post<{ data: any }>(`/tasks/${id}/comments`, {
        content,
        parentId: replyTo.commentId,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo.commentId
            ? { ...c, replies: [...(c.replies || []), res.data.data] }
            : c
        )
      );
      setReplyInput('');
      setReplyTo(null);
      setMentionQuery(null);
    } catch (err: any) {
      setInfoError(err.response?.data?.message || '답글 작성 실패');
    } finally {
      setReplySaving(false);
    }
  };

  const handleCommentDelete = async (commentId: number, parentId?: number) => {
    if (!(await confirm('댓글을 삭제하시겠습니까?'))) return;
    try {
      await apiClient.delete(`/tasks/${id}/comments/${commentId}`);
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies || []).filter((r: any) => r.id !== commentId) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err: any) {
      setInfoError(err.response?.data?.message || '댓글 삭제 실패');
    }
  };

  const buildKeyDown = (
    submitFn: () => void,
    taRef: React.RefObject<HTMLTextAreaElement | null>,
    valueFn: () => string,
    setterFn: (v: string) => void
  ) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionFiltered.length > 0) {
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMentionInto(valueFn(), setterFn, taRef, mentionFiltered[0]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      submitFn();
    }
    if (e.key === 'Escape' && replyTo) {
      setReplyTo(null);
      setReplyInput('');
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
          <div className={styles.infoRow}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>상태</span>
              <span style={badgeStyle}>{currentStatusDef?.label ?? task.status}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>담당자</span>
              <span className={styles.infoVal}>{task.worker?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>등록자</span>
              <span className={styles.infoVal}>{task.registrant?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>목표일</span>
              <span className={styles.infoVal}>
                {task.targetDate ? new Date(task.targetDate).toLocaleDateString('ko-KR') : '-'}
              </span>
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

      {/* 상세내용 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>상세내용</h2>
          {!editing && canEditNotes && (
            <button onClick={() => setEditing(true)} className={styles.btnSecondary}>
              수정
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <div className={styles.editorWrap}>
              <ReactQuill
                theme="snow"
                value={formData.notes}
                onChange={(val) => setFormData({ ...formData, notes: val })}
                modules={quillModules}
                className={styles.editor}
                placeholder="상세내용을 입력하세요..."
              />
            </div>
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
        ) : task.notes ? (
          <div className={styles.notesContent} dangerouslySetInnerHTML={{ __html: task.notes }} />
        ) : (
          <p className={styles.emptyLogs}>상세내용이 없습니다.</p>
        )}

        <div className={styles.attachSection}>
          <div className={styles.cardHeader}>
            <h3 className={styles.attachTitle}>첨부파일</h3>
            <label className={styles.fileDropBtn}>
              {attachUploading ? '업로드 중...' : '📎 파일 추가'}
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => { handleAttachFiles(e.target.files); e.target.value = ''; }}
                disabled={attachUploading || (task.attachments?.length || 0) >= 5}
              />
            </label>
          </div>
          {attachError && <p className={styles.hintError}>{attachError}</p>}
          {task.attachments && task.attachments.length > 0 ? (
            <ul className={styles.fileList}>
              {task.attachments.map(a => (
                <li key={a.id} className={styles.fileItem}>
                  <a href={`/api/tasks/${task.id}/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className={styles.fileName}>
                    {a.filename}
                  </a>
                  <span className={styles.fileSize}>{formatFileSize(a.size)}</span>
                  <button type="button" className={styles.fileRemoveBtn} onClick={() => handleAttachDelete(a.id)}>✕</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyLogs}>첨부파일이 없습니다.</p>
          )}
        </div>
      </div>

      {/* 타임로그 */}
      <div className={styles.card}>
        <div className={styles.timelogHeader}>
          <div className={styles.totalTimeBox}>
            <span className={styles.totalTimeLabel}>총 소요 시간</span>
            <span className={styles.totalTimeValue}>{totalHours.toFixed(2)} 시간</span>
          </div>
          {timeLogs.length > 0 && (
            <button className={styles.timelogToggle} onClick={() => setShowTimeLogs((v) => !v)}>
              상세 {showTimeLogs ? '▲' : '▼'}
            </button>
          )}
        </div>

        {showTimeLogs && timeLogs.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.th}>시작</th>
                  <th className={styles.th}>종료</th>
                  <th className={styles.th}>소요</th>
                  <th className={styles.th}>보정</th>
                  <th className={styles.th}>최종</th>
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

      {/* 댓글 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>댓글</h2>

        {comments.length === 0 ? (
          <p className={styles.emptyLogs}>아직 댓글이 없습니다.</p>
        ) : (
          <ul className={styles.commentList}>
            {comments.map((c) => (
              <li key={c.id} className={styles.commentItem}>
                <div className={styles.commentAvatar}>{(c.author?.name || '?')[0]}</div>
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>{c.author?.name}</span>
                    <span className={styles.commentDate}>{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                    <button
                      className={styles.commentReplyBtn}
                      onClick={() => {
                        setReplyTo({ commentId: c.id, authorName: c.author?.name || '' });
                        setReplyInput('');
                        setMentionQuery(null);
                        setTimeout(() => replyTextareaRef.current?.focus(), 50);
                      }}
                    >
                      답글
                    </button>
                    {(user?.id === c.author?.id || userRole === 'ADMIN' || userRole === 'LEADER') && (
                      <button className={styles.commentDeleteBtn} onClick={() => handleCommentDelete(c.id)}>
                        삭제
                      </button>
                    )}
                  </div>
                  <p className={styles.commentContent}>{renderCommentContent(c.content)}</p>

                  {/* 대댓글 */}
                  {c.replies && c.replies.length > 0 && (
                    <ul className={styles.replyList}>
                      {c.replies.map((r: any) => (
                        <li key={r.id} className={styles.replyItem}>
                          <div className={styles.replyAvatar}>{(r.author?.name || '?')[0]}</div>
                          <div className={styles.commentBody}>
                            <div className={styles.commentMeta}>
                              <span className={styles.commentAuthor}>{r.author?.name}</span>
                              <span className={styles.commentDate}>{new Date(r.createdAt).toLocaleString('ko-KR')}</span>
                              {(user?.id === r.author?.id || userRole === 'ADMIN' || userRole === 'LEADER') && (
                                <button className={styles.commentDeleteBtn} onClick={() => handleCommentDelete(r.id, c.id)}>
                                  삭제
                                </button>
                              )}
                            </div>
                            <p className={styles.commentContent}>{renderCommentContent(r.content)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 답글 입력창 */}
                  {replyTo?.commentId === c.id && (
                    <div className={styles.replyInputArea}>
                      <div className={styles.commentInputWrapper}>
                        {mentionQuery !== null && mentionFiltered.length > 0 && (
                          <ul className={styles.mentionDropdown}>
                            {mentionFiltered.map((u) => (
                              <li key={u.id}>
                                <button
                                  type="button"
                                  className={styles.mentionItem}
                                  onMouseDown={(e) => { e.preventDefault(); insertMentionInto(replyInput, setReplyInput, replyTextareaRef, u); }}
                                >
                                  <span className={styles.mentionAvatar}>{u.name[0]}</span>
                                  {u.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <textarea
                          ref={replyTextareaRef}
                          value={replyInput}
                          onChange={handleReplyChange}
                          onKeyDown={buildKeyDown(handleReplySubmit, replyTextareaRef, () => replyInput, setReplyInput)}
                          placeholder={`@${c.author?.name}에게 답글... (Enter로 등록)`}
                          className={styles.commentTextarea}
                          rows={2}
                        />
                      </div>
                      <div className={styles.replyActions}>
                        <button onClick={handleReplySubmit} disabled={replySaving || !replyInput.trim()} className={styles.btn}>
                          {replySaving ? '등록 중...' : '등록'}
                        </button>
                        <button onClick={() => { setReplyTo(null); setReplyInput(''); setMentionQuery(null); }} className={styles.btnSecondary}>
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 새 댓글 입력 */}
        <div className={styles.commentInputArea}>
          <div className={styles.commentInputWrapper}>
            {mentionQuery !== null && mentionFiltered.length > 0 && replyTo === null && (
              <ul className={styles.mentionDropdown}>
                {mentionFiltered.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className={styles.mentionItem}
                      onMouseDown={(e) => { e.preventDefault(); insertMentionInto(commentInput, setCommentInput, commentTextareaRef, u); }}
                    >
                      <span className={styles.mentionAvatar}>{u.name[0]}</span>
                      {u.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              ref={commentTextareaRef}
              value={commentInput}
              onChange={handleCommentChange}
              onKeyDown={buildKeyDown(handleCommentSubmit, commentTextareaRef, () => commentInput, setCommentInput)}
              placeholder="댓글을 입력하세요... (@이름으로 멘션, Enter로 등록)"
              className={styles.commentTextarea}
              rows={2}
            />
          </div>
          <button
            onClick={handleCommentSubmit}
            disabled={commentSaving || !commentInput.trim()}
            className={styles.btn}
          >
            {commentSaving ? '등록 중...' : '등록'}
          </button>
        </div>
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
