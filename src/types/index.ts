// User types
export type UserRole = "ADMIN" | "LEADER" | "WORKER";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

// Task types
// 상태 코드는 프로젝트별로 커스터마이징 가능하므로 고정 유니언이 아닌 string
export type TaskStatus = string;

export interface Task {
  id: number;
  rmsNo: string | null;
  title: string;
  registrantId: number;
  workerId: number;
  status: TaskStatus;
  targetDate: string | null;
  isFreeze: boolean;
  templateId: number | null;
  notes: string | null;
  externalLink: string | null;
  labels: string | null;
  isGroup: boolean;
  timeCounterEnabled: boolean;
  parentTaskId: number | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
  worker?: {
    id: number;
    name: string;
    email: string;
  };
  registrant?: {
    id: number;
    name: string;
    email: string;
  };
  project?: {
    id: number;
    name: string;
  } | null;
  timeLogs?: TimeLog[];
  subTasks?: Task[];
  fieldValues?: TaskFieldValue[];
  _count?: { subTasks: number };
}

// 프로젝트별 커스텀 필드 (노션식 자유 속성)
export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX' | 'LINK';

export interface ProjectField {
  id: number;
  projectId: number;
  name: string;
  type: FieldType;
  options: string | null; // SELECT 타입일 때 콤마 구분 선택지
  order: number;
}

export interface TaskFieldValue {
  id: number;
  taskId: number;
  fieldId: number;
  value: string | null;
}

// 프로젝트별(또는 기본) 상태 정의
export interface ProjectStatusDef {
  code: string;
  label: string;
  color: string | null;
  order: number;
  isProgress: boolean;
  isDone: boolean;
}

// TimeLog types
export interface TimeLog {
  id: number;
  taskId: number;
  workerId: number;
  startTime: string;
  endTime: string | null;
  durationHours: number | null;
  adjustedHours: number;
  finalHours: number | null;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Template types
export interface Template {
  id: number;
  name: string;
  defaultTitle: string;
  defaultPlannerId: number | null;
  guideText: string | null;
  createdAt: string;
}

// Notification types
export interface Notification {
  id: number;
  taskId: number;
  channel: "SLACK" | "JANDI" | "EMAIL";
  message: string;
  sentAt: string;
  isSuccess: boolean;
}

// 인앱 알림(헤더 벨/토스트에서 사용)
export type UserNotificationType = "WORKER_ASSIGNED" | "WORKER_CHANGED" | "STATUS_CHANGED" | "REVIEW_REQUESTED";

export interface UserNotification {
  id: number;
  userId: number;
  taskId: number | null;
  type: UserNotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// 개인 메모 스티커
export interface StickyNote {
  id: number;
  userId: number;
  content: string;
  color: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// 개인 자료 보관 문서
export interface UserPage {
  id: number;
  userId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
