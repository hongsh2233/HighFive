// 조직에 속하지 않는 플랫폼 레벨 이벤트(데모 신청 등)를 관리자에게 알리는 헬퍼.
// 조직별 Integration 테이블과 무관하게, 서버 env(SLACK_WEBHOOK_URL)로 직접 발송한다.
export async function notifyPlatformAdminsSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error('[platform-notify] Slack 발송 실패:', err);
  }
}
