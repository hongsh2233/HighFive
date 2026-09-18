'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './expenses.module.css';
import Spinner from '@/components/common/Spinner';

interface Project { id: number; name: string; }

interface CardTx {
  id: number;
  cardNumberMasked: string | null;
  approvedAt: string;
  amount: number;
  merchant: string;
  category: string;
  project: { id: number; name: string } | null;
  projectNameRaw: string | null;
  description: string | null;
  user: { id: number; name: string };
  source: string;
}

interface LedgerEntry {
  id: number;
  entryDate: string;
  accountItem: string;
  description: string;
  counterparty: string | null;
  incomeAmount: number;
  incomeVat: number;
  expenseAmount: number;
  expenseVat: number;
  assetAmount: number;
  assetVat: number;
  note: string | null;
  author: { id: number; name: string };
  source: string;
}

const fmtMoney = (n: number) => n.toLocaleString('ko-KR');

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ExpensesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const role = (user as any)?.role;
  const isAdminOrLeader = ['ADMIN', 'LEADER'].includes(role || '');
  const [permLoading, setPermLoading] = useState(true);
  const [canCard, setCanCard] = useState(false);
  const [canLedger, setCanLedger] = useState(false);
  const [mode, setMode] = useState<'card' | 'ledger' | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isAdminOrLeader) {
      setCanCard(true);
      setCanLedger(true);
      setPermLoading(false);
      return;
    }
    apiClient.get<{ data: { canManageCardExpense: boolean; canManageLedger: boolean } }>('/users/me')
      .then((res) => {
        setCanCard(!!res.data.data.canManageCardExpense);
        setCanLedger(!!res.data.data.canManageLedger);
      })
      .finally(() => setPermLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (permLoading || mode) return;
    if (canCard) setMode('card');
    else if (canLedger) setMode('ledger');
  }, [permLoading, canCard, canLedger, mode]);

  if (authLoading || permLoading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (!canCard && !canLedger) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.empty}>비용관리 접근 권한이 없습니다. 관리자에게 문의하세요.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>비용관리</h1>
            <p className={styles.pageSubtitle}>법인카드 사용내역 또는 간편장부를 관리합니다.</p>
          </div>
        </div>

        {canCard && canLedger && (
          <div className={styles.modeTabs}>
            <button type="button" className={mode !== 'ledger' ? styles.modeTabActive : styles.modeTab} onClick={() => setMode('card')}>
              💳 법인카드 관리
            </button>
            <button type="button" className={mode === 'ledger' ? styles.modeTabActive : styles.modeTab} onClick={() => setMode('ledger')}>
              📒 간편장부
            </button>
          </div>
        )}

        {mode === 'card' && <CardSection userId={Number(user?.id)} role={role} />}
        {mode === 'ledger' && <LedgerSection />}
      </div>
    </div>
  );
}

interface CardPeriod {
  id: number;
  statementMonth: string;
  status: string;
  submittedBy: { id: number; name: string } | null;
  submittedAt: string | null;
  _count: { transactions: number };
}

const PERIOD_STATUS_LABEL: Record<string, string> = {
  DRAFT: '입력중',
  PENDING_APPROVAL: '결재중',
  APPROVED: '승인됨',
  REJECTED: '반려됨(재입력 가능)',
  PAID: '결제완료',
};

