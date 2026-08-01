'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Trans } from '@kit/ui/trans';

import { createProjectAction } from '../_lib/server/projects-actions';

/**
 * Create a project explicitly.
 *
 * The engine also auto-creates projects the first time an agent writes from a
 * repo, so this form is for naming and organising ahead of use — the copy says
 * so, because otherwise people create duplicates of projects that already
 * exist under a path-derived name.
 *
 * The creator becomes the project's first admin, which is what lets them grant
 * access without being an org admin.
 */
export function CreateProjectDialog({ accountSlug }: { accountSlug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [gitRemote, setGitRemote] = useState('');
  const [repoRootPath, setRepoRootPath] = useState('');

  function reset() {
    setDisplayName('');
    setGitRemote('');
    setRepoRootPath('');
    setError(null);
  }

  function handleCreate() {
    setError(null);

    startTransition(async () => {
      try {
        await createProjectAction({
          accountSlug,
          displayName: displayName.trim(),
          gitRemote: gitRemote.trim(),
          repoRootPath: repoRootPath.trim(),
        });

        setOpen(false);
        reset();
        router.refresh();
      } catch {
        setError('projects.createFailed');
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Trans i18nKey="agentguard:projects.createProject" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="agentguard:projects.createProject" />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey="agentguard:projects.createProjectDescription" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">
              <Trans i18nKey="agentguard:projects.displayName" />
            </Label>
            <Input
              id="project-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={255}
              placeholder="dashboard"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-remote">
              <Trans i18nKey="agentguard:projects.gitRemote" />
            </Label>
            <Input
              id="project-remote"
              value={gitRemote}
              onChange={(event) => setGitRemote(event.target.value)}
              maxLength={500}
              placeholder="https://github.com/klio-tech/dashboard.git"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-path">
              <Trans i18nKey="agentguard:projects.repoRootPath" />
            </Label>
            <Input
              id="project-path"
              value={repoRootPath}
              onChange={(event) => setRepoRootPath(event.target.value)}
              maxLength={1000}
              placeholder="/Users/you/code/dashboard"
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm">
              <Trans i18nKey={`agentguard:${error}`} />
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            <Trans i18nKey="agentguard:projects.cancel" />
          </Button>
          <Button
            onClick={handleCreate}
            disabled={pending || displayName.trim().length === 0}
          >
            <Trans i18nKey="agentguard:projects.create" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
