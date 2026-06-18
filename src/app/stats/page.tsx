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
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
        로딩 중...
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8) var(--space-4)',
    maxWidth: '1400px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-6)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.02em',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 18px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease',
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-6) var(--space-8)',
    borderRadius: '16px',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 'var(--space-6)',
  };

  const summaryGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  };

  const summaryCardStyle: React.CSSProperties = {
    padding: '16px var(--space-5)',
    backgroundColor: 'var(--color-primary-light)',
    borderRadius: '12px',
    borderLeft: '4px solid var(--color-primary)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const cardLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--color-primary-dark)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const cardValueStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '850',
    color: 'var(--color-primary)',
    lineHeight: '1.2',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-gray-50)',
    color: 'var(--color-gray-600)',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '12px',
    borderBottom: '2px solid var(--color-gray-200)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--color-gray-100)',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>통계 & 리포트</h1>
        <button
          onClick={handleExportCSV}
          style={buttonStyle}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
        >
          📥 CSV 다운로드
        </button>
      </div>

      {/* 월간 요약 */}
      {summary && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: 'var(--space-5)', letterSpacing: '-0.01em', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
            📅 {summary.year}년 {String(summary.month + 1).padStart(2, '0')}월 리포트 요약
          </h2>

          <div style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <div style={cardLabelStyle}>총 등록 업무</div>
              <div style={cardValueStyle}>{summary.tasks.total}건</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={cardLabelStyle}>완료 처리</div>
              <div style={cardValueStyle}>{summary.tasks.done}건</div>
            </div>
            <div style={{ ...summaryCardStyle, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeftColor: 'var(--color-success)' }}>
              <div style={{ ...cardLabelStyle, color: 'var(--color-success-dark)' }}>목표 달성률</div>
              <div style={{ ...cardValueStyle, color: 'var(--color-success-dark)' }}>{summary.tasks.completionRate}%</div>
            </div>
            <div style={{ ...summaryCardStyle, backgroundColor: 'rgba(6, 182, 212, 0.05)', borderLeftColor: 'var(--color-info)' }}>
              <div style={{ ...cardLabelStyle, color: 'var(--color-info-dark)' }}>누적 투입 공수</div>
              <div style={{ ...cardValueStyle, color: 'var(--color-info-dark)' }}>{summary.timeLogs.totalHours} 시간</div>
            </div>
          </div>

          {/* 상태별 분포 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-primary-light)', borderRadius: '8px', border: '1px solid rgba(88,80,236,0.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary-dark)', marginBottom: '4px' }}>배정됨</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)' }}>{summary.tasks.assigned}건</div>
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-warning-light)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-warning-dark)', marginBottom: '4px' }}>진행중</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-warning-dark)' }}>{summary.tasks.progress}건</div>
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-info-light)', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-info-dark)', marginBottom: '4px' }}>검수대기</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-info-dark)' }}>{summary.tasks.review}건</div>
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-light)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-danger-dark)', marginBottom: '4px' }}>QA 검증</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-danger-dark)' }}>{summary.tasks.qa}건</div>
            </div>
          </div>
        </div>
      )}

      {/* 작업자별 부하량 */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: 'var(--space-5)', letterSpacing: '-0.01em', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
          💻 작업자별 부하 현황 (Workloads)
        </h2>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-gray-200)' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>담당 팀원</th>
                <th style={thStyle}>누적 배정 업무</th>
                <th style={thStyle}>완료 업무</th>
                <th style={thStyle}>진행 중 업무</th>
                <th style={thStyle}>총 투입 공수 (시간)</th>
                <th style={thStyle}>평균 공수 (Task당)</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((worker) => (
                <tr key={worker.id} style={{ transition: 'background-color 0.15s' }}>
                  <td style={{ ...tdStyle, fontWeight: '700', color: 'var(--color-gray-900)' }}>{worker.name}</td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{worker.totalTasks}건</td>
                  <td style={{ ...tdStyle, color: 'var(--color-success-dark)', fontWeight: '600' }}>{worker.completedTasks}건</td>
                  <td style={{ ...tdStyle, color: 'var(--color-warning-dark)', fontWeight: '600' }}>{worker.inProgressTasks}건</td>
                  <td style={{ ...tdStyle, fontWeight: '700', color: 'var(--color-primary)' }}>{worker.totalHours.toFixed(2)} h</td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-600)' }}>{worker.averageHoursPerTask.toFixed(2)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
