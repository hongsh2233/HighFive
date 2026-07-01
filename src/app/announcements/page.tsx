'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './announcements.module.css';

interface Announcement {
  id: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  author: { id: number; name: string };
}

export default function AnnouncementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canManage = ['ADMIN', 'LEADER'].includes(user?.role || '');

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    try {
      const res = await apiClient.get<{ data: Announcement[] }>('/announcements?all=true');
      setItems(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && canManage) fetchItems();
    else if (!authLoading) setLoading(false);
  }, [authLoading, canManage]);

  const openCreateForm = () => {
    setEditingItem(null);
    setContent('');
    setShowForm(true);
  };

  const openEditForm = (item: Announcement) => {
    setEditingItem(item);
    setContent(item.content);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      if (editingItem) {
        await apiClient.patch(`/announcements/${editingItem.id}`, { content });
        setMessage({ type: 'success', text: '수정되었습니다.' });
      } else {
        await apiClient.post('/announcements', { content });
        setMessage({ type: 'success', text: '공지가 등록되었습니다.' });
      }
      setShowForm(false);
      await fetchItems();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (item: Announcement) => {
    try {
      await apiClient.patch(`/announcements/${item.id}`, { isActive: !item.isActive });
      await fetchItems();
    } catch {
      setMessage({ type: 'error', text: '처리 실패' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/announcements/${id}`);
      await fetchItems();
    } catch {
      setMessage({ type: 'error', text: '삭제 실패' });
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (!canManage) {
    return <div className={styles.loading}>관리자/리더만 접근 가능합니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>공지사항</h1>
            <p className={styles.pageSubtitle}>헤더 하단에 노출되는 공지를 관리합니다.</p>
          </div>
          {!showForm && (
            <button onClick={openCreateForm} className={styles.btnPrimary}>
              + 공지 등록
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
            <h2 className={styles.formTitle}>{editingItem ? '공지 수정' : '새 공지 등록'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroupLast}>
                <label className={styles.label}>내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="공지 내용을 입력하세요."
                  required
                  rows={3}
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                  {submitting ? '저장 중...' : (editingItem ? '수정' : '등록')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className={styles.btnCancel}>
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className={styles.empty}>등록된 공지가 없습니다.</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <div key={item.id} className={styles.item} data-active={item.isActive ? 'true' : 'false'}>
                <div className={styles.itemBody}>
                  <div className={styles.itemContent}>{item.content}</div>
                  <div className={styles.itemMeta}>
                    {item.author.name} · {new Date(item.createdAt).toLocaleString('ko-KR')}
                    {!item.isActive && <span className={styles.inactiveTag}>비활성</span>}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => toggleActive(item)} className={styles.btnToggle}>
                    {item.isActive ? '숨기기' : '게시하기'}
                  </button>
                  <button onClick={() => openEditForm(item)} className={styles.btnEdit}>수정</button>
                  <button onClick={() => handleDelete(item.id)} className={styles.btnDelete}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
