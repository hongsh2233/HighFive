'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import dynamic from 'next/dynamic';
import apiClient from '@/lib/api-client';
import { Task, TimeLog } from '@/types';
import TaskTimerButton from '@/components/task/TaskTimerButton';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: authLoading } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ notes: '' });
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  useTimer(parseInt(id));

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await apiClient.get<{ data: Task }>(`/tasks/${id}`);
        setTask(response.data.data);
        setFormData({ notes: response.data.data.notes || '' });

        const logsResponse = await apiClient.get<{ data: { logs: TimeLog[]; totalHours: number } }>(
          `/tasks/${id}/timelogs`
        );
        setTimeLogs(logsResponse.data.data.logs);
        setTotalHours(logsResponse.data.data.totalHours);
      } catch (err: any) {
        setError(err.message || '업무 조회 실패');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchTask();
    }
  }, [id, authLoading]);

  const handleTimerUpdated = async (_log: TimeLog) => {
    try {
      const response = await apiClient.get<{ data: { logs: TimeLog[]; totalHours: number } }>(
        `/tasks/${id}/timelogs`
      );
      setTimeLogs(response.data.data.logs);
      setTotalHours(response.data.data.totalHours);
    } catch (err) {
      console.error('Failed to refresh timelogs:', err);
    }
  };

  const handleSave = async () => {
    if (!task) return;
    try {
      const response = await apiClient.patch<{ data: Task }>(`/tasks/${task.id}`, formData);
      setTask(response.data.data);
      setEditing(false);
    } catch (err) {
      setError('저장 실패');
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (error || !task) {
    return (
      <div className={styles.errorPage}>
        <p className={styles.dangerText}>{error || '업무를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const sc = statusColors[task.status] ?? { bg: 'transparent', text: '#374151', border: '#D4D4D8' };
  const badgeStyle = {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: sc.bg,
    color: sc.text,
    border: `1px solid ${sc.border}`,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
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
    marginRight: 'var(--space-2)',
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{task.title}</h1>
        <p className={styles.pageSubtitle}>
          업무 #{task.id}
          {task.rmsNo && ` · ${task.rmsNo}`}
        </p>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {/* 기본 정보 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>기본 정보</h2>
        <div className={styles.grid}>
          <div>
            <p className={styles.fieldLabel}>상태</p>
            <div style={badgeStyle}>{statusLabels[task.status]}</div>
          </div>
          <div>
            <p className={styles.fieldLabel}>담당자</p>
            <p className={styles.fieldValue}>{task.worker?.name || '-'}</p>
          </div>
          <div>
            <p className={styles.fieldLabel}>기획자</p>
            <p className={styles.fieldValue}>{task.planner?.name || '-'}</p>
          </div>
          <div>
            <p className={styles.fieldLabel}>목표일</p>
            <p className={styles.fieldValue}>
              {task.targetDate ? new Date(task.targetDate).toLocaleDateString('ko-KR') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 비고 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>비고</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className={styles.btnSecondary}>
              수정
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <ReactQuill
              theme="snow"
              value={formData.notes}
              onChange={(val) => setFormData({ ...formData, notes: val })}
              modules={{ toolbar: [['bold', 'italic', 'underline'], ['link'], ['clean']] }}
              style={{ backgroundColor: 'white', marginBottom: 'var(--space-4)' }}
            />
            <div className={styles.editActions}>
              <button onClick={handleSave} className={styles.btn}>저장</button>
              <button
                onClick={() => {
                  setEditing(false);
                  setFormData({ notes: task.notes || '' });
                }}
                style={{ ...buttonStyle, backgroundColor: 'var(--color-gray-600)' }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{ color: 'var(--color-gray-600)', fontSize: '14px', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: task.notes || '<span style="color:var(--color-gray-400)">비고가 없습니다.</span>' }}
          />
        )}
      </div>

      {/* 타임로그 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>타임로그</h2>
          <TaskTimerButton taskId={parseInt(id)} onTimerUpdated={handleTimerUpdated} />
        </div>

        <div className={styles.totalTimeBox}>
          <span className={styles.totalTimeLabel}>총 소요 시간</span>
          <span className={styles.totalTimeValue}>{totalHours.toFixed(2)} 시간</span>
        </div>

        {timeLogs.length === 0 ? (
          <p className={styles.emptyLogs}>아직 타이머 기록이 없습니다.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.th}>시작 시간</th>
                  <th className={styles.th}>종료 시간</th>
                  <th className={styles.th}>소요 시간</th>
                  <th className={styles.th}>보정</th>
                  <th className={styles.th}>최종 시간</th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map((log) => (
                  <tr key={log.id} className={styles.tableRow}>
                    <td className={styles.td}>{new Date(log.startTime).toLocaleString('ko-KR')}</td>
                    <td className={styles.td}>{log.endTime ? new Date(log.endTime).toLocaleString('ko-KR') : '진행 중'}</td>
                    <td className={styles.td}>{log.durationHours?.toFixed(2) || '-'} h</td>
                    <td className={styles.td}>{log.adjustedHours > 0 ? '+' : ''}{log.adjustedHours.toFixed(2)} h</td>
                    <td className={styles.tdBold}>{log.finalHours?.toFixed(2) || '-'} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
