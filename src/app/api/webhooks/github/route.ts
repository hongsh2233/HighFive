import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { addHistory } from '@/lib/task-history';
import { createUserNotification } from '@/lib/notify';

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
  const prUrl: string | undefined = payload.pull_request?.html_url;
  if (!prUrl) {
    return new NextResponse('ok', { status: 200 });
  }

  const task = await prisma.task.findFirst({
    where: { externalLink: prUrl },
  });

  if (!task) {
    return new NextResponse('no matching task', { status: 200 });
  }

  const orgId = task.organizationId ?? undefined;
  const author: string = payload.pull_request?.user?.login || '작업자';

  // PR이 새로 등록되면 담당 리더(업무 등록자)에게 개발 진행 상황을 알린다.
  if (payload.action === 'opened') {
    await createUserNotification(
      task.registrantId,
      'GITHUB_PR_OPENED',
      `'${task.title}' 업무의 PR이 등록되었습니다 (${author}). ${prUrl}`,
      task.id,
      orgId
    );
    return new NextResponse('ok', { status: 200 });
  }

  if (payload.action !== 'closed' || !payload.pull_request?.merged) {
    return new NextResponse('ok', { status: 200 });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: 'DONE', updatedAt: new Date() },
  });

  await addHistory(task.id, 0, 'STATUS_CHANGED', `PR 머지로 자동 완료 처리 (${prUrl})`);

  // 머지 완료를 담당 리더(등록자)와 담당자에게 인앱 알림으로 전달.
  const recipients = new Set<number>([task.registrantId, task.workerId]);
  await Promise.all(
    Array.from(recipients).map((userId) =>
      createUserNotification(
        userId,
        'GITHUB_PR_MERGED',
        `'${task.title}' 업무의 PR이 머지되어 완료 처리되었습니다 (${author}). ${prUrl}`,
        task.id,
        orgId
      )
    )
  );

  return new NextResponse('ok', { status: 200 });
}
