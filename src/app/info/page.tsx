'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './info.module.css';
import Spinner from '@/components/common/Spinner';

interface InfoItem {
  id: number;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  author: { id: number; name: string };
  createdAt: string;
}

// Renders answer text: **bold**, *italic*, - list, newlines
function renderAnswer(text: string) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    result.push(
      <ul key={key} className={styles.answerList}>
        {listItems.map((li, i) => (
          <li key={i} className={styles.answerListItem}>
            {renderInline(li)}
          </li>
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
        result.push(<span key={`line-${i}`} className={styles.answerLine}>{renderInline(line)}</span>);
      }
    }
  });
  flushList('list-end');
  return result;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function SimpleEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string, sample: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || sample;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newVal = before + prefix + selected + suffix + after;
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
    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);
    const newVal = before + '- ' + after;
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + 2, start + 2);
    });
  };

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.editorToolbar}>
        <button type="button" className={styles.editorBtn} title="굵게" onClick={() => insertFormat('**', '**', '굵은 텍스트')}>
          <strong>B</strong>
        </button>
        <button type="button" className={styles.editorBtn} title="기울임" onClick={() => insertFormat('*', '*', '기울임 텍스트')}>
          <em>I</em>
        </button>
        <button type="button" className={styles.editorBtn} title="목록" onClick={insertBullet}>
          ≡
        </button>
        <span className={styles.editorHint}>
          **굵게** *기울임* - 목록
        </span>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        rows={8}
        className={styles.editorTextarea}
      />
    </div>
  );
}

export default function InfoPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [items, setItems] = useState<InfoItem[]>([]);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InfoItem | null>(null);
  const [formQ, setFormQ] = useState('');
  const [formA, setFormA] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    try {
      const res = await apiClient.get<{ data: InfoItem[] }>('/info');
      setItems(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const toggleAccordion = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAddForm = () => {
    setEditingItem(null);
    setFormQ('');
    setFormA('');
    setFormOrder(items.length);
    setShowForm(true);
  };

  const openEditForm = (item: InfoItem) => {
    setEditingItem(item);
    setFormQ(item.question);
    setFormA(item.answer);
    setFormOrder(item.order);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      if (editingItem) {
        await apiClient.patch(`/info/${editingItem.id}`, { question: formQ, answer: formA, order: formOrder });
        setMessage({ type: 'success', text: '수정되었습니다.' });
      } else {
        await apiClient.post('/info', { question: formQ, answer: formA, order: formOrder });
        setMessage({ type: 'success', text: '등록되었습니다.' });
      }
      setShowForm(false);
      await fetchItems();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage({ type: 'error', text: msg || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/info/${id}`);
      await fetchItems();
    } catch {
      setMessage({ type: 'error', text: '삭제 실패' });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              프로젝트 정보
            </h1>
            <p className={styles.pageSubtitle}>
              High5 사용 가이드 및 자주 묻는 질문
            </p>
          </div>
          {isAdmin && !showForm && (
            <button onClick={openAddForm} className={styles.btnPrimary}>
              + 항목 추가
            </button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>
              {editingItem ? '항목 수정' : '새 항목 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  질문 / 제목
                </label>
                <input
                  type="text"
                  value={formQ}
                  onChange={e => setFormQ(e.target.value)}
                  placeholder="예: 업무 상태를 어떻게 변경하나요?"
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroupLast}>
                <label className={styles.label}>
                  내용 / 답변
                </label>
                <SimpleEditor
                  value={formA}
                  onChange={setFormA}
                  placeholder="내용을 입력하세요... (**굵게**, *기울임*, - 목록 사용 가능)"
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.btnSubmit}
                >
                  {submitting ? '저장 중...' : (editingItem ? '수정' : '추가')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={styles.btnCancel}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}><Spinner /></div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            {isAdmin ? '+ 항목 추가 버튼으로 첫 번째 정보를 등록하세요.' : '등록된 정보가 없습니다.'}
          </div>
        ) : (
          <div className={styles.list}>
            {items.map((item, idx) => {
              const isOpen = openIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={styles.accordion}
                  data-open={isOpen ? 'true' : 'false'}
                >
                  <div
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion(item.id)}
                  >
                    <span className={styles.accordionIndex} data-open={isOpen ? 'true' : 'false'}>
                      {idx + 1}
                    </span>
                    <span className={styles.accordionQuestion} data-open={isOpen ? 'true' : 'false'}>
                      {item.question}
                    </span>
                    <div className={styles.accordionControls}>
                      {isAdmin && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openEditForm(item); }}
                            className={styles.btnEdit}
                          >
                            수정
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                            className={styles.btnDelete}
                          >
                            삭제
                          </button>
                        </>
                      )}
                      <span className={styles.chevron} data-open={isOpen ? 'true' : 'false'}>
                        ▾
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className={styles.accordionBody}>
                      <div className={styles.answerText}>
                        {renderAnswer(item.answer)}
                      </div>
                      <div className={styles.answerMeta}>
                        등록: {item.author.name} · {new Date(item.createdAt).toLocaleDateString('ko-KR')}
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
