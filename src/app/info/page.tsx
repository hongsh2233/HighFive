'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';

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
      <ul key={key} style={{ margin: '6px 0', paddingLeft: 20 }}>
        {listItems.map((li, i) => (
          <li key={i} style={{ marginBottom: 3 }}>
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
        result.push(<span key={`line-${i}`} style={{ display: 'block', marginBottom: 4 }}>{renderInline(line)}</span>);
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

  const btnStyle: React.CSSProperties = {
    padding: '3px 9px',
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 5,
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    lineHeight: 1.5,
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', gap: 6, padding: '6px 8px',
        backgroundColor: 'var(--bg-subtle)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button type="button" style={btnStyle} title="굵게" onClick={() => insertFormat('**', '**', '굵은 텍스트')}>
          <strong>B</strong>
        </button>
        <button type="button" style={btnStyle} title="기울임" onClick={() => insertFormat('*', '*', '기울임 텍스트')}>
          <em>I</em>
        </button>
        <button type="button" style={btnStyle} title="목록" onClick={insertBullet}>
          ≡
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
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
        style={{
          width: '100%', padding: '10px 12px', fontSize: 13,
          border: 'none', outline: 'none',
          fontFamily: 'inherit', resize: 'vertical' as const,
          lineHeight: 1.7,
          boxSizing: 'border-box' as const,
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
        }}
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
    <div style={{ padding: '40px 32px', maxWidth: '100%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              프로젝트 정보
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              TMS 사용 가이드 및 자주 묻는 질문
            </p>
          </div>
          {isAdmin && !showForm && (
            <button
              onClick={openAddForm}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + 항목 추가
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${message.type === 'success' ? '#D1FAE5' : '#FECACA'}`,
          }}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '24px',
            marginBottom: 28,
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
              {editingItem ? '항목 수정' : '새 항목 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  질문 / 제목
                </label>
                <input
                  type="text"
                  value={formQ}
                  onChange={e => setFormQ(e.target.value)}
                  placeholder="예: 업무 상태를 어떻게 변경하나요?"
                  required
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: 13,
                    border: '1px solid var(--border)', borderRadius: 7,
                    boxSizing: 'border-box' as const, fontFamily: 'inherit',
                    backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  내용 / 답변
                </label>
                <SimpleEditor
                  value={formA}
                  onChange={setFormA}
                  placeholder="내용을 입력하세요... (**굵게**, *기울임*, - 목록 사용 가능)"
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px', backgroundColor: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {submitting ? '저장 중...' : (editingItem ? '수정' : '추가')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '8px 16px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)',
                    border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
            로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--text-muted)', fontSize: 13,
          }}>
            {isAdmin ? '+ 항목 추가 버튼으로 첫 번째 정보를 등록하세요.' : '등록된 정보가 없습니다.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, idx) => {
              const isOpen = openIds.has(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 20px',
                      cursor: 'pointer',
                      userSelect: 'none' as const,
                    }}
                    onClick={() => toggleAccordion(item.id)}
                  >
                    <span style={{
                      width: 24, height: 24,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isOpen ? 'var(--accent-light)' : 'var(--bg-subtle)',
                      color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      marginRight: 14, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{
                      flex: 1, fontSize: 14, fontWeight: 600,
                      color: isOpen ? 'var(--accent)' : 'var(--text-primary)',
                    }}>
                      {item.question}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isAdmin && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openEditForm(item); }}
                            style={{
                              padding: '3px 10px', fontSize: 11, fontWeight: 600,
                              backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)',
                              border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer',
                            }}
                          >
                            수정
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                            style={{
                              padding: '3px 10px', fontSize: 11, fontWeight: 600,
                              backgroundColor: 'transparent', color: 'var(--danger)',
                              border: '1px solid #FECACA', borderRadius: 5, cursor: 'pointer',
                            }}
                          >
                            삭제
                          </button>
                        </>
                      )}
                      <span style={{
                        fontSize: 14, color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        display: 'inline-block',
                        marginLeft: 4,
                      }}>
                        ▾
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{
                      padding: '14px 20px 18px 58px',
                      borderTop: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        {renderAnswer(item.answer)}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
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
