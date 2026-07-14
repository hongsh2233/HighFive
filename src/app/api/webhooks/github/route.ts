import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { addHistory } from '@/lib/task-history';

function verify(secret: string, body: string, signature: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-hub-signature-256') || '';
  const event = req.headers.get('x-github-event');
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    return new NextResponse('webhook secret not configured', { status: 401 });
  }
  if (!sig || !verify(secret, rawBody, sig)) {
    return new NextResponse('signature mismatch', { status: 401 });
  }

  if (event !== 'pull_request') {
    return new NextResponse('ok', { status: 200 });
  }

  const payload = JSON.parse(rawBody);
  if (payload.action !== 'closed' || !payload.pull_request?.merged) {
    return new NextResponse('ok', { status: 200 });
  }

  const prUrl: string = payload.pull_request.html_url;

  const task = await prisma.task.findFirst({
    where: { externalLink: prUrl },
  });

  if (!task) {
    return new NextResponse('no matching task', { status: 200 });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: 'DONE', updatedAt: new Date() },
  });

  await addHistory(task.id, 0, 'STATUS_CHANGED', `PR 머지로 자동 완료 처리 (${prUrl})`);

  return new NextResponse('ok', { status: 200 });
}
