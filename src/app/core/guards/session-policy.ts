export const OPERATOR_ROLE = 'ROLE_SAAS_OPERATOR';

export function sessionHome(roles: readonly string[], forcePasswordChange = false): string {
  if (forcePasswordChange) return '/change-password';
  return roles.includes(OPERATOR_ROLE) ? '/saas/clinicas' : '/dashboard';
}

export function canAccessRoles(userRoles: readonly string[], expectedRoles: readonly string[] = []): boolean {
  // Operator privileges never grant access to the clinical workspace, even with mixed roles.
  if (userRoles.includes(OPERATOR_ROLE)) return expectedRoles.includes(OPERATOR_ROLE);
  return expectedRoles.length === 0 || expectedRoles.some(role => userRoles.includes(role));
}
