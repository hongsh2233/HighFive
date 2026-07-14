'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDictation } from '@/hooks/useDictation';
import apiClient from '@/lib/api-client';
import styles from './meetings.module.css';
import Spinner from '@/components/common/Spinner';
import SimpleEditor from '@/components/common/SimpleEditor';
import { useDialog } from '@/components/common/DialogProvider';

interface MeetingNote {
  id: number;
  title: string;
  content: string;
  attendees: string | null;
  meetingDate: string | null;
  author: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

// Renders content text: **bold**, *italic*, - list, newlines
function renderContent(text: string) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    result.push(
      <ul key={key} className={styles.contentList}>
        {listItems.map((li, i) => (
          <li key={i} className={styles.contentListItem}>{renderInline(li)}</li>
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
        result.push(<span key={`line-${i}`} className={styles.contentLine}>{renderInline(line)}</span>);
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
  const searchParams = useSearchParams();
  const openParam = searchParams.get('open');

  const { user, isLoading: authLoading } = useAuth();
  const { confirm } = useDialog();
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAttendees, setFormAttendees] = useState('');
  const [formMeetingDate, setFormMeetingDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dictation = useDictation((finalText) => {
    setFormContent((prev) => (prev ? `${prev} ${finalText}` : finalText));
  });

  const fetchAll = async () => {
    try {
      const [projectRes, notesRes] = await Promise.all([
        apiClient.get<{ data: { name: string } }>(`/projects/${projectId}`),
        apiClient.get<{ data: MeetingNote[] }>(`/projects/${projectId}/meetings`),
      ]);
      setProjectName(projectRes.data.data.name);
      setNotes(notesRes.data.data);
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

  useEffect(() => {
    if (openParam) {
      const openId = parseInt(openParam);
      if (!isNaN(openId)) setOpenIds(prev => new Set(prev).add(openId));
    }
  }, [openParam]);

  const toggleAccordion = (noteId: number) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      return next;
    });
  };

  const openCreateForm = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormAttendees('');
    setFormMeetingDate('');
    setShowForm(true);
  };

  const openEditForm = (note: MeetingNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormAttendees(note.attendees || '');
    setFormMeetingDate(note.meetingDate ? note.meetingDate.slice(0, 10) : '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dictation.listening && dictation.toggle();
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = { title: formTitle, content: formContent, attendees: formAttendees, meetingDate: formMeetingDate || null };
      if (editingNote) {
        await apiClient.patch(`/projects/${projectId}/meetings/${editingNote.id}`, payload);
        setMessage({ type: 'success', text: '수정되었습니다.' });
      } else {
        await apiClient.post(`/projects/${projectId}/meetings`, payload);
        setMessage({ type: 'success', text: '회의록이 등록되었습니다.' });
      }
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

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (accessDenied) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.empty}>해당 프로젝트 멤버만 회의록을 볼 수 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <Link href="/projects" className={styles.backLink}>← 프로젝트</Link>
            <h1 className={styles.pageTitle}>{projectName} 회의록</h1>
            <p className={styles.pageSubtitle}>프로젝트 멤버만 열람/작성할 수 있는 회의록 공간입니다.</p>
          </div>
          {!showForm && (
            <button onClick={openCreateForm} className={styles.btnPrimary}>+ 회의록 작성</button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>{editingNote ? '회의록 수정' : '새 회의록 작성'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>제목</label>
                  <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="예: 7월 3주차 주간회의" required className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>회의 일자</label>
                  <input type="date" value={formMeetingDate} onChange={e => setFormMeetingDate(e.target.value)} className={styles.input} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>참석자</label>
                <input type="text" value={formAttendees} onChange={e => setFormAttendees(e.target.value)} placeholder="예: 홍길동, 김철수" className={styles.input} />
              </div>
              <div className={styles.formGroupLast}>
                <label className={styles.label}>내용</label>
                <div className={styles.dictateRow}>
                  {dictation.supported ? (
                    <button
                      type="button"
                      onClick={dictation.toggle}
                      className={dictation.listening ? styles.dictateBtnActive : styles.dictateBtn}
                    >
                      {dictation.listening ? '⏹ 받아쓰기 중지' : '🎙️ 받아쓰기 시작'}
                    </button>
                  ) : (
                    <span className={styles.dictateHint}>이 브라우저는 음성인식을 지원하지 않습니다(Chrome/Edge 권장). 직접 입력해주세요.</span>
                  )}
                </div>
                <SimpleEditor value={formContent} onChange={setFormContent} placeholder="회의 내용을 입력하거나 받아쓰기를 사용하세요..." />
                {dictation.interim && <p className={styles.dictateInterim}>{dictation.interim}</p>}
              </div>
              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                  {submitting ? '저장 중...' : (editingNote ? '수정' : '등록')}
                </button>
                <button type="button" onClick={() => { dictation.listening && dictation.toggle(); setShowForm(false); }} className={styles.btnCancel}>취소</button>
              </div>
            </form>
          </div>
        )}

        {notes.length === 0 ? (
          <div className={styles.empty}>등록된 회의록이 없습니다. + 회의록 작성으로 첫 회의록을 만들어보세요.</div>
        ) : (
          <div className={styles.list}>
            {notes.map((note) => {
              const isOpen = openIds.has(note.id);
              const canDelete = note.author.id === Number(user?.id) || user?.role === 'ADMIN';
              return (
                <div key={note.id} className={styles.accordion} data-open={isOpen ? 'true' : 'false'}>
                  <div className={styles.accordionHeader} onClick={() => toggleAccordion(note.id)}>
                    <span className={styles.accordionTitle} data-open={isOpen ? 'true' : 'false'}>{note.title}</span>
                    <div className={styles.accordionControls}>
                      <button onClick={e => { e.stopPropagation(); openEditForm(note); }} className={styles.btnEdit}>수정</button>
                      {canDelete && (
                        <button onClick={e => { e.stopPropagation(); handleDelete(note.id); }} className={styles.btnDelete}>삭제</button>
                      )}
                      <span className={styles.chevron} data-open={isOpen ? 'true' : 'false'}>▾</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className={styles.accordionBody}>
                      {(note.meetingDate || note.attendees) && (
                        <div className={styles.metaAttendees}>
                          {note.meetingDate && new Date(note.meetingDate).toLocaleDateString('ko-KR')}
                          {note.meetingDate && note.attendees && ' · '}
                          {note.attendees && `참석자: ${note.attendees}`}
                        </div>
                      )}
                      <div className={styles.contentText}>{renderContent(note.content)}</div>
                      <div className={styles.contentMeta}>
                        {note.author.name} · {new Date(note.updatedAt).toLocaleString('ko-KR')}
                      </div>
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
