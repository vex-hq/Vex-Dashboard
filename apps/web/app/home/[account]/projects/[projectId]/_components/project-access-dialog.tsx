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
  addProjectMemberAction,
  removeProjectMemberAction,
} from '../../_lib/server/projects-actions';

export interface ProjectAccessMember {
  userId: string;
  role: 'member' | 'admin';
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
  members,
  candidates,
}: {
  accountSlug: string;
  projectId: string;
  members: ProjectAccessMember[];
  candidates: ProjectAccessCandidate[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [error, setError] = useState<string | null>(null);

  const addable = useMemo(() => {
    const existing = new Set(members.map((member) => member.userId));
    return candidates.filter((person) => !existing.has(person.userId));
  }, [candidates, members]);

  const adminCount = members.filter((member) => member.role === 'admin').length;

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
            Only these people can open this project. Grant access to someone
            already in the workspace.
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
              onValueChange={(value) => setRole(value as 'member' | 'admin')}
            >
              <SelectTrigger
                id="grant-role"
                className="w-32"
                data-testid="project-grant-role"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Can view</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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
                    <span className="text-muted-foreground text-xs">
                      {member.role === 'admin' ? 'Admin' : 'Can view'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid={`project-revoke-${member.userId}`}
                      disabled={pending || lastAdmin}
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
