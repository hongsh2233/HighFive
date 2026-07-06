'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './my-notes.module.css';
import Spinner from '@/components/common/Spinner';
import SimpleEditor from '@/components/common/SimpleEditor';

const MAX_PAGES = 3;

interface UserPageDoc {
  id: number;
  title: string;
  content: string;
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

export default function MyNotesPage() {
  const { isLoading: authLoading } = useAuth();
  const [pages, setPages] = useState<UserPageDoc[]>([]);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<UserPageDoc | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    try {
      const res = await apiClient.get<{ data: UserPageDoc[] }>('/my-pages');
      setPages(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '문서 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const toggleAccordion = (pageId: number) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(pageId) ? next.delete(pageId) : next.add(pageId);
      return next;
    });
  };

  const openCreateForm = () => {
    setEditingPage(null);
    setFormTitle('');
    setFormContent('');
    setShowForm(true);
    setMessage(null);
  };

  const openEditForm = (page: UserPageDoc) => {
    setEditingPage(page);
    setFormTitle(page.title);
    setFormContent(page.content);
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      if (editingPage) {
        await apiClient.patch(`/my-pages/${editingPage.id}`, { title: formTitle, content: formContent });
        setMessage({ type: 'success', text: '수정되었습니다.' });
      } else {
        await apiClient.post('/my-pages', { title: formTitle, content: formContent });
        setMessage({ type: 'success', text: '문서가 등록되었습니다.' });
      }
      setShowForm(false);
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pageId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/my-pages/${pageId}`);
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '삭제 실패' });
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  const atLimit = pages.length >= MAX_PAGES;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>내 자료</h1>
            <p className={styles.pageSubtitle}>
              나만 보는 개인 자료 보관 공간입니다. <span className={styles.countBadge}>({pages.length}/{MAX_PAGES})</span>
            </p>
          </div>
          {!showForm && (
            <button
              onClick={openCreateForm}
              className={styles.btnPrimary}
              disabled={atLimit}
              title={atLimit ? `문서는 최대 ${MAX_PAGES}개까지 만들 수 있습니다.` : undefined}
            >
              + 새 문서
            </button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {atLimit && !showForm && (
          <div className={styles.message}>문서는 최대 {MAX_PAGES}개까지 만들 수 있습니다. 새 문서를 만들려면 기존 문서를 삭제하세요.</div>
        )}

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>{editingPage ? '문서 수정' : '새 문서 작성'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>제목</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="예: 참고 링크 모음" required className={styles.input} />
              </div>
              <div className={styles.formGroupLast}>
                <label className={styles.label}>내용</label>
                <SimpleEditor value={formContent} onChange={setFormContent} placeholder="내용을 입력하세요... (**굵게**, *기울임*, - 목록 사용 가능)" />
              </div>
              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                  {submitting ? '저장 중...' : (editingPage ? '수정' : '등록')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className={styles.btnCancel}>취소</button>
              </div>
            </form>
          </div>
        )}

        {pages.length === 0 ? (
          <div className={styles.empty}>등록된 문서가 없습니다. + 새 문서로 첫 자료를 만들어보세요.</div>
        ) : (
          <div className={styles.list}>
            {pages.map((page) => {
              const isOpen = openIds.has(page.id);
              return (
                <div key={page.id} className={styles.accordion} data-open={isOpen ? 'true' : 'false'}>
                  <div className={styles.accordionHeader} onClick={() => toggleAccordion(page.id)}>
                    <span className={styles.accordionTitle} data-open={isOpen ? 'true' : 'false'}>{page.title}</span>
                    <div className={styles.accordionControls}>
                      <button onClick={e => { e.stopPropagation(); openEditForm(page); }} className={styles.btnEdit}>수정</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(page.id); }} className={styles.btnDelete}>삭제</button>
                      <span className={styles.chevron} data-open={isOpen ? 'true' : 'false'}>▾</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className={styles.accordionBody}>
                      <div className={styles.contentText}>{renderContent(page.content)}</div>
                      <div className={styles.contentMeta}>
                        {new Date(page.updatedAt).toLocaleString('ko-KR')}
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
