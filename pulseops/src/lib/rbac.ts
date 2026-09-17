export const ROLES = ['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];

const rank: Record<Role, number> = {
  VIEWER: 0,
  ANALYST: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function hasRole(userRole: string | null | undefined, minimumRole: Role) {
  if (!userRole || !isRole(userRole)) {
    return false;
  }

  return rank[userRole] >= rank[minimumRole];
}
