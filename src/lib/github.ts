// GitHub PR/이슈 URL에서 owner/repo/number를 파싱해 코멘트를 남기는 outbound 헬퍼.
// 예: https://github.com/org/repo/pull/12 또는 https://github.com/org/repo/issues/12
function parseGithubUrl(url: string): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(?:pull|issues)\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3]) };
}

export async function postGithubComment(token: string, prOrIssueUrl: string, body: string): Promise<boolean> {
  const parsed = parseGithubUrl(prOrIssueUrl);
  if (!parsed) return false;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
