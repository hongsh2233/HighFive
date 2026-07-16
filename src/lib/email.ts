import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

// SMTP_HOST가 설정되지 않은 환경(로컬/이 세션 등)에서는 콘솔 로그로만 대체 — 이메일 발송
// 실패로 전체 요청 흐름이 막히지 않도록 항상 조용히 처리한다.
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log('[EMAIL MOCK]', { to, subject });
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'High5 <no-reply@high5.app>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[email] 발송 실패:', err);
  }
}
