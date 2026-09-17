'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './weekly-reports.module.css';
import Spinner from '@/components/common/Spinner';

interface Project {
  id: number;
  name: string;
  status: string;
  members: { user: { id: number } }[];
}

interface Row {
  [key: string]: string | undefined;
  wbsCode: string;
  category: string;
  detail: string;
  progress?: string;
  status?: string;
  schedule?: string;
  owner?: string;
  note: string;
}

interface IssueRow {
  [key: string]: string | undefined;
  type: string;
  content: string;
  impact: string;
  action: string;
  owner: string;
  dueDate: string;
}

interface WeeklyReport {
  id: number;
  projectId: number;
  periodStart: string;
  periodEnd: string;
  achievements: Row[];
  nextPlan: Row[];
  issues: IssueRow[];
  summary: string | null;
  author: { id: number; name: string };
  updatedAt: string;
}

const emptyAchievementRow: Row = { wbsCode: '', category: '', detail: '', progress: '', status: '', note: '' };
const emptyPlanRow: Row = { wbsCode: '', category: '', detail: '', schedule: '', owner: '', note: '' };

function RowTable<T extends Record<string, string | undefined>>({
  columns, rows, onChange,
}: {
  columns: { key: keyof T; label: string }[];
  rows: T[];
  onChange: (rows: T[]) => void;
}) {
  const updateCell = (idx: number, key: keyof T, value: string) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.rowTable}>
        <thead>
          <tr>
            {columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={String(c.key)}>
                  <input
                    type="text"
                    value={row[c.key] ?? ''}
                    onChange={(e) => updateCell(idx, c.key, e.target.value)}
                    className={styles.cellInput}
                  />
                </td>
              ))}
              <td>
                <button type="button" onClick={() => removeRow(idx)} className={styles.rowRemoveBtn}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => onChange([...rows, columns.reduce((acc, c) => ({ ...acc, [c.key]: '' }), {} as T)])} className={styles.rowAddBtn}>
        + 행 추가
      </button>
    </div>
  );
}