function CardSection({ userId, role }: { userId: number; role: string }) {
  const [transactions, setTransactions] = useState<CardTx[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [periodInfo, setPeriodInfo] = useState<{ statementMonth: string; isWindowOpen: boolean; isEditable: boolean; period: CardPeriod | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    approvedAt: '', amount: '', merchant: '', category: '', projectId: '', description: '', address: '', approvalNo: '', cardNumberMasked: '',
  });

  const fetchAll = async () => {
    try {
      const [txRes, projRes, periodRes] = await Promise.all([
        apiClient.get<{ data: CardTx[] }>('/expenses/cards'),
        apiClient.get<{ data: Project[] }>('/projects'),
        apiClient.get<{ data: { statementMonth: string; isWindowOpen: boolean; isEditable: boolean; period: CardPeriod | null } }>('/expenses/cards/period/current'),
      ]);
      setTransactions(txRes.data.data);
      setProjects(projRes.data.data);
      setPeriodInfo(periodRes.data.data);
    } catch {
      setMessage({ type: 'error', text: '법인카드 사용내역 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmitPeriod = async () => {
    if (!periodInfo?.period) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post('/expenses/cards/period/submit', { periodId: periodInfo.period.id });
      setMessage({ type: 'success', text: '결제 요청이 접수되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '결제 요청 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    const res = await apiClient.get('/expenses/cards/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data as any]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `card_transactions_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEditable = periodInfo?.isEditable ?? true;

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await apiClient.post<{ data: { imported: number; skipped: number } }>('/expenses/cards/import', { filename: file.name, dataBase64 });
      setMessage({ type: 'success', text: `${res.data.data.imported}건 등록, ${res.data.data.skipped}건 건너뜀` });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '업로드 중 오류가 발생했습니다.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/expenses/cards', {
        ...form,
        amount: parseInt(form.amount) || 0,
        projectId: form.projectId || null,
      });
      setShowForm(false);
      setForm({ approvedAt: '', amount: '', merchant: '', category: '', projectId: '', description: '', address: '', approvalNo: '', cardNumberMasked: '' });
      setMessage({ type: 'success', text: '등록되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '등록 중 오류가 발생했습니다.' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/expenses/cards/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setMessage({ type: 'error', text: '삭제 중 오류가 발생했습니다.' });
    }
  };

  const grouped = transactions.reduce<Record<string, CardTx[]>>((acc, t) => {
    const key = t.approvedAt.slice(0, 7);
    (acc[key] ??= []).push(t);
    return acc;
  }, {});
  const months = Object.keys(grouped).sort().reverse();

  if (loading) return <div className={styles.loading}><Spinner /></div>;

  return (
    <div>
      {periodInfo && (
        <div className={styles.message} style={{ background: 'var(--bg-subtle, #F4F4F5)', color: 'var(--text-secondary)' }}>
          {periodInfo.statementMonth} 명세서
          {periodInfo.period ? ` — ${PERIOD_STATUS_LABEL[periodInfo.period.status]} (${periodInfo.period._count.transactions}건)` : ' — 아직 입력 시작 전'}
          {!periodInfo.isWindowOpen && (!periodInfo.period || periodInfo.period.status === 'DRAFT') && ' · 입력 기간(매월 1~5일)이 아니라 화면이 잠겨 있습니다.'}
        </div>
      )}

      <div className={styles.actionsRow}>
        {isEditable && (
          <label className={styles.uploadBtn}>
            {uploading ? '업로드 중...' : '📤 카드사 명세서(xlsx) 업로드'}
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} disabled={uploading} />
          </label>
        )}
        {isEditable && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className={styles.btnSecondary}>
            {showForm ? '취소' : '+ 직접 입력'}
          </button>
        )}
        <button type="button" onClick={handleDownload} className={styles.btnSecondary}>
          ⬇️ 엑셀 다운로드
        </button>
        {isEditable && periodInfo?.period && periodInfo.period.status === 'DRAFT' && periodInfo.period._count.transactions > 0 && (
          <button type="button" onClick={handleSubmitPeriod} disabled={submitting} className={styles.btnSubmit}>
            {submitting ? '요청 중...' : '💳 결제 요청'}
          </button>
        )}
      </div>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>{message.text}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formGrid}>
            <div><label className={styles.label}>승인일시 *</label><input type="datetime-local" required value={form.approvedAt} onChange={(e) => setForm((p) => ({ ...p, approvedAt: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>금액 *</label><input type="number" required value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>거래처명 *</label><input type="text" required value={form.merchant} onChange={(e) => setForm((p) => ({ ...p, merchant: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>항목 *</label><input type="text" required value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="예: 식사음료, 소모품비" className={styles.input} /></div>
            <div>
              <label className={styles.label}>프로젝트</label>
              <select value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))} className={styles.input}>
                <option value="">미지정</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className={styles.label}>카드번호</label><input type="text" value={form.cardNumberMasked} onChange={(e) => setForm((p) => ({ ...p, cardNumberMasked: e.target.value }))} placeholder="4518-44**-****-6583" className={styles.input} /></div>
          </div>
          <div><label className={styles.label}>사용내역</label><input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={styles.input} /></div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnSubmit}>등록</button>
          </div>
        </form>
      )}

      {months.length === 0 ? (
        <div className={styles.empty}>등록된 법인카드 사용내역이 없습니다.</div>
      ) : (
        months.map((m) => {
          const items = grouped[m];
          const total = items.reduce((sum, t) => sum + t.amount, 0);
          return (
            <div key={m} className={styles.monthSection}>
              <div className={styles.monthHeader}>
                <h3 className={styles.monthTitle}>{m}</h3>
                <span className={styles.monthTotal}>합계 {fmtMoney(total)}원 ({items.length}건)</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr><th>일시</th><th>거래처</th><th>항목</th><th>프로젝트</th><th>금액</th><th>사용내역</th>{role === 'ADMIN' && <th>사용자</th>}<th></th></tr>
                  </thead>
                  <tbody>
                    {items.map((t) => (
                      <tr key={t.id}>
                        <td>{new Date(t.approvedAt).toLocaleString('ko-KR')}</td>
                        <td>{t.merchant}</td>
                        <td>{t.category}</td>
                        <td>{t.project?.name || t.projectNameRaw || '-'}</td>
                        <td>{fmtMoney(t.amount)}원</td>
                        <td>{t.description || '-'}</td>
                        {role === 'ADMIN' && <td>{t.user.name}</td>}
                        <td>
                          {isEditable && (t.user.id === userId || role === 'ADMIN') && (
                            <button type="button" onClick={() => handleDelete(t.id)} className={styles.rowDeleteBtn}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function LedgerSection() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    entryDate: '', accountItem: '', description: '', counterparty: '',
    incomeAmount: '', incomeVat: '', expenseAmount: '', expenseVat: '', assetAmount: '', assetVat: '', note: '',
  });

  const fetchAll = async () => {
    try {
      const res = await apiClient.get<{ data: LedgerEntry[] }>('/expenses/ledger');
      setEntries(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '간편장부 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await apiClient.post<{ data: { imported: number; skipped: number } }>('/expenses/ledger/import', { filename: file.name, dataBase64 });
      setMessage({ type: 'success', text: `${res.data.data.imported}건 등록, ${res.data.data.skipped}건 건너뜀` });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '업로드 중 오류가 발생했습니다.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/expenses/ledger', form);
      setShowForm(false);
      setForm({ entryDate: '', accountItem: '', description: '', counterparty: '', incomeAmount: '', incomeVat: '', expenseAmount: '', expenseVat: '', assetAmount: '', assetVat: '', note: '' });
      setMessage({ type: 'success', text: '등록되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '등록 중 오류가 발생했습니다.' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/expenses/ledger/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setMessage({ type: 'error', text: '삭제 중 오류가 발생했습니다.' });
    }
  };

  const grouped = entries.reduce<Record<string, LedgerEntry[]>>((acc, e) => {
    const key = e.entryDate.slice(0, 7);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  const months = Object.keys(grouped).sort().reverse();

  if (loading) return <div className={styles.loading}><Spinner /></div>;

  return (
    <div>
      <div className={styles.actionsRow}>
        <label className={styles.uploadBtn}>
          {uploading ? '업로드 중...' : '📤 간편장부(xlsx) 업로드'}
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} disabled={uploading} />
        </label>
        <button type="button" onClick={() => setShowForm((v) => !v)} className={styles.btnSecondary}>
          {showForm ? '취소' : '+ 직접 입력'}
        </button>
      </div>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>{message.text}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formGrid}>
            <div><label className={styles.label}>일자 *</label><input type="date" required value={form.entryDate} onChange={(e) => setForm((p) => ({ ...p, entryDate: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>계정과목 *</label><input type="text" required value={form.accountItem} onChange={(e) => setForm((p) => ({ ...p, accountItem: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>거래내용 *</label><input type="text" required value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>거래처</label><input type="text" value={form.counterparty} onChange={(e) => setForm((p) => ({ ...p, counterparty: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>수입 금액</label><input type="number" value={form.incomeAmount} onChange={(e) => setForm((p) => ({ ...p, incomeAmount: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>수입 부가세</label><input type="number" value={form.incomeVat} onChange={(e) => setForm((p) => ({ ...p, incomeVat: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>비용 금액</label><input type="number" value={form.expenseAmount} onChange={(e) => setForm((p) => ({ ...p, expenseAmount: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>비용 부가세</label><input type="number" value={form.expenseVat} onChange={(e) => setForm((p) => ({ ...p, expenseVat: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>자산증감 금액</label><input type="number" value={form.assetAmount} onChange={(e) => setForm((p) => ({ ...p, assetAmount: e.target.value }))} className={styles.input} /></div>
            <div><label className={styles.label}>자산증감 부가세</label><input type="number" value={form.assetVat} onChange={(e) => setForm((p) => ({ ...p, assetVat: e.target.value }))} className={styles.input} /></div>
          </div>
          <div><label className={styles.label}>비고</label><input type="text" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className={styles.input} /></div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnSubmit}>등록</button>
          </div>
        </form>
      )}

      {months.length === 0 ? (
        <div className={styles.empty}>등록된 간편장부 항목이 없습니다.</div>
      ) : (
        months.map((m) => {
          const items = grouped[m];
          const income = items.reduce((s, e) => s + e.incomeAmount, 0);
          const expense = items.reduce((s, e) => s + e.expenseAmount, 0);
          return (
            <div key={m} className={styles.monthSection}>
              <div className={styles.monthHeader}>
                <h3 className={styles.monthTitle}>{m}</h3>
                <span className={styles.monthTotal}>수입 {fmtMoney(income)}원 · 비용 {fmtMoney(expense)}원 ({items.length}건)</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr><th>일자</th><th>계정과목</th><th>거래내용</th><th>거래처</th><th>수입</th><th>비용</th><th>자산증감</th><th>비고</th><th></th></tr>
                  </thead>
                  <tbody>
                    {items.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.entryDate).toLocaleDateString('ko-KR')}</td>
                        <td>{e.accountItem}</td>
                        <td>{e.description}</td>
                        <td>{e.counterparty || '-'}</td>
                        <td>{e.incomeAmount ? fmtMoney(e.incomeAmount) : '-'}</td>
                        <td>{e.expenseAmount ? fmtMoney(e.expenseAmount) : '-'}</td>
                        <td>{e.assetAmount ? fmtMoney(e.assetAmount) : '-'}</td>
                        <td>{e.note || '-'}</td>
                        <td><button type="button" onClick={() => handleDelete(e.id)} className={styles.rowDeleteBtn}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
