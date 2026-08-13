/**
 * Project access roles. Stacked: everyone on the list can view.
 *
 *  read   — recall / open the project; cannot persist
 *  write  — persist memories and artifacts
 *  manage — grant or revoke read and write
 *  admin  — grant or revoke any role; last admin cannot be removed
 *
 * `member` is the pre-040 name for write. Accept it at the edge.
 */

export const PROJECT_ROLES = ['read', 'write', 'manage', 'admin'] as const;

export type ProjectMemberRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_ROLE_LABEL: Record<ProjectMemberRole, string> = {
  read: 'Read',
  write: 'Write',
  manage: 'Manage',
  admin: 'Admin',
};

export function normalizeProjectRole(role: string): ProjectMemberRole | null {
  if (role === 'member') return 'write';
  if (
    role === 'read' ||
    role === 'write' ||
    role === 'manage' ||
    role === 'admin'
  ) {
    return role;
  }
  return null;
}

export function canAssignProjectRole(
  actorRole: string | null,
  newRole: string,
): boolean {
  const actor = actorRole ? normalizeProjectRole(actorRole) : null;
  const target = normalizeProjectRole(newRole);
  if (!target) return false;
  if (actor === 'admin') return true;
  if (actor === 'manage') return target === 'read' || target === 'write';
  return false;
}

export function canTouchProjectMember(
  actorRole: string | null,
  targetRole: string | null,
): boolean {
  const actor = actorRole ? normalizeProjectRole(actorRole) : null;
  const target = targetRole ? normalizeProjectRole(targetRole) : null;
  if (actor === 'admin') return true;
  if (actor === 'manage') return target === 'read' || target === 'write';
  return false;
}

export function grantableProjectRoles(
  actorRole: string | null,
): ProjectMemberRole[] {
  return PROJECT_ROLES.filter((role) => canAssignProjectRole(actorRole, role));
}

export function isProjectManager(role: string | null): boolean {
  const normalised = role ? normalizeProjectRole(role) : null;
  return normalised === 'manage' || normalised === 'admin';
}
