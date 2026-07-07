'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import { useProjectFields } from '@/hooks/useProjectFields';
import apiClient from '@/lib/api-client';
import { ProjectField, FieldType } from '@/types';
import styles from './tasks.module.css';
import Spinner from '@/components/common/Spinner';

interface Worker {
  id: number;
  name: string;
}

interface ProjectMeta {
  id: number;
  name: string;
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
    <Suspense fallback={<div className={styles.loadingPage}><Spinner /></div>}>
      <TaskListContent />
    </Suspense>
  );
}

interface SharedHandlers {
  canEditTitle: boolean;
  canDelete: boolean;
  currentUserId: number;
  assignableWorkers: Worker[];
  getStatuses: (projectId?: number | null) => ReturnType<ReturnType<typeof useProjectStatuses>['getStatuses']>;
  updateStatus: (id: number, status: string) => Promise<any>;
  updateTask: (id: number, data: any) => Promise<any>;
  deleteTask: (id: number) => Promise<any>;
  createTask: (data: any) => Promise<any>;
}

function TaskListContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks, loading, error, createTask, updateStatus, updateTask, deleteTask } = useTasks({ limit: 1000 });
  const { getStatuses } = useProjectStatuses();
  const canEditTitle = ['ADMIN', 'LEADER'].includes((user as any)?.role ?? '');
  const canDelete = canEditTitle;

  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedProject, setSelectedProject] = useState(searchParams.get('projectId') || '');
  const [assignableWorkers, setAssignableWorkers] = useState<Worker[]>([]);
  const [myProjects, setMyProjects] = useState<ProjectMeta[]>([]);

  const handleProjectFilterChange = (value: string) => {
    setSelectedProject(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('projectId', value);
    } else {
      params.delete('projectId');
    }
    router.replace(params.toString() ? `/tasks?${params.toString()}` : '/tasks');
  };

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

  // 프로젝트 목록: 소속(멤버) + 배정된 업무가 있는 프로젝트 모두 포함(GET /api/projects가 둘 다 조회)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await apiClient.get<{ data: (ProjectMeta & { status: string })[] }>('/projects');
        setMyProjects((res.data.data || []).filter((p) => p.status === 'ACTIVE'));
      } catch (err) {
        console.error(err);
      }
    };
    fetchProjects();
  }, []);

  // 담당자 필터 목록: role=WORKER로 한정하지 않고, 실제로 업무에 배정된 담당자를 모두 노출
  const workers = Array.from(
    new Map(tasks.filter((t) => t.worker).map((t: any) => [t.worker.id, t.worker])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  // 상태 필터 목록: 현재 선택된 담당자 필터를 반영한 업무 범위에서 실제로 사용 중인 상태만 모음
  const tasksForStatusOptions = tasks.filter((t: any) => {
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
    return <div className={styles.loadingPage}><Spinner /></div>;
  }

  // 필터링 (상태/담당자만 — 프로젝트는 더 이상 필터가 아니라 섹션 구분 기준)
  let filteredTasks = tasks;
  if (selectedStatus) {
    filteredTasks = filteredTasks.filter((task) => task.status === selectedStatus);
  }
  if (selectedWorker) {
    filteredTasks = filteredTasks.filter((task: any) => task.workerId === parseInt(selectedWorker));
  }

  // 프로젝트별로 그룹핑 (프로젝트 미지정 업무는 별도 섹션)
  const groupedByProject = new Map<number, any[]>();
  const unassignedTasks: any[] = [];
  filteredTasks.forEach((task: any) => {
    if (task.projectId) {
      const list = groupedByProject.get(task.projectId) || [];
      list.push(task);
      groupedByProject.set(task.projectId, list);
    } else {
      unassignedTasks.push(task);
    }
  });

  // 노출 순서: 내 프로젝트 목록 순서 우선, 소속 외 프로젝트(배정 업무만 있는 경우)는 뒤에
  const projectIdsInOrder = [
    ...myProjects.map((p) => p.id).filter((id) => groupedByProject.has(id)),
    ...Array.from(groupedByProject.keys()).filter((id) => !myProjects.some((p) => p.id === id)),
  ];
  let projectSections = projectIdsInOrder.map((pid) => {
    const projTasks = groupedByProject.get(pid)!;
    const meta: ProjectMeta = myProjects.find((p) => p.id === pid) || projTasks[0].project;
    return { project: meta, tasks: projTasks };
  });

  // 프로젝트 필터가 선택된 경우: 해당 프로젝트 섹션만 노출, 미지정 업무 섹션은 숨김
  if (selectedProject) {
    const pid = parseInt(selectedProject);
    projectSections = projectSections.filter(({ project }) => project.id === pid);
  }

  const handlers: SharedHandlers = { canEditTitle, canDelete, currentUserId: parseInt((user as any)?.id || '0'), assignableWorkers, getStatuses, updateStatus, updateTask, deleteTask, createTask };

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
        <span className={styles.filterLabel}>
          프로젝트:
        </span>
        <select
          value={selectedProject}
          onChange={(e) => handleProjectFilterChange(e.target.value)}
          className={styles.projectFilterSelect}
        >
          <option value="">전체 프로젝트</option>
          {myProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

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

      {loading ? (
        <div className={styles.tableWrapper}>
          <div className={styles.tdCenter} style={{ padding: '24px' }}><Spinner /></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={styles.tableWrapper}>
          <div className={styles.tdCenter} style={{ padding: '24px' }}>
            {tasks.length === 0 ? '등록된 업무가 없습니다.' : '필터 조건에 맞는 업무가 없습니다.'}
          </div>
        </div>
      ) : (
        <>
          {projectSections.map(({ project, tasks: projTasks }) => (
            <ProjectTaskSection
              key={project.id}
              project={project}
              tasks={projTasks}
              {...handlers}
            />
          ))}
          {!selectedProject && unassignedTasks.length > 0 && (
            <ProjectTaskSection
              project={null}
              tasks={unassignedTasks}
              {...handlers}
            />
          )}
        </>
      )}
    </div>
  );
}

function ProjectTaskSection({
  project,
  tasks,
  canEditTitle,
  canDelete,
  currentUserId,
  assignableWorkers,
  getStatuses,
  updateStatus,
  updateTask,
  deleteTask,
  createTask,
}: SharedHandlers & { project: ProjectMeta | null; tasks: any[] }) {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskWorkerId, setNewTaskWorkerId] = useState(String(currentUserId));
  const [newTaskTargetDate, setNewTaskTargetDate] = useState('');

  // 커스텀 필드(속성) — 노션식 자유 컬럼. 이 섹션의 프로젝트에 종속됨
  const { fields, saveFields, saveValue } = useProjectFields(project?.id ?? null);
  const [fieldValueOverrides, setFieldValueOverrides] = useState<Record<string, string>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const addFieldBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [draggedFieldId, setDraggedFieldId] = useState<number | null>(null);

  // 팝오버는 document.body에 portal로 렌더링해 테이블/스크롤 영역의 overflow에 절대 가려지지 않도록 함(노션 방식)
  const toggleAddField = () => {
    if (showAddField) { setShowAddField(false); return; }
    const rect = addFieldBtnRef.current?.getBoundingClientRect();
    if (rect) {
      const popoverWidth = 220;
      setPopoverPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.right - popoverWidth, window.innerWidth - popoverWidth - 8)),
      });
    }
    setShowAddField(true);
  };

  useEffect(() => {
    if (!showAddField) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || addFieldBtnRef.current?.contains(target)) return;
      setShowAddField(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddField(false);
    };
    const handleReposition = () => setShowAddField(false);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [showAddField]);

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

  const startAddTask = () => {
    if (!project) return;
    setIsAddingTask(true);
    setNewTaskTitle('');
    setNewTaskWorkerId(String(currentUserId));
    setNewTaskTargetDate('');
  };

  const cancelAddTask = () => {
    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskWorkerId(String(currentUserId));
    setNewTaskTargetDate('');
  };

  const submitAddTask = async () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed || !project) return;
    try {
      await createTask({
        title: trimmed,
        workerId: newTaskWorkerId ? parseInt(newTaskWorkerId) : currentUserId,
        registrantId: currentUserId,
        projectId: project.id,
        targetDate: newTaskTargetDate || undefined,
      } as any);
    } catch (err) {
      console.error(err);
    } finally {
      cancelAddTask();
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

  // 노션처럼 속성(컬럼) 헤더를 드래그해서 순서 변경
  const handleFieldReorder = async (targetFieldId: number) => {
    if (draggedFieldId === null || draggedFieldId === targetFieldId) {
      setDraggedFieldId(null);
      return;
    }
    const order = fields.map((f) => f.id);
    const from = order.indexOf(draggedFieldId);
    const to = order.indexOf(targetFieldId);
    if (from === -1 || to === -1) { setDraggedFieldId(null); return; }
    order.splice(to, 0, order.splice(from, 1)[0]);
    const next = order
      .map((id) => fields.find((f) => f.id === id)!)
      .map((f) => ({ name: f.name, type: f.type, options: f.options }));
    setDraggedFieldId(null);
    try {
      await saveFields(next as any);
    } catch (err) {
      console.error(err);
    }
  };

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

  // 그룹/하위 업무 트리 구성: 최상위(부모 없는) 업무만 1차 행으로 노출, 하위 업무는 펼쳤을 때만 표시
  const childrenMap = new Map<number, any[]>();
  tasks.forEach((task) => {
    if (task.parentTaskId) {
      const list = childrenMap.get(task.parentTaskId) || [];
      list.push(task);
      childrenMap.set(task.parentTaskId, list);
    }
  });
  const topLevelTasks = tasks.filter((task) => !task.parentTaskId);

  const colCount = 8 + (project ? fields.length : 0);

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
        <td className={styles.tdId} data-label="ID">#{task.id}</td>
        <td className={styles.td} data-label="제목">
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
        <td className={styles.td} data-label="담당자">
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
        <td className={styles.td} data-label="등록일자">
          {task.createdAt
            ? new Date(task.createdAt).toLocaleDateString('ko-KR')
            : '-'}
        </td>
        <td className={styles.td} data-label="목표일">
          {task.targetDate
            ? new Date(task.targetDate).toLocaleDateString('ko-KR')
            : '-'}
        </td>
        <td className={styles.tdNotes} data-label="비고">
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
        <td className={styles.tdHours} data-label="작업시간">
          {calculateWorkHours(task.timeLogs || [])}
        </td>
        <td className={styles.td} data-label="상태">
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
        {project && fields.map((field) => (
          <td key={field.id} className={styles.td} data-label={field.name}>
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

  return (
    <div className={styles.projectSection}>
      <div className={styles.projectSectionHeader}>
        <h2 className={styles.projectSectionTitle}>
          {project ? `${project.name} 리스트` : '미지정 업무'}
        </h2>
        <span className={styles.projectSectionCount}>{tasks.length}건</span>
      </div>

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
              {project && fields.map((field) => (
                <th
                  key={field.id}
                  className={`${styles.th} ${styles.fieldTh}`}
                  draggable={canEditTitle}
                  onDragStart={() => setDraggedFieldId(field.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFieldReorder(field.id); }}
                >
                  {canEditTitle && <span className={styles.fieldDragHandle}>⠿</span>}
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
              {project && canEditTitle && (
                <th className={`${styles.th} ${styles.addFieldWrap}`}>
                  <button
                    type="button"
                    ref={addFieldBtnRef}
                    className={styles.addFieldBtn}
                    onClick={toggleAddField}
                    aria-label="속성 추가"
                    title="속성 추가"
                  >
                    +
                  </button>
                  {showAddField && popoverPos && typeof document !== 'undefined' && createPortal(
                    <div
                      ref={popoverRef}
                      className={styles.addFieldPopover}
                      style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left }}
                    >
                      <input
                        type="text"
                        placeholder="속성 이름"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        className={styles.addFieldInput}
                        autoFocus
                      />
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        className={styles.addFieldInput}
                      >
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
                          className={styles.addFieldInput}
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
                    </div>,
                    document.body
                  )}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {topLevelTasks.flatMap((task) => {
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
            })}
            {project && canEditTitle && (
              <tr>
                <td colSpan={colCount} className={styles.addTaskCell}>
                  {isAddingTask ? (
                    <form
                      className={styles.addTaskForm}
                      onSubmit={(e) => { e.preventDefault(); submitAddTask(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); cancelAddTask(); }
                      }}
                    >
                      <input
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="업무 제목을 입력하고 Enter"
                        className={styles.addTaskInput}
                      />
                      <select
                        value={newTaskWorkerId}
                        onChange={(e) => setNewTaskWorkerId(e.target.value)}
                        className={styles.addTaskWorkerSelect}
                      >
                        {(!assignableWorkers.find(w => w.id === currentUserId)
                          ? [{ id: currentUserId, name: '나(본인)' } as Worker, ...assignableWorkers]
                          : assignableWorkers
                        ).map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={newTaskTargetDate}
                        onChange={(e) => setNewTaskTargetDate(e.target.value)}
                        className={styles.addTaskDateInput}
                      />
                      <button type="submit" className={styles.addTaskSubmitBtn}>추가</button>
                      <button type="button" onClick={cancelAddTask} className={styles.addTaskCancelBtn} aria-label="취소" title="취소">
                        ✕
                      </button>
                    </form>
                  ) : (
                    <button type="button" onClick={startAddTask} className={styles.addTaskRow}>
                      + 새 업무
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
