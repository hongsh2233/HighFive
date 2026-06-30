'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Task, TimeLog } from '@/types';
import styles from './detail.module.css';
import { actionLabel } from '@/lib/task-history';

const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
  ASSIGNED: { bg: 'transparent', text: '#1D4ED8', border: '#93C5FD' },
  PROGRESS: { bg: 'transparent', text: '#92400E', border: '#FCD34D' },
  REVIEW:   { bg: 'transparent', text: '#5B21B6', border: '#C4B5FD' },
  QA:       { bg: 'transparent', text: '#155E75', border: '#67E8F9' },
  DONE:     { bg: 'transparent', text: '#065F46', border: '#6EE7B7' },
};

const statusLabels: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수',
  QA: 'QA',
  DONE: '완료',
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: authLoading } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ notes: '' });
  const [externalLink, setExternalLink] = useState('');
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [histories, setHistories] = useState<any[]>([]);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await apiClient.get<{ data: Task }>(`/tasks/${id}`);
        setTask(response.data.data);
        setFormData({ notes: response.data.data.notes || '' });
        setExternalLink(response.data.data.externalLink || '');
        setLinkInput(response.data.data.externalLink || '');

        const logsResponse = await apiClient.get<{ data: { logs: TimeLog[]; totalHours: number } }>(
          `/tasks/${id}/timelogs`
        );
        setTimeLogs(logsResponse.data.data.logs);
        setTotalHours(logsResponse.data.data.totalHours);

        const historyRes = await apiClient.get<{ data: any[] }>(`/tasks/${id}/history`);
        setHistories(historyRes.data.data);
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

  const handleLinkSave = async () => {
    if (!task) return;
    try {
      await apiClient.patch(`/tasks/${task.id}`, { externalLink: linkInput });
      setExternalLink(linkInput);
      setLinkEditing(false);
    } catch (err) {
      setError('링크 저장 실패');
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
            <p className={styles.fieldLabel}>보고자</p>
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

      {/* GitHub 연결 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>GitHub 연결</h2>
          {!linkEditing && (
            <button onClick={() => setLinkEditing(true)} className={styles.btnSecondary}>
              {externalLink ? '수정' : '연결'}
            </button>
          )}
        </div>
        {linkEditing ? (
          <div>
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://github.com/org/repo/issues/1"
              className={styles.textarea}
              style={{ height: 'auto', padding: '8px 10px', resize: 'none' }}
            />
            <div className={styles.editActions}>
              <button onClick={handleLinkSave} className={styles.btn}>저장</button>
              <button onClick={() => { setLinkEditing(false); setLinkInput(externalLink); }} className={styles.btnSecondary}>취소</button>
            </div>
          </div>
        ) : externalLink ? (
          <a href={externalLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: '13px', wordBreak: 'break-all' }}>
            {externalLink}
          </a>
        ) : (
          <p className={styles.emptyLogs}>연결된 GitHub URL이 없습니다.</p>
        )}
      </div>

      {/* 메모 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>메모</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className={styles.btnSecondary}>
              수정
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={styles.textarea}
              placeholder="메모를 입력하세요..."
            />
            <div className={styles.editActions}>
              <button onClick={handleSave} className={styles.btn}>저장</button>
              <button
                onClick={() => { setEditing(false); setFormData({ notes: task.notes || '' }); }}
                className={styles.btnSecondary}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.noteText}>{task.notes || '메모가 없습니다.'}</p>
        )}
      </div>

      {/* 타임로그 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.cardTitle} ${styles.noMargin}`}>타임로그</h2>
        </div>
        <p className={styles.emptyLogs} style={{ marginTop: '-8px' }}>
          {task.timeCounterEnabled
            ? '상태가 "진행중"으로 바뀌면 자동으로 시간이 누적되고, 다른 상태로 바뀌면 자동 종료됩니다.'
            : '이 업무는 시간카운터가 꺼져 있어 자동으로 시간이 계산되지 않습니다.'}
        </p>

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

      {/* 히스토리 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>활동 히스토리</h2>
        {histories.length === 0 ? (
          <p className={styles.emptyLogs}>히스토리가 없습니다.</p>
        ) : (
          <ul className={styles.historyList}>
            {histories.map((h) => (
              <li key={h.id} className={styles.historyItem}>
                <span className={styles.historyDot} />
                <div className={styles.historyBody}>
                  <span className={styles.historyAction}>{actionLabel[h.action as keyof typeof actionLabel] ?? h.action}</span>
                  {h.detail && <span className={styles.historyDetail}> — {h.detail}</span>}
                  <div className={styles.historyMeta}>
                    <span>{h.user?.name}</span>
                    <span>{new Date(h.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
