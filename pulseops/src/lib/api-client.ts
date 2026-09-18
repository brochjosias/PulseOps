export async function api<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 && retry && !path.startsWith('/api/auth/')) {
    const refresh = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refresh.ok) {
      return api<T>(path, init, false);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new Error(body.message ?? 'Erro na requisição');
  }

  return response.json() as Promise<T>;
}