export default function WeeklyReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdminOrLeaderRole = ['ADMIN', 'LEADER'].includes((user as any)?.role ?? '');
  const [canWrite, setCanWrite] = useState(false);
  const isAdminOrLeader = isAdminOrLeaderRole || canWrite;

  useEffect(() => {
    if (!user || isAdminOrLeaderRole) return;
    apiClient.get<{ data: { canManageWeeklyReport: boolean } }>('/users/me')
      .then((res) => setCanWrite(!!res.data.data.canManageWeeklyReport))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailReport, setDetailReport] = useState<WeeklyReport | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formProjectId, setFormProjectId] = useState('');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [achievements, setAchievements] = useState<Row[]>([{ ...emptyAchievementRow }]);
  const [nextPlan, setNextPlan] = useState<Row[]>([{ ...emptyPlanRow }]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAll = async () => {
    try {
      const projectsRes = await apiClient.get<{ data: Project[] }>('/projects');
      const userId = Number(user?.id);
      const isAdmin = (user as any)?.role === 'ADMIN';
      const writable = projectsRes.data.data.filter(
        (p) => p.status === 'ACTIVE' && (isAdmin || p.members?.some((m) => m.user.id === userId))
      );
      setProjects(writable);

      const reportLists = await Promise.all(
        writable.map((p) =>
          apiClient.get<{ data: WeeklyReport[] }>(`/projects/${p.id}/weekly-reports`).then((r) => r.data.data).catch(() => [])
        )
      );
      setReports(reportLists.flat());
    } catch {
      setMessage({ type: 'error', text: '주간보고 목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const defaultWeekRange = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { start: fmt(monday), end: fmt(friday) };
  };

  const openCreateForm = () => {
    const { start, end } = defaultWeekRange();
    setFormProjectId(projects[0] ? String(projects[0].id) : '');
    setFormPeriodStart(start);
    setFormPeriodEnd(end);
    setAchievements([{ ...emptyAchievementRow }]);
    setNextPlan([{ ...emptyPlanRow }]);
    setIssues([]);
    setSummary('');
    setDetailReport(null);
    setShowForm(true);
    setMessage(null);
  };

  const handleAiDraft = async () => {
    setAiLoading(true);
    try {
      const res = await apiClient.post<{ data: { report: string } }>('/ai/weekly-report', { weekStart: formPeriodStart });
      setSummary(res.data.data.report);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'AI 초안 생성에 실패했습니다.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      setMessage({ type: 'error', text: '프로젝트를 선택해주세요.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post(`/projects/${formProjectId}/weekly-reports`, {
        periodStart: formPeriodStart,
        periodEnd: formPeriodEnd,
        achievements: achievements.filter((r) => r.detail.trim()),
        nextPlan: nextPlan.filter((r) => r.detail.trim()),
        issues: issues.filter((r) => r.content.trim()),
        summary,
      });
      setShowForm(false);
      setMessage({ type: 'success', text: '주간보고가 등록되었습니다.' });
      await fetchAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '등록 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = reports.reduce<Record<string, WeeklyReport[]>>((acc, r) => {
    const projectName = projects.find((p) => p.id === r.projectId)?.name || `프로젝트 #${r.projectId}`;
    (acc[projectName] ??= []).push(r);
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
            <h1 className={styles.pageTitle}>주간보고</h1>
            <p className={styles.pageSubtitle}>프로젝트별 금주 수행 실적 · 차주 계획 · 이슈를 기록합니다.</p>
          </div>
          {!showForm && !detailReport && isAdminOrLeader && projects.length > 0 && (
            <button onClick={openCreateForm} className={styles.btnPrimary}>+ 주간보고 작성</button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {projects.length === 0 ? (
          <div className={styles.empty}>소속된 프로젝트가 없어 주간보고를 사용할 수 없습니다. 관리자에게 프로젝트 배정을 요청하세요.</div>
        ) : showForm ? (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>새 주간보고 작성</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>프로젝트</label>
                  <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className={styles.input}>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>보고 시작일</label>
                  <input type="date" value={formPeriodStart} onChange={(e) => setFormPeriodStart(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>보고 종료일</label>
                  <input type="date" value={formPeriodEnd} onChange={(e) => setFormPeriodEnd(e.target.value)} className={styles.input} />
                </div>
              </div>

              <h3 className={styles.sectionTitle}>1. 금주 수행 실적</h3>
              <RowTable
                columns={[
                  { key: 'wbsCode', label: 'WBS 코드' },
                  { key: 'category', label: '대공정' },
                  { key: 'detail', label: '세부 수행 내용' },
                  { key: 'progress', label: '진척률' },
                  { key: 'status', label: '상태' },
                  { key: 'note', label: '비고' },
                ]}
                rows={achievements}
                onChange={setAchievements}
              />

              <h3 className={styles.sectionTitle}>2. 차주 수행 계획</h3>
              <RowTable
                columns={[
                  { key: 'wbsCode', label: 'WBS 코드' },
                  { key: 'category', label: '대공정' },
                  { key: 'detail', label: '계획 내용' },
                  { key: 'schedule', label: '일정' },
                  { key: 'owner', label: '담당자' },
                  { key: 'note', label: '비고' },
                ]}
                rows={nextPlan}
                onChange={setNextPlan}
              />

              <h3 className={styles.sectionTitle}>3. 이슈 및 위험 관리</h3>
              <RowTable
                columns={[
                  { key: 'type', label: '구분' },
                  { key: 'content', label: '내용' },
                  { key: 'impact', label: '영향' },
                  { key: 'action', label: '대책' },
                  { key: 'owner', label: '담당자' },
                  { key: 'dueDate', label: '조치기한' },
                ]}
                rows={issues}
                onChange={setIssues}
              />

              <div className={styles.summaryHeader}>
                <h3 className={styles.sectionTitle}>총평</h3>
                <button type="button" onClick={handleAiDraft} disabled={aiLoading} className={styles.aiBtn}>
                  {aiLoading ? '생성 중...' : '✨ AI 초안 생성'}
                </button>
              </div>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="전체 총평을 입력하거나 AI 초안 생성을 눌러주세요." className={styles.summaryInput} rows={6} />

              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                  {submitting ? '등록 중...' : '등록'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className={styles.btnCancel}>취소</button>
              </div>
            </form>
          </div>
        ) : detailReport ? (
          <div className={styles.formCard}>
            <div className={styles.detailHeader}>
              <h2 className={styles.formTitle}>
                {new Date(detailReport.periodStart).toLocaleDateString('ko-KR')} ~ {new Date(detailReport.periodEnd).toLocaleDateString('ko-KR')}
              </h2>
              <button type="button" onClick={() => setDetailReport(null)} className={styles.btnCancel}>목록으로</button>
            </div>
            <p className={styles.detailMeta}>작성자: {detailReport.author.name}</p>

            <h3 className={styles.sectionTitle}>1. 금주 수행 실적</h3>
            <DetailTable rows={detailReport.achievements} columns={['wbsCode', 'category', 'detail', 'progress', 'status', 'note']} labels={['WBS 코드', '대공정', '세부 수행 내용', '진척률', '상태', '비고']} />

            <h3 className={styles.sectionTitle}>2. 차주 수행 계획</h3>
            <DetailTable rows={detailReport.nextPlan} columns={['wbsCode', 'category', 'detail', 'schedule', 'owner', 'note']} labels={['WBS 코드', '대공정', '계획 내용', '일정', '담당자', '비고']} />

            <h3 className={styles.sectionTitle}>3. 이슈 및 위험 관리</h3>
            <DetailTable rows={detailReport.issues} columns={['type', 'content', 'impact', 'action', 'owner', 'dueDate']} labels={['구분', '내용', '영향', '대책', '담당자', '조치기한']} />

            {detailReport.summary && (
              <>
                <h3 className={styles.sectionTitle}>총평</h3>
                <p className={styles.summaryText}>{detailReport.summary}</p>
              </>
            )}
          </div>
        ) : reports.length === 0 ? (
          <div className={styles.empty}>등록된 주간보고가 없습니다. {isAdminOrLeader && '+ 주간보고 작성으로 첫 보고서를 만들어보세요.'}</div>
        ) : (
          Object.entries(grouped).map(([projectName, items]) => (
            <div key={projectName} className={styles.projectSection}>
              <h2 className={styles.projectSectionTitle}>{projectName}</h2>
              <div className={styles.docList}>
                {items.map((r) => (
                  <button key={r.id} type="button" className={styles.docItem} onClick={() => setDetailReport(r)}>
                    <div className={styles.docTitle}>
                      {new Date(r.periodStart).toLocaleDateString('ko-KR')} ~ {new Date(r.periodEnd).toLocaleDateString('ko-KR')}
                    </div>
                    {r.summary && <div className={styles.docSnippet}>{r.summary}</div>}
                    <div className={styles.docMeta}>{r.author.name} · {new Date(r.updatedAt).toLocaleDateString('ko-KR')}</div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DetailTable({ rows, columns, labels }: { rows: Record<string, string | undefined>[]; columns: string[]; labels: string[] }) {
  if (rows.length === 0) return <p className={styles.emptyRows}>내용 없음</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.rowTable}>
        <thead>
          <tr>{labels.map((l) => <th key={l}>{l}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => <td key={c}>{row[c] || '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
