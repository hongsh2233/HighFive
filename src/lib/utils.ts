import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import bcryptjs from 'bcryptjs';

export function successResponse<T>(data: T, message = 'OK', status = 200) {
  return NextResponse.json(
    { success: true, data, message, timestamp: new Date().toISOString() },
    { status }
  );
}

export function errorResponse(message: string, status = 400, code = 'ERROR') {
  return NextResponse.json(
    { success: false, data: null, message, code, timestamp: new Date().toISOString() },
    { status }
  );
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: errorResponse('인증이 필요합니다.', 401, 'AUTH_401') };
  }
  return { session };
}

export async function requireRole(requiredRoles: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: errorResponse('인증이 필요합니다.', 401, 'AUTH_401') };
  }
  const userRole = (session.user as any).role;
  if (!requiredRoles.includes(userRole)) {
    return { error: errorResponse('권한이 없습니다.', 403, 'AUTH_403') };
  }
  return { session };
}

export function parseRmsNo(title: string): { cleanTitle: string; rmsNo: string | null } {
  const rmsPattern = /\[([A-Z]+-\d+)\]/;
  const match = title.match(rmsPattern);
  if (match) {
    return { cleanTitle: title.replace(match[0], '').trim(), rmsNo: match[1] };
  }
  return { cleanTitle: title, rmsNo: null };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function generateTempPassword(): string {
  return Math.random().toString(36).slice(-12);
}
