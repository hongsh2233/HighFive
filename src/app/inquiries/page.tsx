'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from '../requests/requests.module.css';
import Spinner from '@/components/common/Spinner';

interface InquiryItem {
  id: number;
  name: string;
  contact: string;
  type: string;
  content: string;
  status: 'NEW' | 'IN_REVIEW' | 'CONVERTED' | 'CLOSED';
  closeReason: string | null;
  convertedTaskId: number | null;
  createdAt: string;
}

interface WorkerOption { id: number; name: string; }
interface ProjectOption { id: number; name: string; }

const TYPE_LABEL: Record<string, string> = { QUOTE: '견적문의', SUPPORT: '기술지원', PARTNERSHIP: '제휴', ETC: '기타' };
const STATUS_LABEL: Record<string, string> = { NEW: '신규', IN_REVIEW: '검토중', CONVERTED: '전환완료', CLOSED: '종결' };

export default function InquiriesPage() {
  const { isLoading: authLoading } = useAuth();

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertForm, setConvertForm] = useState({ workerId: '', projectId: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    try {
      const [inqRes, workerRes, projectRes] = await Promise.all([
        apiClient.get<{ data: InquiryItem[] }>('/inquiries'),
        apiClient.get<{ data: WorkerOption[] }>('/users?role=WORKER'),
        apiClient.get<{ data: ProjectOption[] }>('/projects'),
      ]);
      setInquiries(inqRes.data.data);
      setWorkers(workerRes.data.data);
      setProjects(projectRes.data.data);
    } catch {
      setMessage({ type: 'error', text: '목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading]);

  const startReview = async (id: number) => {
    try {
      await apiClient.patch(`/inquiries/${id}`, { status: 'IN_REVIEW' });
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: '상태 변경에 실패했습니다.' });
    }
  };

  const close = async (id: number) => {
    const reason = window.prompt('종결 사유를 입력해주세요 (선택)') || '';
    try {
      await apiClient.patch(`/inquiries/${id}`, { status: 'CLOSED', closeReason: reason });
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: '종결 처리에 실패했습니다.' });
    }
  };

  const submitConvert = async (id: number) => {
    if (!convertForm.workerId) {
      setMessage({ type: 'error', text: '담당자를 선택해주세요.' });
      return;
    }
    try {
      await apiClient.post(`/inquiries/${id}/convert`, {
        workerId: Number(convertForm.workerId),
        projectId: convertForm.projectId ? Number(convertForm.projectId) : undefined,
      });
      setConvertingId(null);
      setConvertForm({ workerId: '', projectId: '' });
      fetchAll();
      setMessage({ type: 'success', text: '업무로 전환되었습니다.' });
    } catch {
      setMessage({ type: 'error', text: '업무 전환에 실패했습니다.' });
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>문의 관리</h1>
            <p className={styles.pageSubtitle}>홈페이지로 접수된 문의를 검토하고 업무로 전환합니다.</p>
          </div>
        </div>

        {message && (
          <div className={styles.empty} style={{ marginBottom: 16 }}>
            {message.text}
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>문의 목록</h2>
          {inquiries.length === 0 ? (
            <div className={styles.empty}>접수된 문의가 없습니다.</div>
          ) : (
            <div className={styles.list}>
              {inquiries.map((inq) => (
                <div key={inq.id} className={styles.item}>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTitleRow}>
                      <span className={styles.typeTag}>{TYPE_LABEL[inq.type] || inq.type}</span>
                      <span className={styles.itemTitle}>{inq.name} ({inq.contact})</span>
                      <span className={styles.statusBadge} data-status={inq.status}>{STATUS_LABEL[inq.status]}</span>
                    </div>
                    <div className={styles.itemDetail}>{inq.content}</div>
                    <div className={styles.itemMeta}>
                      {new Date(inq.createdAt).toLocaleDateString('ko-KR')}
                      {inq.status === 'CLOSED' && inq.closeReason && ` · 종결 사유: ${inq.closeReason}`}
                    </div>

                    {convertingId === inq.id && (
                      <div className={styles.formGroup} style={{ marginTop: 12 }}>
                        <label className={styles.label}>담당자 *</label>
                        <select
                          className={styles.input}
                          value={convertForm.workerId}
                          onChange={(e) => setConvertForm((p) => ({ ...p, workerId: e.target.value }))}
                        >
                          <option value="">선택</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        <label className={styles.label} style={{ marginTop: 8 }}>프로젝트 (선택)</label>
                        <select
                          className={styles.input}
                          value={convertForm.projectId}
                          onChange={(e) => setConvertForm((p) => ({ ...p, projectId: e.target.value }))}
                        >
                          <option value="">미지정</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <div className={styles.formActions}>
                          <button className={styles.btnSubmit} onClick={() => submitConvert(inq.id)}>전환</button>
                          <button className={styles.btnCancel} onClick={() => setConvertingId(null)}>취소</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {(inq.status === 'NEW' || inq.status === 'IN_REVIEW') && convertingId !== inq.id && (
                    <div className={styles.itemActions}>
                      {inq.status === 'NEW' && (
                        <button onClick={() => startReview(inq.id)} className={styles.btnApprove}>검토 시작</button>
                      )}
                      <button onClick={() => setConvertingId(inq.id)} className={styles.btnApprove}>업무로 전환</button>
                      <button onClick={() => close(inq.id)} className={styles.btnReject}>종결</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
