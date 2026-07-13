import { google } from 'googleapis';
import { prisma } from './db';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || '';
  if (!clientId || !clientSecret) return null;

  return new google.auth.OAuth2(clientId, clientSecret, `${baseUrl}/api/auth/google/callback`);
}

export function isGoogleCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleAuthUrl(state: string): string | null {
  const client = getOAuthClient();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  if (!client) throw new Error('Google Calendar 연동이 설정되어 있지 않습니다.');
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function getAuthorizedClient(userId: number) {
  const client = getOAuthClient();
  if (!client) return null;

  const conn = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  client.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken,
    expiry_date: conn.tokenExpiry.getTime(),
  });

  // 만료 임박 시 자동 갱신 (googleapis가 refresh_token으로 자동 처리, 갱신된 토큰을 저장)
  client.on('tokens', async (tokens) => {
    const data: any = {};
    if (tokens.access_token) data.accessToken = tokens.access_token;
    if (tokens.expiry_date) data.tokenExpiry = new Date(tokens.expiry_date);
    if (Object.keys(data).length > 0) {
      await prisma.googleCalendarConnection.update({ where: { userId }, data }).catch(() => {});
    }
  });

  return client;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

interface UpsertEventParams {
  userId: number;
  sourceType: 'TASK' | 'LEAVE';
  sourceId: number;
  title: string;
  date: Date;
  endDate?: Date;
  description?: string;
}

export async function upsertGoogleCalendarEvent(params: UpsertEventParams): Promise<void> {
  try {
    const client = await getAuthorizedClient(params.userId);
    if (!client) return;

    const conn = await prisma.googleCalendarConnection.findUnique({ where: { userId: params.userId } });
    if (!conn) return;

    const calendar = google.calendar({ version: 'v3', auth: client });

    const existing = await prisma.googleCalendarEvent.findUnique({
      where: { userId_sourceType_sourceId: { userId: params.userId, sourceType: params.sourceType, sourceId: params.sourceId } },
    });

    const eventBody = {
      summary: params.title,
      description: params.description,
      start: { date: toDateOnly(params.date) },
      end: { date: toDateOnly(addDays(params.endDate ?? params.date, 1)) },
    };

    if (existing) {
      const updated = await calendar.events.update({
        calendarId: conn.calendarId,
        eventId: existing.googleEventId,
        requestBody: eventBody,
      });
      await prisma.googleCalendarEvent.update({
        where: { id: existing.id },
        data: { googleEventId: updated.data.id! },
      });
    } else {
      const created = await calendar.events.insert({
        calendarId: conn.calendarId,
        requestBody: eventBody,
      });
      await prisma.googleCalendarEvent.create({
        data: {
          userId: params.userId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          googleEventId: created.data.id!,
        },
      });
    }
  } catch (e) {
    console.error('[google-calendar] upsert failed:', e);
  }
}

export async function syncTaskCalendarEvent(params: {
  taskId: number;
  title: string;
  targetDate: Date | null;
  workerId: number;
  previousWorkerId?: number;
}): Promise<void> {
  const { taskId, title, targetDate, workerId, previousWorkerId } = params;

  if (previousWorkerId && previousWorkerId !== workerId) {
    await deleteGoogleCalendarEvent(previousWorkerId, 'TASK', taskId);
  }

  if (!targetDate) {
    await deleteGoogleCalendarEvent(workerId, 'TASK', taskId);
    return;
  }

  await upsertGoogleCalendarEvent({
    userId: workerId,
    sourceType: 'TASK',
    sourceId: taskId,
    title: `[업무] ${title}`,
    date: targetDate,
  });
}

export async function syncLeaveCalendarEvent(params: {
  requestId: number;
  requesterId: number;
  title: string;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  await upsertGoogleCalendarEvent({
    userId: params.requesterId,
    sourceType: 'LEAVE',
    sourceId: params.requestId,
    title: `[휴가] ${params.title}`,
    date: params.startDate,
    endDate: params.endDate,
  });
}

export async function deleteGoogleCalendarEvent(userId: number, sourceType: 'TASK' | 'LEAVE', sourceId: number): Promise<void> {
  try {
    const client = await getAuthorizedClient(userId);
    if (!client) return;

    const conn = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
    if (!conn) return;

    const existing = await prisma.googleCalendarEvent.findUnique({
      where: { userId_sourceType_sourceId: { userId, sourceType, sourceId } },
    });
    if (!existing) return;

    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({ calendarId: conn.calendarId, eventId: existing.googleEventId }).catch(() => {});
    await prisma.googleCalendarEvent.delete({ where: { id: existing.id } });
  } catch (e) {
    console.error('[google-calendar] delete failed:', e);
  }
}
