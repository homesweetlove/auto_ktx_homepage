const TOKEN_KEY = 'ktx_sniper_admin_token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경이면 이번 요청에만 사용
  }
}

/**
 * 서버 API 호출. 서버에 ADMIN_TOKEN이 설정되어 있으면 Bearer 토큰을 붙이고,
 * 401을 받으면 토큰을 한 번 입력받아 재시도한다.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(path, { ...init, headers });
  };

  const res = await send(readToken());
  if (res.status !== 401) return res;

  const entered = window.prompt('관리자 토큰(ADMIN_TOKEN)을 입력하세요.');
  if (!entered) return res;
  writeToken(entered.trim());
  const retried = await send(entered.trim());
  if (retried.status === 401) writeToken(null);
  return retried;
}

export function postJson(path: string, body?: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
