import { describe, expect, it } from 'vitest';

import {
  canAssignProjectRole,
  canTouchProjectMember,
  grantableProjectRoles,
  isProjectManager,
  normalizeProjectRole,
} from './project-roles';

describe('project roles', () => {
  it('treats legacy member as write', () => {
    expect(normalizeProjectRole('member')).toBe('write');
    expect(normalizeProjectRole('owner')).toBeNull();
  });

  it('lets manage assign only read and write', () => {
    expect(grantableProjectRoles('manage')).toEqual(['read', 'write']);
    expect(canAssignProjectRole('manage', 'admin')).toBe(false);
    expect(canTouchProjectMember('manage', 'admin')).toBe(false);
    expect(canTouchProjectMember('manage', 'write')).toBe(true);
  });

  it('lets admin assign every role', () => {
    expect(grantableProjectRoles('admin')).toEqual([
      'read',
      'write',
      'manage',
      'admin',
    ]);
    expect(canTouchProjectMember('admin', 'admin')).toBe(true);
  });

  it('does not let write manage the list', () => {
    expect(isProjectManager('write')).toBe(false);
    expect(isProjectManager('manage')).toBe(true);
    expect(grantableProjectRoles('write')).toEqual([]);
  });
});
