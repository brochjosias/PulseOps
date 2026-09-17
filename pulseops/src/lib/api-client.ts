export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && typeof window !== 'undefined' && !path.includes('/auth/')) {
    const refresh = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refresh.ok) {
      return api<T>(path, init);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    throw new Error(body.message ?? 'Erro na requisição');
  }

  return res.json();
}
