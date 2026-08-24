'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import wikiStyles from '../wiki/wiki.module.css';
import styles from './meetings.module.css';
import Spinner from '@/components/common/Spinner';
import SimpleEditor from '@/components/common/SimpleEditor';
import { useDialog } from '@/components/common/DialogProvider';

interface ActionItem {
  id: number;
  content: string;
  assignee: { id: number; name: string } | null;
  targetDate: string | null;
  status: 'OPEN' | 'CONVERTED';
  taskId: number | null;
}

interface MeetingNote {
  id: number;
  title: string;
  meetingDate: string | null;
  attendees: string | null;
  content: string;
  author: { id: number; name: string };
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

interface WorkerOption { id: number; name: string; }

interface DraftItem { content: string; assigneeId: string; targetDate: string; }

// Renders content text: **bold**, *italic*, - list, newlines (wiki 페이지와 동일 패턴)
function renderContent(text: string) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    result.push(
      <ul key={key} className={wikiStyles.contentList}>
        {listItems.map((li, i) => (
          <li key={i} className={wikiStyles.contentListItem}>{renderInline(li)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    if (/^[-*] /.test(line)) {
      listItems.push(line.slice(2));
    } else {
      flushList(`list-${i}`);
      if (line.trim() === '') {
        result.push(<br key={`br-${i}`} />);
      } else {
        result.push(<span key={`line-${i}`} className={wikiStyles.contentLine}>{renderInline(line)}</span>);
      }
    }
  });
  flushList('list-end');
  return result;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function ProjectMeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id);

  const { user, isLoading: authLoading } = useAuth();
  const { confirm } = useDialog();
  const [projectName, setProjectName] = useState('');
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formAttendees, setFormAttendees] = useState('');
  const [formContent, setFormContent] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canConvert = ['ADMIN', 'LEADER'].includes(user?.role || '');

  const fetchAll = async () => {
    try {
      const [projectRes, meetingRes, workerRes] = await Promise.all([
        apiClient.get<{ data: { name: string } }>(`/projects/${projectId}`),
        apiClient.get<{ data: MeetingNote[] }>(`/projects/${projectId}/meetings`),
        apiClient.get<{ data: WorkerOption[] }>('/users?role=WORKER'),
      ]);
      setProjectName(projectRes.data.data.name);
      setMeetings(meetingRes.data.data);
      setWorkers(workerRes.data.data);
      setAccessDenied(false);
    } catch (err: any) {
      if (err.response?.status === 403) setAccessDenied(true);
      else setMessage({ type: 'error', text: '회의록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const toggleAccordion = (noteId: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      return next;
    });
  };

  const openCreateForm = () => {
    setFormTitle('');
    setFormDate('');
    setFormAttendees('');
    setFormContent('');
    setDraftItems([]);
    setShowForm(true);
  };

  const addDraftItem = () => setDraftItems((prev) => [...prev, { content: '', assigneeId: '', targetDate: '' }]);
  const removeDraftItem = (idx: number) => setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  const updateDraftItem = (idx: number, patch: Partial<DraftItem>) =>
    setDraftItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post(`/projects/${projectId}/meetings`, {
        title: formTitle,
        meetingDate: formDate || undefined,
        attendees: formAttendees || undefined,
        content: formContent,
        actionItems: draftItems.filter((it) => it.content.trim()),
      });
      setMessage({ type: 'success', text: '회의록이 작성되었습니다.' });
      setShowForm(false);
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!(await confirm('정말 삭제하시겠습니까?'))) return;
    try {
      await apiClient.delete(`/projects/${projectId}/meetings/${noteId}`);
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '삭제 실패' });
    }
  };

  const convertItem = async (noteId: number, item: ActionItem) => {
    const workerId = item.assignee?.id;
    if (!workerId) {
      setMessage({ type: 'error', text: '담당예정자가 지정된 항목만 전환할 수 있습니다.' });
      return;
    }
    try {
      await apiClient.post(`/projects/${projectId}/meetings/${noteId}/action-items/${item.id}/convert`, { workerId });
      setMessage({ type: 'success', text: '업무로 전환되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '전환에 실패했습니다.' });
    }
  };

  if (authLoading || loading) {
    return <div className={wikiStyles.loading}><Spinner /></div>;
  }

  if (accessDenied) {
    return (
      <div className={wikiStyles.page}>
        <div className={wikiStyles.inner}>
          <div className={wikiStyles.empty}>해당 프로젝트 멤버만 회의록을 볼 수 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={wikiStyles.page}>
      <div className={wikiStyles.inner}>
        <div className={wikiStyles.pageHeader}>
          <div>
            <Link href="/projects" className={wikiStyles.backLink}>← 프로젝트</Link>
            <h1 className={wikiStyles.pageTitle}>{projectName} 회의록</h1>
            <p className={wikiStyles.pageSubtitle}>미팅 결정사항과 액션아이템을 기록하고, 업무로 전환할 수 있습니다.</p>
          </div>
          {!showForm && (
            <button onClick={openCreateForm} className={wikiStyles.btnPrimary}>+ 회의록 작성</button>
          )}
        </div>

        {message && (
          <div className={`${wikiStyles.message} ${message.type === 'success' ? wikiStyles.messageSuccess : wikiStyles.messageError}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className={wikiStyles.formCard}>
            <h2 className={wikiStyles.formTitle}>새 회의록 작성</h2>
            <form onSubmit={handleSubmit}>
              <div className={wikiStyles.formGroup}>
                <label className={wikiStyles.label}>제목</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="예: 8월 정기 미팅" required className={wikiStyles.input} />
              </div>
              <div className={wikiStyles.formGroup}>
                <label className={wikiStyles.label}>일시</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={wikiStyles.input} />
              </div>
              <div className={wikiStyles.formGroup}>
                <label className={wikiStyles.label}>참석자</label>
                <input type="text" value={formAttendees} onChange={(e) => setFormAttendees(e.target.value)} placeholder="예: 홍길동, 김철수" className={wikiStyles.input} />
              </div>
              <div className={wikiStyles.formGroupLast}>
                <label className={wikiStyles.label}>내용</label>
                <SimpleEditor value={formContent} onChange={setFormContent} placeholder="결정사항, 논의 내용을 입력하세요..." />
              </div>

              <div className={wikiStyles.formGroupLast}>
                <label className={wikiStyles.label}>액션아이템</label>
                <div className={styles.actionItemList}>
                  {draftItems.map((it, idx) => (
                    <div key={idx} className={styles.actionItemRow}>
                      <input
                        type="text"
                        value={it.content}
                        onChange={(e) => updateDraftItem(idx, { content: e.target.value })}
                        placeholder="할 일 내용"
                        className={styles.actionItemInput}
                      />
                      <select
                        value={it.assigneeId}
                        onChange={(e) => updateDraftItem(idx, { assigneeId: e.target.value })}
                        className={styles.actionItemSelect}
                      >
                        <option value="">담당예정자</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={it.targetDate}
                        onChange={(e) => updateDraftItem(idx, { targetDate: e.target.value })}
                        className={styles.actionItemDate}
                      />
                      <button type="button" onClick={() => removeDraftItem(idx)} className={styles.btnRemoveItem}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addDraftItem} className={styles.btnAddItem}>+ 액션아이템 추가</button>
              </div>

              <div className={wikiStyles.formActions}>
                <button type="submit" disabled={submitting} className={wikiStyles.btnSubmit}>
                  {submitting ? '저장 중...' : '등록'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className={wikiStyles.btnCancel}>취소</button>
              </div>
            </form>
          </div>
        )}

        {meetings.length === 0 ? (
          <div className={wikiStyles.empty}>등록된 회의록이 없습니다. + 회의록 작성으로 첫 회의록을 만들어보세요.</div>
        ) : (
          <div className={wikiStyles.list}>
            {meetings.map((note) => {
              const isOpen = openIds.has(note.id);
              const canDelete = note.author.id === Number(user?.id) || user?.role === 'ADMIN';
              return (
                <div key={note.id} className={wikiStyles.accordion} data-open={isOpen ? 'true' : 'false'}>
                  <div className={wikiStyles.accordionHeader} onClick={() => toggleAccordion(note.id)}>
                    <span className={wikiStyles.accordionTitle} data-open={isOpen ? 'true' : 'false'}>
                      {note.title}{note.meetingDate ? ` (${new Date(note.meetingDate).toLocaleDateString('ko-KR')})` : ''}
                    </span>
                    <div className={wikiStyles.accordionControls}>
                      {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className={wikiStyles.btnDelete}>삭제</button>
                      )}
                      <span className={wikiStyles.chevron} data-open={isOpen ? 'true' : 'false'}>▾</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className={wikiStyles.accordionBody}>
                      {note.attendees && <div className={wikiStyles.contentMeta}>참석자: {note.attendees}</div>}
                      <div className={wikiStyles.contentText}>{renderContent(note.content)}</div>
                      <div className={wikiStyles.contentMeta}>
                        {note.author.name} · {new Date(note.updatedAt).toLocaleString('ko-KR')}
                      </div>

                      {note.actionItems.length > 0 && (
                        <div className={styles.actionItemList}>
                          {note.actionItems.map((item) => (
                            <div key={item.id} className={styles.actionItemDisplay}>
                              <span className={`${styles.actionItemContent} ${item.status === 'CONVERTED' ? styles.actionItemConverted : ''}`}>
                                {item.content}
                              </span>
                              <span className={styles.actionItemMeta}>
                                {item.assignee?.name || '미지정'}{item.targetDate ? ` · ${new Date(item.targetDate).toLocaleDateString('ko-KR')}` : ''}
                              </span>
                              {item.status === 'OPEN' && canConvert && (
                                <button onClick={() => convertItem(note.id, item)} className={styles.btnConvert}>업무로 전환</button>
                              )}
                              {item.status === 'CONVERTED' && (
                                <span className={styles.actionItemMeta}>전환됨 → 업무#{item.taskId}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
