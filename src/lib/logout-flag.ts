// 사용자가 "로그아웃" 버튼으로 직접 로그아웃한 경우, Providers.tsx의 세션 만료 감지가
// 이를 자동 만료로 오인해 "보안을 위해..." 안내를 띄우지 않도록 표시하는 플래그.
let manualLogout = false;

export function markManualLogout() {
  manualLogout = true;
}

export function consumeManualLogout(): boolean {
  const value = manualLogout;
  manualLogout = false;
  return value;
}
