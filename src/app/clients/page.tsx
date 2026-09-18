'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { useDialog } from '@/components/common/DialogProvider';
import styles from './clients.module.css';
import Spinner from '@/components/common/Spinner';

interface ClientRow {
  id: number;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  notes: string | null;
  lastContactAt: string | null;
  _count: { projects: number; inquiries: number };
}

interface ClientDetail extends ClientRow {
  projects: { id: number; name: string; status: string; healthStatus: string }[];
  inquiries: { id: number; name: string; type: string; status: string; createdAt: string }[];
}

const EMPTY_FORM = { name: '', contactName: '', contactPhone: '', contactEmail: '', contractStart: '', contractEnd: '', notes: '' };

export default function ClientsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { confirm } = useDialog();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);

  const canManage = ['ADMIN', 'LEADER'].includes((user as any)?.role || '');

  const fetchClients = async () => {
    try {
      const res = await apiClient.get<{ data: ClientRow[] }>('/clients');
      setClients(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '고객사 목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && canManage) fetchClients();
    else if (!authLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canManage]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (c: ClientRow) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      contactName: c.contactName || '',
      contactPhone: c.contactPhone || '',
      contactEmail: c.contactEmail || '',
      contractStart: c.contractStart ? c.contractStart.slice(0, 10) : '',
      contractEnd: c.contractEnd ? c.contractEnd.slice(0, 10) : '',
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.patch(`/clients/${editingId}`, form);
      } else {
        await apiClient.post('/clients', form);
      }
      setShowForm(false);
      setMessage({ type: 'success', text: '저장되었습니다.' });
      await fetchClients();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 중 오류가 발생했습니다.' });
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm('고객사를 삭제하시겠습니까? (연결된 프로젝트/문의는 유지됩니다)');
    if (!ok) return;
    try {
      await apiClient.delete(`/clients/${id}`);
      await fetchClients();
      if (openId === id) { setOpenId(null); setDetail(null); }
    } catch {
      setMessage({ type: 'error', text: '삭제 중 오류가 발생했습니다.' });
    }
  };

  const toggleDetail = async (id: number) => {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id);
    try {
      const res = await apiClient.get<{ data: ClientDetail }>(`/clients/${id}`);
      setDetail(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '상세 조회에 실패했습니다.' });
    }
  };

  if (authLoading || loading) return <div className={styles.loading}><Spinner /></div>;
  if (!canManage) return <div className={styles.loading}>관리자/매니저만 접근할 수 있는 페이지입니다.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>고객사 관리</h1>
          <button type="button" className={styles.btnPrimary} onClick={openCreate}>+ 고객사 등록</button>
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>{message.text}</div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className={styles.formCard}>
            <div className={styles.formGrid}>
              <div><label className={styles.label}>고객사명 *</label><input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={styles.input} /></div>
              <div><label className={styles.label}>담당자</label><input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} className={styles.input} /></div>
              <div><label className={styles.label}>연락처</label><input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} className={styles.input} /></div>
              <div><label className={styles.label}>이메일</label><input type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className={styles.input} /></div>
              <div><label className={styles.label}>계약 시작일</label><input type="date" value={form.contractStart} onChange={(e) => setForm((p) => ({ ...p, contractStart: e.target.value }))} className={styles.input} /></div>
              <div><label className={styles.label}>계약 종료일</label><input type="date" value={form.contractEnd} onChange={(e) => setForm((p) => ({ ...p, contractEnd: e.target.value }))} className={styles.input} /></div>
            </div>
            <div><label className={styles.label}>메모</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={styles.textarea} /></div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.btnSubmit}>{editingId ? '수정' : '등록'}</button>
              <button type="button" className={styles.btnCancel} onClick={() => setShowForm(false)}>취소</button>
            </div>
          </form>
        )}

        {clients.length === 0 ? (
          <div className={styles.empty}>등록된 고객사가 없습니다.</div>
        ) : (
          <div className={styles.list}>
            {clients.map((c) => (
              <div key={c.id} className={styles.clientCard}>
                <div className={styles.clientHeader} onClick={() => toggleDetail(c.id)}>
                  <span className={styles.clientName}>{c.name}</span>
                  <span className={styles.clientMeta}>
                    {c.contactName && `${c.contactName} · `}{c.contactPhone || c.contactEmail || ''}
                  </span>
                  <span className={styles.clientMeta}>프로젝트 {c._count.projects} · 문의 {c._count.inquiries}</span>
                  <div className={styles.clientActions} onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => openEdit(c)} className={styles.linkBtn}>수정</button>
                    <button type="button" onClick={() => handleDelete(c.id)} className={styles.linkBtnDanger}>삭제</button>
                  </div>
                </div>
                {openId === c.id && detail && (
                  <div className={styles.clientDetail}>
                    {detail.notes && <p className={styles.detailNote}>{detail.notes}</p>}
                    <div className={styles.detailSection}>
                      <span className={styles.detailLabel}>진행 프로젝트</span>
                      {detail.projects.length === 0 ? <p className={styles.emptyText}>없음</p> : (
                        <ul className={styles.detailList}>
                          {detail.projects.map((p) => <li key={p.id}>{p.name} ({p.status === 'ACTIVE' ? '진행중' : '종료'})</li>)}
                        </ul>
                      )}
                    </div>
                    <div className={styles.detailSection}>
                      <span className={styles.detailLabel}>문의 이력</span>
                      {detail.inquiries.length === 0 ? <p className={styles.emptyText}>없음</p> : (
                        <ul className={styles.detailList}>
                          {detail.inquiries.map((i) => <li key={i.id}>{new Date(i.createdAt).toLocaleDateString('ko-KR')} · {i.type} · {i.status}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
