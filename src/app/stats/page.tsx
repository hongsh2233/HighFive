'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './stats.module.css';
import Spinner from '@/components/common/Spinner';
import * as XLSX from 'xlsx';

interface WorkloadData {
  id: number;
  name: string;
  email: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalHours: number;
  averageHoursPerTask: number;
}

interface SummaryData {
  month: number;
  year: number;
  tasks: {
    total: number;
    assigned: number;
    progress: number;
    review: number;
    qa: number;
    done: number;
    completionRate: number;
  };
  timeLogs: {
    total: number;
    totalHours: number;
    averageHoursPerLog: number;
  };
}

export default function StatsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [workload, setWorkload] = useState<WorkloadData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [workloadInsightEnabled, setWorkloadInsightEnabled] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const canSeeInsight = user?.role === 'ADMIN' || user?.role === 'LEADER';

  useEffect(() => {
    apiClient.get<{ data: { features: { workloadInsight: boolean; weeklyReport: boolean } } }>('/settings/ai/status')
      .then((res) => {
        setWorkloadInsightEnabled(!!res.data.data.features.workloadInsight);
        setWeeklyReportEnabled(!!res.data.data.features.weeklyReport);
      })
      .catch(() => {});
  }, []);

  const handleWeeklyReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await apiClient.post<{ data: { report: string } }>('/ai/weekly-report');
      setReport(res.data.data.report);
    } catch (err: any) {
      setReportError(err.response?.data?.message || 'AI 주간 보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await apiClient.post<{ data: { insight: string } }>('/ai/workload-insight');
      setInsight(res.data.data.insight);
    } catch (err: any) {
      setInsightError(err.response?.data?.message || 'AI 부하 분석 중 오류가 발생했습니다.');
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 작업자 부하량
        const workloadRes = await apiClient.get<{ data: WorkloadData[] }>('/stats/workload');
        setWorkload(workloadRes.data.data);

        // 월간 요약
        const summaryRes = await apiClient.get<{ data: SummaryData }>(
          `/stats/summary?year=${selectedMonth.getFullYear()}&month=${selectedMonth.getMonth()}`
        );
        setSummary(summaryRes.data.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchStats();
    }
  }, [selectedMonth, authLoading]);

  const prevMonth = () => setSelectedMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (next <= new Date()) setSelectedMonth(next);
  };
  const isCurrentMonth = selectedMonth.getFullYear() === new Date().getFullYear() && selectedMonth.getMonth() === new Date().getMonth();

  const handleExportXlsx = () => {
    const wb = XLSX.utils.book_new();

    if (summary) {
      const summaryRows = [
        ['기간', `${summary.year}년 ${String(summary.month).padStart(2, '0')}월`],
        ['총 업무', summary.tasks.total],
        ['완료', summary.tasks.done],
        ['완료율(%)', summary.tasks.completionRate],
        ['총 공수(시간)', summary.timeLogs.totalHours],
        ['배정됨', summary.tasks.assigned],
        ['진행중', summary.tasks.progress],
        ['검수', summary.tasks.review],
        ['QA', summary.tasks.qa],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), '월간요약');
    }

    const workloadRows = [
      ['담당자', '총 업무', '완료', '진행중', '총 공수(시간)', '평균 공수'],
      ...workload.map(w => [w.name, w.totalTasks, w.completedTasks, w.inProgressTasks, w.totalHours, w.averageHoursPerTask]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(workloadRows), '작업자별부하량');

    XLSX.writeFile(wb, `high5-stats-${selectedMonth.getFullYear()}${String(selectedMonth.getMonth() + 1).padStart(2, '0')}.xlsx`);
  };

  if (authLoading || loading) {
    return <div className={styles.loadingPage}><Spinner /></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>통계 &amp; 리포트</h1>
        <div className={styles.headerRight}>
          <div className={styles.monthNav}>
            <button className={styles.monthNavBtn} onClick={prevMonth}>&#8249;</button>
            <span className={styles.monthLabel}>
              {selectedMonth.getFullYear()}년 {String(selectedMonth.getMonth() + 1).padStart(2, '0')}월
            </span>
            <button className={styles.monthNavBtn} onClick={nextMonth} disabled={isCurrentMonth}>&#8250;</button>
          </div>
          {canSeeInsight && weeklyReportEnabled && (
            <button onClick={handleWeeklyReport} disabled={reportLoading} className={styles.btnAiInsight}>
              {reportLoading ? '생성 중...' : '🤖 AI 주간 보고서'}
            </button>
          )}
          <button onClick={handleExportXlsx} className={styles.btnExport}>
            📥 엑셀 다운로드
          </button>
        </div>
      </div>

      {reportError && <p className={styles.aiInsightError}>{reportError}</p>}
      {report && <div className={styles.aiInsightBox}>{report}</div>}

      {/* 월간 요약 */}
      {summary && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {summary.year}년 {String(summary.month).padStart(2, '0')}월 요약
          </h2>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.cardLabel}>총 업무</div>
              <div className={styles.cardValue}>{summary.tasks.total}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardLabel}>완료</div>
              <div className={styles.cardValue}>{summary.tasks.done}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardLabel}>완료율</div>
              <div className={styles.cardValue}>{summary.tasks.completionRate}%</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardLabel}>총 공수</div>
              <div className={styles.cardValue}>{summary.timeLogs.totalHours} h</div>
            </div>
          </div>

          {/* 상태별 분포 */}
          <div className={styles.statusGrid}>
            <div className={styles.statusCardAssigned}>
              <div className={styles.statusLabel}>배정됨</div>
              <div className={styles.statusValue}>{summary.tasks.assigned}</div>
            </div>
            <div className={styles.statusCardProgress}>
              <div className={styles.statusLabel}>진행중</div>
              <div className={styles.statusValue}>{summary.tasks.progress}</div>
            </div>
            <div className={styles.statusCardReview}>
              <div className={styles.statusLabel}>검수</div>
              <div className={styles.statusValue}>{summary.tasks.review}</div>
            </div>
            <div className={styles.statusCardQa}>
              <div className={styles.statusLabel}>QA</div>
              <div className={styles.statusValue}>{summary.tasks.qa}</div>
            </div>
          </div>
        </div>
      )}

      {/* 작업자별 부하량 */}
      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>작업자별 부하량</h2>
          {canSeeInsight && workloadInsightEnabled && (
            <button onClick={handleAnalyze} disabled={insightLoading} className={styles.btnAiInsight}>
              {insightLoading ? '분석 중...' : '🤖 AI 부하 분석'}
            </button>
          )}
        </div>

        {insightError && <p className={styles.aiInsightError}>{insightError}</p>}
        {insight && <div className={styles.aiInsightBox}>{insight}</div>}

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>담당자</th>
                <th className={styles.th}>총 업무</th>
                <th className={styles.th}>완료</th>
                <th className={styles.th}>진행중</th>
                <th className={styles.th}>총 공수 (시간)</th>
                <th className={styles.th}>평균 공수</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((worker) => (
                <tr key={worker.id}>
                  <td className={styles.td}>{worker.name}</td>
                  <td className={styles.td}>{worker.totalTasks}</td>
                  <td className={styles.td}>{worker.completedTasks}</td>
                  <td className={styles.td}>{worker.inProgressTasks}</td>
                  <td className={styles.td}>{worker.totalHours.toFixed(2)}</td>
                  <td className={styles.td}>{worker.averageHoursPerTask.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
