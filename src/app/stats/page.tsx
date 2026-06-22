'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './stats.module.css';

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
  const { isLoading: authLoading } = useAuth();
  const [workload, setWorkload] = useState<WorkloadData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth] = useState(new Date());

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

  const handleExportCSV = () => {
    if (!workload) return;

    const csv = [
      ['담당자', '총 업무', '완료', '진행중', '총 공수(시간)', '평균 공수'],
      ...workload.map((w) => [
        w.name,
        w.totalTasks,
        w.completedTasks,
        w.inProgressTasks,
        w.totalHours,
        w.averageHoursPerTask,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tms-workload-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (authLoading || loading) {
    return <div className={styles.loadingPage}>로딩 중...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>통계 &amp; 리포트</h1>
        <button onClick={handleExportCSV} className={styles.btnExport}>
          📥 CSV 다운로드
        </button>
      </div>

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
        <h2 className={styles.sectionTitle}>
          작업자별 부하량
        </h2>

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
