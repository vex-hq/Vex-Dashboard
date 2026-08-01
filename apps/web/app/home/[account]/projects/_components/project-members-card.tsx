'use client';

import { useMemo, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Trash2 } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import {
  addProjectMemberAction,
  removeProjectMemberAction,
} from '../_lib/server/projects-actions';

export interface OrgMemberOption {
  user_id: string;
  email: string;
  name: string | null;
}

export interface ProjectMemberView {
  user_id: string;
  role: string;
  email: string | null;
  name: string | null;
  granted_at: string | null;
}

/**
 * The members tab of a project.
 *
 * The "add" picker is populated exclusively from EXISTING ORG MEMBERS — there
 * is no free-text user id field, so the UI cannot express "grant to a stranger"
 * and the server action rejects it anyway (it re-checks org membership before
 * writing).
 *
 * Controls are hidden entirely when `canManage` is false, and the server action
 * re-checks the same condition. The hidden UI is a courtesy; the action is the
 * enforcement.
 */
export function ProjectMembersCard({
  accountSlug,
  projectId,
  members,
  orgMembers,
  canManage,
}: {
  accountSlug: string;
  projectId: string;
  members: ProjectMemberView[];
  orgMembers: OrgMemberOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [error, setError] = useState<string | null>(null);

  const addable = useMemo(() => {
    const existing = new Set(members.map((member) => member.user_id));

    return orgMembers.filter((member) => !existing.has(member.user_id));
  }, [members, orgMembers]);

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
      } catch {
        setError('projects.removeMemberFailed');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:projects.membersTitle" />
        </CardTitle>
        <CardDescription>
          <Trans i18nKey="agentguard:projects.membersDescription" />
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-64 flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:projects.addMember" />
              </label>

              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={addable.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      addable.length === 0
                        ? '—'
                        : 'Select a workspace member…'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {addable.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name ? `${member.name} — ` : ''}
                      {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs">
                <Trans i18nKey="agentguard:projects.role" />
              </label>

              <Select
                value={role}
                onValueChange={(value) => setRole(value as 'member' | 'admin')}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">member</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAdd} disabled={pending || !selectedUserId}>
              <Trans i18nKey="agentguard:projects.grantAccess" />
            </Button>
          </div>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm">
            <Trans i18nKey={`agentguard:${error}`} />
          </p>
        ) : null}

        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:projects.noMembers" />
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="agentguard:projects.colMember" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:projects.role" />
                </TableHead>
                {canManage ? <TableHead /> : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {members.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {member.name ?? member.email ?? (
                          <Trans i18nKey="agentguard:projects.unknownMember" />
                        )}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {member.email ?? member.user_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {member.role}
                    </Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleRemove(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        <span className="sr-only">
                          <Trans i18nKey="agentguard:projects.removeMember" />
                        </span>
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
