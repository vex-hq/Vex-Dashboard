'use client';

import { useMemo, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import {
  PROJECT_ROLE_LABEL,
  type ProjectMemberRole,
  canTouchProjectMember,
  grantableProjectRoles,
} from '~/lib/agentguard/project-roles';

import {
  addProjectMemberAction,
  removeProjectMemberAction,
} from '../../_lib/server/projects-actions';

export interface ProjectAccessMember {
  userId: string;
  role: ProjectMemberRole;
  name: string;
  email: string | null;
}

export interface ProjectAccessCandidate {
  userId: string;
  name: string;
  email: string;
}

export interface ProjectAccess {
  canManage: boolean;
  viewerRole: ProjectMemberRole | null;
  members: ProjectAccessMember[];
  candidates: ProjectAccessCandidate[];
}

/**
 * Settings gear on the project page. The form lives inside the open dialog
 * so closing it unmounts in-flight state (selected user, error, pending).
 *
 * The picker is only workspace members who are not already on the project.
 * The server action re-checks org membership and project admin. Last admin
 * cannot be removed — the button is disabled, and the engine rejects it too.
 */
export function ProjectAccessDialog({
  accountSlug,
  projectId,
  access,
}: {
  accountSlug: string;
  projectId: string;
  access: ProjectAccess;
}) {
  const { t } = useTranslation('agentguard');
  const [open, setOpen] = useState(false);

  if (!access.canManage) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid="project-settings"
          aria-label={t('projects.settings', 'Project settings')}
          className="klio-soft inline-flex size-7 items-center justify-center rounded-md"
          style={{ color: '#6b6f76' }}
        >
          <Settings className="size-3.5" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <ProjectAccessForm
            accountSlug={accountSlug}
            projectId={projectId}
            viewerRole={access.viewerRole}
            members={access.members}
            candidates={access.candidates}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectAccessForm({
  accountSlug,
  projectId,
  viewerRole,
  members,
  candidates,
}: {
  accountSlug: string;
  projectId: string;
  viewerRole: ProjectMemberRole | null;
  members: ProjectAccessMember[];
  candidates: ProjectAccessCandidate[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState('');
  const grantable = grantableProjectRoles(viewerRole);
  const [role, setRole] = useState<ProjectMemberRole>(
    grantable.includes('write') ? 'write' : (grantable[0] ?? 'write'),
  );
  const [error, setError] = useState<string | null>(null);

  const addable = useMemo(() => {
    const existing = new Set(members.map((member) => member.userId));
    return candidates.filter((person) => !existing.has(person.userId));
  }, [candidates, members]);

  const adminCount = members.filter((member) => member.role === 'admin').length;

  function handleChangeRole(userId: string, nextRole: ProjectMemberRole) {
    setError(null);

    startTransition(async () => {
      try {
        await addProjectMemberAction({
          accountSlug,
          projectId,
          userId,
          role: nextRole,
        });
        router.refresh();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : '';
        setError(
          message.includes('last admin')
            ? 'projects.lastAdmin'
            : 'projects.addMemberFailed',
        );
      }
    });
  }

  function handleAdd() {
    if (!selectedUserId) return;
    setError(null);

    startTransition(async () => {
      try {
        await addProjectMemberAction({
          accountSlug,
          projectId,
          userId: selectedUserId,
          role,
        });
        setSelectedUserId('');
        router.refresh();
      } catch {
        setError('projects.addMemberFailed');
      }
    });
  }

  function handleRemove(userId: string) {
    setError(null);

    startTransition(async () => {
      try {
        await removeProjectMemberAction({ accountSlug, projectId, userId });
        router.refresh();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : '';
        setError(
          message.includes('last admin')
            ? 'projects.lastAdmin'
            : 'projects.removeMemberFailed',
        );
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <Trans i18nKey="agentguard:projects.settingsTitle">Access</Trans>
        </DialogTitle>
        <DialogDescription>
          <Trans i18nKey="agentguard:projects.settingsDescription">
            Everyone here can open the project. Read cannot add memories. Write
            can. Manage can grant Read and Write. Admin can grant any role.
          </Trans>
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-1 flex-col gap-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="grant-member"
            >
              <Trans i18nKey="agentguard:projects.addMember" />
            </label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={addable.length === 0}
            >
              <SelectTrigger
                id="grant-member"
                data-testid="project-grant-member"
              >
                <SelectValue
                  placeholder={
                    addable.length === 0
                      ? 'Everyone in the workspace already has access'
                      : 'Select a workspace member'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {addable.map((person) => (
                  <SelectItem key={person.userId} value={person.userId}>
                    {person.name}
                    {person.email && person.email !== person.name
                      ? ` — ${person.email}`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="grant-role"
            >
              <Trans i18nKey="agentguard:projects.role" />
            </label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as ProjectMemberRole)}
            >
              <SelectTrigger
                id="grant-role"
                className="w-32"
                data-testid="project-grant-role"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grantable.map((option) => (
                  <SelectItem key={option} value={option}>
                    {PROJECT_ROLE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            data-testid="project-grant-submit"
            onClick={handleAdd}
            disabled={pending || !selectedUserId}
          >
            <Trans i18nKey="agentguard:projects.grantAccess" />
          </Button>
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            <Trans i18nKey={`agentguard:${error}`} />
          </p>
        ) : null}

        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:projects.noMembers" />
          </p>
        ) : (
          <ul className="divide-border divide-y rounded-md border">
            {members.map((member) => {
              const lastAdmin = member.role === 'admin' && adminCount === 1;
              const canEdit = canTouchProjectMember(viewerRole, member.role);
              const memberGrantable = grantableProjectRoles(viewerRole).filter(
                (option) =>
                  option !== 'admin' || !lastAdmin || member.role === 'admin',
              );

              return (
                <li
                  key={member.userId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name}
                    </p>
                    {member.email ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit ? (
                      <Select
                        value={member.role}
                        disabled={pending}
                        onValueChange={(value) =>
                          handleChangeRole(
                            member.userId,
                            value as ProjectMemberRole,
                          )
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-28"
                          data-testid={`project-role-${member.userId}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {memberGrantable.map((option) => (
                            <SelectItem key={option} value={option}>
                              {PROJECT_ROLE_LABEL[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {PROJECT_ROLE_LABEL[member.role]}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid={`project-revoke-${member.userId}`}
                      disabled={pending || lastAdmin || !canEdit}
                      title={
                        lastAdmin
                          ? 'A project needs at least one admin'
                          : undefined
                      }
                      onClick={() => handleRemove(member.userId)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      <span className="sr-only">
                        <Trans i18nKey="agentguard:projects.removeMember" />
                      </span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
