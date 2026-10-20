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
    // Tenta extrair a mensagem de erro do JSON de resposta
    const body = await response.json().catch(() => ({}));
    let message = body.message;

    // Fallbacks baseados no status HTTP
    if (!message) {
      if (response.status === 403) {
        message = 'Você não tem permissão para realizar esta ação.';
      } else if (response.status === 404) {
        message = 'O recurso solicitado não foi encontrado.';
      } else if (response.status >= 500) {
        message = 'Erro interno no servidor. Tente novamente mais tarde.';
      } else {
        message = 'Ocorreu um erro ao processar a requisição.';
      }
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
