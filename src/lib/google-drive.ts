import { google } from 'googleapis';
import { Readable } from 'stream';
import { getAuthorizedClient } from './google-calendar';

const APP_FOLDER_NAME = 'High5 첨부파일';

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  webViewLink: string | null;
  createdTime: string | null;
}

async function getDriveClient(userId: number) {
  const auth = await getAuthorizedClient(userId);
  if (!auth) return null;
  return google.drive({ version: 'v3', auth });
}

async function getOrCreateAppFolder(drive: any): Promise<string> {
  const list = await drive.files.list({
    q: `name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return created.data.id as string;
}

export async function uploadFileToDrive(
  userId: number,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveFileInfo | null> {
  const drive = await getDriveClient(userId);
  if (!drive) return null;

  const folderId = await getOrCreateAppFolder(drive);
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, name, mimeType, size, webViewLink, createdTime',
  });

  return res.data as DriveFileInfo;
}

export async function listDriveFiles(userId: number): Promise<DriveFileInfo[]> {
  const drive = await getDriveClient(userId);
  if (!drive) return [];

  const folderId = await getOrCreateAppFolder(drive);
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, webViewLink, createdTime)',
    orderBy: 'createdTime desc',
  });
  return (res.data.files || []) as DriveFileInfo[];
}

export async function deleteDriveFile(userId: number, fileId: string): Promise<void> {
  const drive = await getDriveClient(userId);
  if (!drive) throw new Error('구글 드라이브가 연결되어 있지 않습니다.');
  await drive.files.delete({ fileId });
}
