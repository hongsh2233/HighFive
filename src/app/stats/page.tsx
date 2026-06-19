'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';

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
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-8)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
  };

  const buttonStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--space-6)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    marginBottom: 'var(--space-6)',
  };

  const summaryGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  };

  const summaryCardStyle: React.CSSProperties = {
    padding: 'var(--space-4)',
    backgroundColor: 'var(--accent-light)',
    borderRadius: '8px',
    borderLeft: '3px solid var(--accent)',
  };

  const cardLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--accent)',
    fontWeight: '600',
    marginBottom: 'var(--space-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const cardValueStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--accent)',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    padding: 'var(--space-2) var(--space-3)',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    borderBottom: '1px solid var(--color-gray-100)',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>통계 & 리포트</h1>
        <button onClick={handleExportCSV} style={buttonStyle}>
          📥 CSV 다운로드
        </button>
      </div>

      {/* 월간 요약 */}
      {summary && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
            {summary.year}년 {String(summary.month).padStart(2, '0')}월 요약
          </h2>

          <div style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <div style={cardLabelStyle}>총 업무</div>
              <div style={cardValueStyle}>{summary.tasks.total}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={cardLabelStyle}>완료</div>
              <div style={cardValueStyle}>{summary.tasks.done}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={cardLabelStyle}>완료율</div>
              <div style={cardValueStyle}>{summary.tasks.completionRate}%</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={cardLabelStyle}>총 공수</div>
              <div style={cardValueStyle}>{summary.timeLogs.totalHours} h</div>
            </div>
          </div>

          {/* 상태별 분포 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#DBEAFE', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>배정됨</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{summary.tasks.assigned}</div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#FEF3C7', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>진행중</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{summary.tasks.progress}</div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#EDE9FE', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>검수</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{summary.tasks.review}</div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#CFFAFE', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>QA</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{summary.tasks.qa}</div>
            </div>
          </div>
        </div>
      )}

      {/* 작업자별 부하량 */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
          작업자별 부하량
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>담당자</th>
                <th style={thStyle}>총 업무</th>
                <th style={thStyle}>완료</th>
                <th style={thStyle}>진행중</th>
                <th style={thStyle}>총 공수 (시간)</th>
                <th style={thStyle}>평균 공수</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((worker) => (
                <tr key={worker.id}>
                  <td style={tdStyle}>{worker.name}</td>
                  <td style={tdStyle}>{worker.totalTasks}</td>
                  <td style={tdStyle}>{worker.completedTasks}</td>
                  <td style={tdStyle}>{worker.inProgressTasks}</td>
                  <td style={tdStyle}>{worker.totalHours.toFixed(2)}</td>
                  <td style={tdStyle}>{worker.averageHoursPerTask.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
