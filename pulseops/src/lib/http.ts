import { NextResponse } from 'next/server';

import { getSession, type Session } from './auth';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ message, details }, { status: 400 });
}

export function unauthorized(message = 'Não autenticado') {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = 'Sem permissão') {
  return NextResponse.json({ message }, { status: 403 });
}

export function notFound(message = 'Não encontrado') {
  return NextResponse.json({ message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ message }, { status: 409 });
}

export function serverError(message = 'Erro interno') {
  return NextResponse.json({ message }, { status: 500 });
}

/** Obtém sessão e devolve um par pronto para uso. */
export async function withSession(): Promise<
  { session: Session; error: null } | { session: null; error: Response }
> {
  const session = await getSession();
  if (!session) return { session: null, error: unauthorized() };
  return { session, error: null };
}
