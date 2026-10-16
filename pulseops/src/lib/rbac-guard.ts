import { hasRole, type Role } from './rbac';
import { getSession, type Session } from './auth';
import { forbidden, unauthorized } from './http';

export async function requireRole(
  minimum: Role,
): Promise<{ session: Session; error: null } | { session: null; error: Response }> {
  const session = await getSession();

  if (!session) return { session: null, error: unauthorized() };

  if (!hasRole(session.role, minimum)) {
    return {
      session: null,
      error: forbidden(`Requer papel ${minimum} ou superior`),
    };
  }

  return { session, error: null };
}
