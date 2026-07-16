function layout(bodyHtml: string): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #09090B;">
    <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:24px;">
      <span style="display:inline-block; width:28px; height:28px; border-radius:7px; background: linear-gradient(135deg, #5E6AD2 0%, #7C86E8 100%); color:#fff; font-weight:800; font-size:14px; text-align:center; line-height:28px;">H</span>
      <span style="font-weight:800; font-size:16px;">High5</span>
    </div>
    ${bodyHtml}
    <p style="margin-top:32px; font-size:12px; color:#A1A1AA;">이 메일은 High5에서 자동으로 발송되었습니다.</p>
  </div>`;
}

export function demoRequestConfirmationEmail(name: string): string {
  return layout(`
    <h2 style="font-size:18px;">데모 신청이 접수되었습니다</h2>
    <p style="font-size:14px; line-height:1.7; color:#3F3F46;">
      ${name}님, 안녕하세요.<br/>
      High5 무료 데모 신청이 정상적으로 접수되었습니다. 담당자가 확인 후 빠르게 연락드리겠습니다.
    </p>
  `);
}

export function demoRequestAdminAlertEmail(params: { name: string; company: string; email: string; phone?: string | null; message?: string | null }): string {
  return layout(`
    <h2 style="font-size:18px;">새 데모 신청이 접수되었습니다</h2>
    <table style="font-size:14px; line-height:1.8; color:#3F3F46;">
      <tr><td style="padding-right:12px; color:#71717A;">회사명</td><td>${params.company}</td></tr>
      <tr><td style="padding-right:12px; color:#71717A;">이름</td><td>${params.name}</td></tr>
      <tr><td style="padding-right:12px; color:#71717A;">이메일</td><td>${params.email}</td></tr>
      ${params.phone ? `<tr><td style="padding-right:12px; color:#71717A;">연락처</td><td>${params.phone}</td></tr>` : ''}
      ${params.message ? `<tr><td style="padding-right:12px; color:#71717A;">메시지</td><td>${params.message}</td></tr>` : ''}
    </table>
  `);
}

export function welcomeEmail(orgName: string, loginUrl: string): string {
  return layout(`
    <h2 style="font-size:18px;">${orgName} 조직이 생성되었습니다</h2>
    <p style="font-size:14px; line-height:1.7; color:#3F3F46;">
      가입해주셔서 감사합니다. 아래 주소로 로그인해 바로 시작할 수 있습니다.
    </p>
    <a href="${loginUrl}" style="display:inline-block; margin-top:12px; padding:10px 20px; background:#5E6AD2; color:#fff; border-radius:6px; text-decoration:none; font-size:14px; font-weight:600;">로그인하러 가기</a>
  `);
}
