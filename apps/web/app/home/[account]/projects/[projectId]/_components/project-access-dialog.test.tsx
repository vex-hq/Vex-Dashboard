// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectAccess } from './project-access-dialog';
import { ProjectAccessDialog } from './project-access-dialog';

const refresh = vi.fn();
const addProjectMemberAction = vi.fn();
const removeProjectMemberAction = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('../../_lib/server/projects-actions', () => ({
  addProjectMemberAction: (...args: unknown[]) =>
    addProjectMemberAction(...args),
  removeProjectMemberAction: (...args: unknown[]) =>
    removeProjectMemberAction(...args),
}));

function access(overrides: Partial<ProjectAccess> = {}): ProjectAccess {
  return {
    canManage: true,
    members: [
      {
        userId: 'user-abhishek',
        role: 'admin',
        name: 'Abhishek Thakur',
        email: 'abhishek@klio.tech',
      },
    ],
    candidates: [
      {
        userId: 'user-abhishek',
        name: 'Abhishek Thakur',
        email: 'abhishek@klio.tech',
      },
      {
        userId: 'user-teammate',
        name: 'Teammate',
        email: 'teammate@klio.tech',
      },
    ],
    ...overrides,
  };
}

describe('<ProjectAccessDialog />', () => {
  beforeEach(() => {
    refresh.mockReset();
    addProjectMemberAction.mockReset();
    removeProjectMemberAction.mockReset();
  });

  it('hides the settings control when the viewer cannot manage', () => {
    render(
      <ProjectAccessDialog
        accountSlug="acme"
        projectId="11111111-1111-1111-1111-111111111111"
        access={access({ canManage: false })}
      />,
    );

    expect(screen.queryByTestId('project-settings')).not.toBeInTheDocument();
  });

  it('opens a modal listing who already has access', () => {
    render(
      <ProjectAccessDialog
        accountSlug="acme"
        projectId="11111111-1111-1111-1111-111111111111"
        access={access()}
      />,
    );

    fireEvent.click(screen.getByTestId('project-settings'));

    expect(screen.getByText('Abhishek Thakur')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByTestId('project-revoke-user-abhishek')).toBeDisabled();
  });

  it('grants access to a workspace member who is not already on the project', async () => {
    addProjectMemberAction.mockResolvedValue({ success: true });

    render(
      <ProjectAccessDialog
        accountSlug="acme"
        projectId="11111111-1111-1111-1111-111111111111"
        access={access()}
      />,
    );

    fireEvent.click(screen.getByTestId('project-settings'));
    fireEvent.click(screen.getByTestId('project-grant-member'));
    fireEvent.click(screen.getByRole('option', { name: /Teammate/i }));
    fireEvent.click(screen.getByTestId('project-grant-submit'));

    await vi.waitFor(() => {
      expect(addProjectMemberAction).toHaveBeenCalledWith({
        accountSlug: 'acme',
        projectId: '11111111-1111-1111-1111-111111111111',
        userId: 'user-teammate',
        role: 'member',
      });
    });
  });
});
