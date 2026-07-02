'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './wiki.module.css';
import Spinner from '@/components/common/Spinner';

interface Project {
  id: number;
  name: string;
  status: string;
  members: { user: { id: number } }[];
}

interface WikiSearchResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string;
  updatedAt: string;
}

function SimpleEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string, sample: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || sample;
    const newVal = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const insertBullet = () => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newVal = value.slice(0, lineStart) + '- ' + value.slice(lineStart);
    onChange(newVal);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2); });
  };

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.editorToolbar}>
        <button type="button" className={styles.editorBtn} title="굵게" onClick={() => insertFormat('**', '**', '굵은 텍스트')}><strong>B</strong></button>
        <button type="button" className={styles.editorBtn} title="기울임" onClick={() => insertFormat('*', '*', '기울임 텍스트')}><em>I</em></button>
        <button type="button" className={styles.editorBtn} title="목록" onClick={insertBullet}>≡</button>
        <span className={styles.editorHint}>**굵게** *기울임* - 목록</span>
      </div>
      <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required rows={8} className={styles.editorTextarea} />
    </div>
  );
}

export default function WikiHubPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    try {
      const [projectsRes, docsRes] = await Promise.all([
        apiClient.get<{ data: Project[] }>('/projects'),
        apiClient.get<{ data: WikiSearchResult[] }>('/wiki/search?q='),
      ]);
      const userId = Number(user?.id);
      const isAdmin = (user as any)?.role === 'ADMIN';
      // 위키는 프로젝트 소속 멤버만 작성 가능하므로, 업무 배정만으로 노출되는 프로젝트는 제외
      const writable = projectsRes.data.data.filter(
        (p) => p.status === 'ACTIVE' && (isAdmin || p.members?.some((m) => m.user.id === userId))
      );
      setProjects(writable);
      setDocs(docsRes.data.data);
    } catch {
      setMessage({ type: 'error', text: '위키 목록 조회에 실패했습니다.' });
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
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      setMessage({ type: 'error', text: '문서를 등록할 프로젝트를 선택해주세요.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post(`/projects/${formProjectId}/wiki`, { title: formTitle, content: formContent });
      setShowForm(false);
      setMessage({ type: 'success', text: '위키 문서가 등록되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '등록 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = docs.reduce<Record<string, WikiSearchResult[]>>((acc, doc) => {
    (acc[doc.projectName] ??= []).push(doc);
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
            <h1 className={styles.pageTitle}>위키</h1>
            <p className={styles.pageSubtitle}>소속된 프로젝트의 문서를 모아 보고 새 문서를 등록합니다.</p>
          </div>
          {!showForm && projects.length > 0 && (
            <button onClick={openCreateForm} className={styles.btnPrimary}>+ 문서 등록</button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {projects.length === 0 ? (
          <div className={styles.empty}>소속된 프로젝트가 없어 위키를 사용할 수 없습니다. 관리자에게 프로젝트 배정을 요청하세요.</div>
        ) : (
          <>
            {showForm && (
              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>새 문서 등록</h2>
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>프로젝트</label>
                    <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className={styles.input}>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>제목</label>
                    <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="예: 배포 절차" required className={styles.input} />
                  </div>
                  <div className={styles.formGroupLast}>
                    <label className={styles.label}>내용</label>
                    <SimpleEditor value={formContent} onChange={setFormContent} placeholder="내용을 입력하세요... (**굵게**, *기울임*, - 목록 사용 가능)" />
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                      {submitting ? '등록 중...' : '등록'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className={styles.btnCancel}>취소</button>
                  </div>
                </form>
              </div>
            )}

            {docs.length === 0 ? (
              <div className={styles.empty}>등록된 위키 문서가 없습니다. + 문서 등록으로 첫 문서를 만들어보세요.</div>
            ) : (
              Object.entries(grouped).map(([projectName, items]) => (
                <div key={projectName} className={styles.projectSection}>
                  <h2 className={styles.projectSectionTitle}>{projectName}</h2>
                  <div className={styles.docList}>
                    {items.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        className={styles.docItem}
                        onClick={() => router.push(`/projects/${doc.projectId}/wiki?open=${doc.id}`)}
                      >
                        <div className={styles.docTitle}>{doc.title}</div>
                        <div className={styles.docSnippet}>{doc.snippet}</div>
                        <div className={styles.docMeta}>{new Date(doc.updatedAt).toLocaleDateString('ko-KR')}</div>
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
