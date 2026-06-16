// User types
export type UserRole = "ADMIN" | "PLANNER" | "WORKER";

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
export type TaskStatus = "ASSIGNED" | "PROGRESS" | "REVIEW" | "QA" | "DONE";

export interface Task {
  id: number;
  rmsNo: string | null;
  title: string;
  plannerId: number;
  workerId: number;
  status: TaskStatus;
  targetDate: string | null;
  isFreeze: boolean;
  templateId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
