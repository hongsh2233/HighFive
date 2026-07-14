'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDictation } from '@/hooks/useDictation';
import apiClient from '@/lib/api-client';
import styles from './meetings.module.css';
import Spinner from '@/components/common/Spinner';
import SimpleEditor from '@/components/common/SimpleEditor';

interface Project {
  id: number;
  name: string;
  status: string;
  members: { user: { id: number } }[];
}

interface MeetingSearchResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string;
  meetingDate: string | null;
  updatedAt: string;
}

export default function MeetingsHubPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<MeetingSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState('');
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
      const [projectsRes, notesRes] = await Promise.all([
        apiClient.get<{ data: Project[] }>('/projects'),
        apiClient.get<{ data: MeetingSearchResult[] }>('/meetings/search?q='),
      ]);
      const userId = Number(user?.id);
      const isAdmin = (user as any)?.role === 'ADMIN';
      const writable = projectsRes.data.data.filter(
        (p) => p.status === 'ACTIVE' && (isAdmin || p.members?.some((m) => m.user.id === userId))
      );
      setProjects(writable);
      setNotes(notesRes.data.data);
    } catch {
      setMessage({ type: 'error', text: '회의록 목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const openCreateForm = () => {
    setFormProjectId(projects[0] ? String(projects[0].id) : '');
    setFormTitle('');
    setFormContent('');
    setFormAttendees('');
    setFormMeetingDate('');
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      setMessage({ type: 'error', text: '회의록을 등록할 프로젝트를 선택해주세요.' });
      return;
    }
    dictation.listening && dictation.toggle();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post(`/projects/${formProjectId}/meetings`, {
        title: formTitle,
        content: formContent,
        attendees: formAttendees,
        meetingDate: formMeetingDate || null,
      });
      setShowForm(false);
      setMessage({ type: 'success', text: '회의록이 등록되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '등록 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = notes.reduce<Record<string, MeetingSearchResult[]>>((acc, note) => {
    (acc[note.projectName] ??= []).push(note);
    return acc;
  }, {});

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>회의록</h1>
            <p className={styles.pageSubtitle}>소속된 프로젝트의 회의록을 모아 보고, 음성 받아쓰기로 새 회의록을 작성합니다.</p>
          </div>
          {!showForm && projects.length > 0 && (
            <button onClick={openCreateForm} className={styles.btnPrimary}>+ 회의록 작성</button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {projects.length === 0 ? (
          <div className={styles.empty}>소속된 프로젝트가 없어 회의록을 사용할 수 없습니다. 관리자에게 프로젝트 배정을 요청하세요.</div>
        ) : (
          <>
            {showForm && (
              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>새 회의록 작성</h2>
                <form onSubmit={handleSubmit}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>프로젝트</label>
                      <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className={styles.input}>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>회의 일자</label>
                      <input type="date" value={formMeetingDate} onChange={(e) => setFormMeetingDate(e.target.value)} className={styles.input} />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>제목</label>
                    <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="예: 7월 3주차 주간회의" required className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>참석자</label>
                    <input type="text" value={formAttendees} onChange={(e) => setFormAttendees(e.target.value)} placeholder="예: 홍길동, 김철수" className={styles.input} />
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
                      {submitting ? '등록 중...' : '등록'}
                    </button>
                    <button type="button" onClick={() => { dictation.listening && dictation.toggle(); setShowForm(false); }} className={styles.btnCancel}>취소</button>
                  </div>
                </form>
              </div>
            )}

            {notes.length === 0 ? (
              <div className={styles.empty}>등록된 회의록이 없습니다. + 회의록 작성으로 첫 회의록을 만들어보세요.</div>
            ) : (
              Object.entries(grouped).map(([projectName, items]) => (
                <div key={projectName} className={styles.projectSection}>
                  <h2 className={styles.projectSectionTitle}>{projectName}</h2>
                  <div className={styles.docList}>
                    {items.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        className={styles.docItem}
                        onClick={() => router.push(`/projects/${note.projectId}/meetings?open=${note.id}`)}
                      >
                        <div className={styles.docTitle}>{note.title}</div>
                        {note.meetingDate && (
                          <div className={styles.docAttendees}>{new Date(note.meetingDate).toLocaleDateString('ko-KR')}</div>
                        )}
                        <div className={styles.docSnippet}>{note.snippet}</div>
                        <div className={styles.docMeta}>{new Date(note.updatedAt).toLocaleDateString('ko-KR')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
