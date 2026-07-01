'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './requests.module.css';

interface RequestItem {
  id: number;
  type: 'LEAVE' | 'SUPPLY';
  title: string;
  content: string | null;
  startDate: string | null;
  endDate: string | null;
  isAnnouncement: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  requester: { id: number; name: string };
  approver: { id: number; name: string } | null;
}

const TYPE_LABEL: Record<string, string> = { LEAVE: '휴가', SUPPLY: '비품' };
const STATUS_LABEL: Record<string, string> = { PENDING: '결재 대기', APPROVED: '승인', REJECTED: '반려' };

export default function RequestsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canApprove = ['ADMIN', 'LEADER'].includes(user?.role || '');

  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [approvals, setApprovals] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: 'LEAVE' as 'LEAVE' | 'SUPPLY',
    title: '',
    content: '',
    startDate: '',
    endDate: '',
    isAnnouncement: false,
  });

  const fetchAll = async () => {
    try {
      const mineRes = await apiClient.get<{ data: RequestItem[] }>('/requests?scope=mine');
      setMyRequests(mineRes.data.data);
      if (canApprove) {
        const apRes = await apiClient.get<{ data: RequestItem[] }>('/requests?scope=approvals');
        setApprovals(apRes.data.data);
      }
    } catch {
      setMessage({ type: 'error', text: '목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading, canApprove]);

  const resetForm = () => setForm({ type: 'LEAVE', title: '', content: '', startDate: '', endDate: '', isAnnouncement: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post('/requests', {
        type: form.type,
        title: form.title,
        content: form.type === 'SUPPLY' ? form.content : undefined,
        startDate: form.type === 'LEAVE' ? form.startDate : undefined,
        endDate: form.type === 'LEAVE' ? form.endDate : undefined,
        isAnnouncement: form.isAnnouncement,
      });
      setMessage({ type: 'success', text: form.isAnnouncement ? '공지로 등록되어 즉시 확정되었습니다.' : '신청이 접수되었습니다.' });
      setShowForm(false);
      resetForm();
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '신청 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (id: number, action: 'APPROVE' | 'REJECT') => {
    let rejectReason: string | undefined;
    if (action === 'REJECT') {
      rejectReason = prompt('반려 사유를 입력해주세요.') || '';
      if (!rejectReason.trim()) return;
    }
    try {
      await apiClient.patch(`/requests/${id}/decision`, { action, rejectReason });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '처리 실패' });
    }
  };

  const renderPeriod = (r: RequestItem) => {
    if (r.type !== 'LEAVE' || !r.startDate || !r.endDate) return r.content || '-';
    const s = new Date(r.startDate).toLocaleDateString('ko-KR');
    const e = new Date(r.endDate).toLocaleDateString('ko-KR');
    return s === e ? s : `${s} ~ ${e}`;
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>신청</h1>
            <p className={styles.pageSubtitle}>휴가/비품을 신청하고 결재 현황을 확인합니다.</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className={styles.btnPrimary}>
              + 신청하기
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
            <h2 className={styles.formTitle}>새 신청</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>유형</label>
                <div className={styles.typeToggle}>
                  <button type="button" data-active={form.type === 'LEAVE'} onClick={() => setForm(p => ({ ...p, type: 'LEAVE' }))} className={styles.typeBtn}>휴가</button>
                  <button type="button" data-active={form.type === 'SUPPLY'} onClick={() => setForm(p => ({ ...p, type: 'SUPPLY' }))} className={styles.typeBtn}>비품</button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                  className={styles.input}
                  placeholder={form.type === 'LEAVE' ? '예: 연차 사용' : '예: 모니터 추가 요청'}
                />
              </div>

              {form.type === 'LEAVE' ? (
                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.label}>시작일 *</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required className={styles.input} />
                  </div>
                  <div>
                    <label className={styles.label}>종료일 *</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required className={styles.input} />
                  </div>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.label}>품목 / 사유 *</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    required
                    rows={3}
                    className={styles.textarea}
                    placeholder="신청할 품목과 사유를 입력하세요."
                  />
                </div>
              )}

              {canApprove && (
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.isAnnouncement}
                    onChange={e => setForm(p => ({ ...p, isAnnouncement: e.target.checked }))}
                  />
                  공지로 등록 (전결) — 결재 없이 즉시 확정되고 공지사항에도 게시됩니다.
                </label>
              )}

              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                  {submitting ? '제출 중...' : '신청'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className={styles.btnCancel}>
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {canApprove && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>결재 대기 / 처리 내역</h2>
            {approvals.length === 0 ? (
              <div className={styles.empty}>결재할 신청이 없습니다.</div>
            ) : (
              <div className={styles.list}>
                {approvals.map(r => (
                  <div key={r.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.typeTag}>{TYPE_LABEL[r.type]}</span>
                        <span className={styles.itemTitle}>{r.title}</span>
                        <span className={styles.statusBadge} data-status={r.status}>{STATUS_LABEL[r.status]}</span>
                      </div>
                      <div className={styles.itemDetail}>{renderPeriod(r)}</div>
                      <div className={styles.itemMeta}>
                        신청자: {r.requester.name} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                        {r.status === 'REJECTED' && r.rejectReason && ` · 반려 사유: ${r.rejectReason}`}
                      </div>
                    </div>
                    {r.status === 'PENDING' && (
                      <div className={styles.itemActions}>
                        <button onClick={() => decide(r.id, 'APPROVE')} className={styles.btnApprove}>승인</button>
                        <button onClick={() => decide(r.id, 'REJECT')} className={styles.btnReject}>반려</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>내 신청</h2>
          {myRequests.length === 0 ? (
            <div className={styles.empty}>신청 내역이 없습니다.</div>
          ) : (
            <div className={styles.list}>
              {myRequests.map(r => (
                <div key={r.id} className={styles.item}>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTitleRow}>
                      <span className={styles.typeTag}>{TYPE_LABEL[r.type]}</span>
                      <span className={styles.itemTitle}>{r.title}</span>
                      <span className={styles.statusBadge} data-status={r.status}>{STATUS_LABEL[r.status]}</span>
                      {r.isAnnouncement && <span className={styles.announceTag}>전결</span>}
                    </div>
                    <div className={styles.itemDetail}>{renderPeriod(r)}</div>
                    <div className={styles.itemMeta}>
                      {r.approver ? `결재자: ${r.approver.name}` : '결재자 미지정'} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                      {r.status === 'REJECTED' && r.rejectReason && ` · 반려 사유: ${r.rejectReason}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
