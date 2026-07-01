'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import { useProjectFields } from '@/hooks/useProjectFields';
import apiClient from '@/lib/api-client';
import { ProjectField, FieldType } from '@/types';
import styles from './tasks.module.css';

interface Worker {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

// 작업시간 계산 함수
const calculateWorkHours = (timeLogs: any[]): string => {
  if (!timeLogs || timeLogs.length === 0) return '-';

  let totalMinutes = 0;

  timeLogs.forEach((log) => {
    if (!log.startTime) return;

    const start = new Date(log.startTime);
    const end = log.endTime ? new Date(log.endTime) : new Date();

    let startHour = start.getHours();
    let endHour = end.getHours();
    const startMin = start.getMinutes();
    const endMin = end.getMinutes();

    // 9시-18시 범위만 카운트
    startHour = Math.max(9, Math.min(startHour, 18));
    endHour = Math.max(9, Math.min(endHour, 18));

    if (startHour < endHour || (startHour === endHour && startMin < endMin)) {
      const minutes = (endHour - startHour) * 60 + (endMin - startMin);
      totalMinutes += minutes;
    }
  });

  // 최소 1시간
  if (totalMinutes < 60 && totalMinutes > 0) totalMinutes = 60;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return '-';
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
};

export default function TaskListPage() {
  return (
    <Suspense fallback={<div className={styles.loadingPage}>로딩 중...</div>}>
      <TaskListContent />
    </Suspense>
  );
}

function TaskListContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { tasks, loading, error, updateStatus, updateTask, deleteTask } = useTasks({ limit: 1000 });
  const { getStatuses } = useProjectStatuses();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canEditTitle = ['ADMIN', 'LEADER'].includes((user as any)?.role ?? '');
  const canDelete = canEditTitle;

  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedWorker, setSelectedWorker] = useState(searchParams.get('workerId') || '');
  const [selectedProject, setSelectedProject] = useState(searchParams.get('projectId') || '');
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [assignableWorkers, setAssignableWorkers] = useState<Worker[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);

  // 커스텀 필드(속성) — 노션식 자유 컬럼. 프로젝트가 선택된 경우에만 노출
  const selectedProjectId = selectedProject ? parseInt(selectedProject) : null;
  const { fields, saveFields, saveValue } = useProjectFields(selectedProjectId);
  const [fieldValueOverrides, setFieldValueOverrides] = useState<Record<string, string>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const getFieldValue = (task: any, field: ProjectField): string => {
    const key = `${task.id}-${field.id}`;
    if (key in fieldValueOverrides) return fieldValueOverrides[key];
    return task.fieldValues?.find((fv: any) => fv.fieldId === field.id)?.value ?? '';
  };

  const handleFieldValueChange = (taskId: number, field: ProjectField, value: string) => {
    setFieldValueOverrides((prev) => ({ ...prev, [`${taskId}-${field.id}`]: value }));
    saveValue(taskId, field.id, value || null).catch((err) => console.error(err));
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    try {
      const next = [
        ...fields.map((f) => ({ name: f.name, type: f.type, options: f.options })),
        { name: newFieldName.trim(), type: newFieldType, options: newFieldType === 'SELECT' ? newFieldOptions : null },
      ];
      await saveFields(next as any);
      setNewFieldName('');
      setNewFieldType('TEXT');
      setNewFieldOptions('');
      setShowAddField(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveField = async (fieldId: number) => {
    if (!confirm('이 속성을 삭제하시겠습니까? 저장된 값도 함께 삭제됩니다.')) return;
    try {
      const next = fields
        .filter((f) => f.id !== fieldId)
        .map((f) => ({ name: f.name, type: f.type, options: f.options }));
      await saveFields(next as any);
    } catch (err) {
      console.error(err);
    }
  };

  // 필터 상태를 URL 쿼리에 반영 — 새로고침해도 필터가 유지되도록 함
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedProject) params.set('projectId', selectedProject);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedWorker) params.set('workerId', selectedWorker);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, selectedStatus, selectedWorker]);

  useEffect(() => {
    if (!canEditTitle) return;
    const fetchWorkers = async () => {
      try {
        const res = await apiClient.get<{ data: Worker[] }>('/users?role=WORKER');
        setAssignableWorkers(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkers();
  }, [canEditTitle]);

  // 프로젝트 전환 드롭다운 목록: 소속(멤버) + 배정된 업무가 있는 프로젝트 모두 포함(GET /api/projects가 둘 다 조회)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await apiClient.get<{ data: Project[] }>('/projects');
        setMyProjects((res.data.data || []).filter((p) => p.status === 'ACTIVE'));
      } catch (err) {
        console.error(err);
      }
    };
    fetchProjects();
  }, []);

  const handleDeleteTask = async (id: number) => {
    if (!confirm('이 업무를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.')) return;
    try {
      await deleteTask(id);
    } catch (err) {
      console.error(err);
    }
  };

  const startTitleEdit = (task: any) => {
    if (!canEditTitle) return;
    setEditingTitleId(task.id);
    setTitleDraft(task.title);
  };

  const cancelTitleEdit = () => {
    setEditingTitleId(null);
    setTitleDraft('');
  };

  const saveTitleEdit = async (id: number) => {
    const trimmed = titleDraft.trim();
    if (!trimmed) { cancelTitleEdit(); return; }
    try {
      await updateTask(id, { title: trimmed });
    } catch (err) {
      console.error(err);
    } finally {
      cancelTitleEdit();
    }
  };

  const toggleNotes = (id: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 담당자 필터 목록: role=WORKER로 한정하지 않고, 실제로 업무에 배정된 담당자를 모두 노출
  const workers = Array.from(
    new Map(tasks.filter((t) => t.worker).map((t: any) => [t.worker.id, t.worker])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  // 상태 필터 목록: 현재 선택된 프로젝트/담당자 필터를 반영한 업무 범위에서 실제로 사용 중인 상태만 모음
  // (프로젝트를 필터링했는데 상단 상태 목록에 다른 프로젝트의 상태가 섞여 나오지 않도록)
  const tasksForStatusOptions = tasks.filter((t: any) => {
    if (selectedProject && t.projectId !== parseInt(selectedProject)) return false;
    if (selectedWorker && t.workerId !== parseInt(selectedWorker)) return false;
    return true;
  });
  const statusOptionMap = new Map<string, string>();
  tasksForStatusOptions.forEach((t: any) => {
    if (statusOptionMap.has(t.status)) return;
    const def = getStatuses(t.projectId).find((s) => s.code === t.status);
    statusOptionMap.set(t.status, def?.label ?? t.status);
  });
  const statusOptions = Array.from(statusOptionMap.entries());

  if (authLoading) {
    return <div className={styles.loadingPage}>로딩 중...</div>;
  }

  // 필터링
  let filteredTasks = tasks;
  if (selectedStatus) {
    filteredTasks = filteredTasks.filter((task) => task.status === selectedStatus);
  }
  if (selectedWorker) {
    filteredTasks = filteredTasks.filter((task) => task.workerId === parseInt(selectedWorker));
  }
  if (selectedProject) {
    filteredTasks = filteredTasks.filter((task) => task.projectId === parseInt(selectedProject));
  }

  // 그룹/하위 업무 트리 구성: 최상위(부모 없는) 업무만 1차 행으로 노출, 하위 업무는 펼쳤을 때만 표시
  const childrenMap = new Map<number, any[]>();
  filteredTasks.forEach((task) => {
    if (task.parentTaskId) {
      const list = childrenMap.get(task.parentTaskId) || [];
      list.push(task);
      childrenMap.set(task.parentTaskId, list);
    }
  });
  const topLevelTasks = filteredTasks.filter((task) => !task.parentTaskId);

  const renderTaskRow = (
    task: any,
    opts: { isChild: boolean; isGroupRow: boolean; isGroupExpanded: boolean }
  ): React.ReactElement[] => {
    const { isChild, isGroupRow, isGroupExpanded } = opts;
    const hasNotes = !!task.notes && task.notes.trim() !== '' && task.notes.trim() !== '<p><br></p>';
    const isExpanded = expandedNotes.has(task.id);
    const taskStatuses = getStatuses(task.projectId);
    const isTaskDone = taskStatuses.find((s) => s.code === task.status)?.isDone ?? false;
    const rows: React.ReactElement[] = [
      <tr
        key={task.id}
        style={{
          backgroundColor: isTaskDone ? '#F9FAFB' : 'white',
        }}
      >
        <td className={styles.tdId}>#{task.id}</td>
        <td className={styles.td}>
          <div className={styles.titleCell} style={isChild ? { paddingLeft: '24px' } : undefined}>
            {isGroupRow && (
              <button
                type="button"
                className={styles.groupToggleBtn}
                onClick={(e) => { e.stopPropagation(); toggleGroup(task.id); }}
                aria-label={isGroupExpanded ? '하위 업무 접기' : '하위 업무 펼치기'}
              >
                {isGroupExpanded ? '−' : '+'}
              </button>
            )}
            {isChild && <span className={styles.childArrow}>↳</span>}
            {editingTitleId === task.id ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => saveTitleEdit(task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitleEdit(task.id);
                  if (e.key === 'Escape') cancelTitleEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                className={styles.titleInput}
                autoFocus
              />
            ) : (
              <span
                className={styles.titleText}
                onDoubleClick={(e) => { e.stopPropagation(); startTitleEdit(task); }}
              >
                {task.title}
              </span>
            )}
          </div>
        </td>
        <td className={styles.td}>
          {canEditTitle ? (
            <select
              value={task.workerId ?? ''}
              onChange={(e) => updateTask(task.id, { workerId: parseInt(e.target.value) } as any)}
              className={styles.statusSelect}
            >
              {(task.worker && !assignableWorkers.find(w => w.id === (task.worker as any).id)
                ? [{ id: (task.worker as any).id, name: (task.worker as any).name } as Worker, ...assignableWorkers]
                : assignableWorkers
              ).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          ) : (
            task.worker?.name || '-'
          )}
        </td>
        <td className={styles.td}>
          {task.createdAt
            ? new Date(task.createdAt).toLocaleDateString('ko-KR')
            : '-'}
        </td>
        <td className={styles.td}>
          {task.targetDate
            ? new Date(task.targetDate).toLocaleDateString('ko-KR')
            : '-'}
        </td>
        <td className={styles.tdNotes}>
          <div className={styles.notesBtns}>
            {isGroupRow ? (
              <button
                className={`${styles.notesToggleBtn} ${isGroupExpanded ? styles.notesToggleBtnActive : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleGroup(task.id); }}
              >
                {isGroupExpanded ? '하위업무 접기' : '하위업무 보기'}
              </button>
            ) : (
              hasNotes && (
                <button
                  className={`${styles.notesToggleBtn} ${isExpanded ? styles.notesToggleBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleNotes(task.id); }}
                >
                  {isExpanded ? '접기' : '요약보기'}
                </button>
              )
            )}
            {!isGroupRow && (
              <Link href={`/tasks/${task.id}`} className={styles.detailBtn}>
                상세보기
              </Link>
            )}
            {!isChild && (
              <Link href={`/tasks/create?parentTaskId=${task.id}`} className={styles.addSubBtnSmall}>
                + 하위 업무
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                className={styles.deleteBtnSmall}
                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
              >
                삭제
              </button>
            )}
          </div>
        </td>
        <td className={styles.tdHours}>
          {calculateWorkHours(task.timeLogs || [])}
        </td>
        <td className={styles.td}>
          {isGroupRow ? (
            '-'
          ) : (
            <select
              value={task.status}
              onChange={(e) => updateStatus(task.id, e.target.value)}
              className={styles.statusSelect}
            >
              {!taskStatuses.some((s) => s.code === task.status) && (
                <option value={task.status}>{task.status} (기타)</option>
              )}
              {taskStatuses.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          )}
        </td>
        {selectedProjectId && fields.map((field) => (
          <td key={field.id} className={styles.td}>
            {renderFieldCell(task, field)}
          </td>
        ))}
      </tr>,
    ];
    if (!isGroupRow && isExpanded && hasNotes) {
      rows.push(
        <tr key={`notes-${task.id}`} className={styles.notesRow}>
          <td colSpan={colCount} className={styles.notesCell}>
            <div
              className={styles.notesContent}
              dangerouslySetInnerHTML={{ __html: task.notes ?? '' }}
            />
          </td>
        </tr>
      );
    }
    return rows;
  };

  const renderFieldCell = (task: any, field: ProjectField) => {
    const value = getFieldValue(task, field);
    if (!canEditTitle) {
      if (field.type === 'CHECKBOX') return value === 'true' ? '✓' : '-';
      return value || '-';
    }
    if (field.type === 'CHECKBOX') {
      return (
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => handleFieldValueChange(task.id, field, e.target.checked ? 'true' : 'false')}
        />
      );
    }
    if (field.type === 'SELECT') {
      const options = (field.options || '').split(',').map((o) => o.trim()).filter(Boolean);
      return (
        <select
          value={value}
          onChange={(e) => handleFieldValueChange(task.id, field, e.target.value)}
          className={styles.fieldCellInput}
        >
          <option value="">-</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
        defaultValue={value}
        onBlur={(e) => handleFieldValueChange(task.id, field, e.target.value)}
        className={styles.fieldCellInput}
      />
    );
  };

  const colCount = 8 + (selectedProjectId ? fields.length : 0);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>업무 목록</h1>
        <span className={styles.pageCount}>
          총 {filteredTasks.length}건
        </span>
      </div>

      {/* 필터 바 */}
      <div className={styles.filterBar}>
        {myProjects.length > 0 && (
          <>
            <span className={styles.filterLabel}>
              프로젝트:
            </span>
            <select
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); setSelectedStatus(''); }}
              className={styles.statusFilterSelect}
            >
              <option value="">전체 프로젝트</option>
              {myProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </>
        )}

        <span className={styles.filterLabel}>
          상태:
        </span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={styles.statusFilterSelect}
        >
          <option value="">전체 상태</option>
          {statusOptions.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          className={styles.workerSelect}
        >
          <option value="">모든 담당자</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.thId}`}>ID</th>
              <th className={styles.th}>제목</th>
              <th className={`${styles.th} ${styles.thAssignee}`}>담당자</th>
              <th className={`${styles.th} ${styles.thCreatedAt}`}>등록일자</th>
              <th className={`${styles.th} ${styles.thTarget}`}>목표일</th>
              <th className={styles.th}>비고</th>
              <th className={`${styles.th} ${styles.thHours}`}>작업시간</th>
              <th className={`${styles.th} ${styles.thStatus}`}>상태</th>
              {selectedProjectId && fields.map((field) => (
                <th key={field.id} className={`${styles.th} ${styles.fieldTh}`}>
                  {field.name}
                  {canEditTitle && (
                    <button
                      type="button"
                      className={styles.fieldRemoveBtn}
                      onClick={() => handleRemoveField(field.id)}
                      aria-label={`${field.name} 속성 삭제`}
                    >
                      ✕
                    </button>
                  )}
                </th>
              ))}
              {selectedProjectId && canEditTitle && (
                <th className={`${styles.th} ${styles.addFieldWrap}`}>
                  <button
                    type="button"
                    className={styles.addFieldBtn}
                    onClick={() => setShowAddField((v) => !v)}
                  >
                    + 속성 추가
                  </button>
                  {showAddField && (
                    <div className={styles.addFieldPopover}>
                      <input
                        type="text"
                        placeholder="속성 이름"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        autoFocus
                      />
                      <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)}>
                        <option value="TEXT">텍스트</option>
                        <option value="NUMBER">숫자</option>
                        <option value="DATE">날짜</option>
                        <option value="SELECT">선택</option>
                        <option value="CHECKBOX">체크박스</option>
                      </select>
                      {newFieldType === 'SELECT' && (
                        <input
                          type="text"
                          placeholder="선택지(콤마로 구분)"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                        />
                      )}
                      <div className={styles.addFieldPopoverActions}>
                        <button type="button" className={styles.detailBtn} onClick={() => setShowAddField(false)}>
                          취소
                        </button>
                        <button type="button" className={styles.addSubBtnSmall} onClick={handleAddField}>
                          추가
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className={styles.tdCenter}>
                  로딩 중...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={styles.tdCenter}>
                  {tasks.length === 0 ? '등록된 업무가 없습니다.' : '필터 조건에 맞는 업무가 없습니다.'}
                </td>
              </tr>
            ) : (
              topLevelTasks.flatMap((task) => {
                const children = childrenMap.get(task.id) || [];
                const isGroupRow = task.isGroup || children.length > 0;
                const isGroupExpanded = expandedGroups.has(task.id);
                const rows = renderTaskRow(task, {
                  isChild: false,
                  isGroupRow,
                  isGroupExpanded,
                });
                if (isGroupRow && isGroupExpanded) {
                  children.forEach((child) => {
                    rows.push(...renderTaskRow(child, { isChild: true, isGroupRow: false, isGroupExpanded: false }));
                  });
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
