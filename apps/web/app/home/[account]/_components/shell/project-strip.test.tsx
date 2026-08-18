// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectStripData } from '../../_lib/server/project-strip.loader';

const setDefault = vi.fn();
const setMine = vi.fn();

vi.mock('../../_lib/server/project-scope-actions', () => ({
  setProjectDefaultScopeAction: (...args: unknown[]) => setDefault(...args),
  setMyCaptureScopeAction: (...args: unknown[]) => setMine(...args),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const { ProjectStrip } = await import('./project-strip');

/**
 * The strip states, in plain words, who ends up reading what you type here.
 * These tests are about the two things a wrong answer would cost:
 *
 *  - saying "shared with the team" when the viewer has opted out (they would
 *    self-censor for nothing, or worse, trust it and not);
 *  - offering a control that publishes everyone's work to someone who is not
 *    an admin.
 */
const data = (over: Partial<ProjectStripData> = {}): ProjectStripData => ({
  projectId: '11111111-1111-1111-1111-111111111111',
  name: 'Agent Memory',
  defaultScope: 'org',
  myOverride: null,
  memberCount: 3,
  viewerRole: 'admin',
  ...over,
});

beforeEach(() => {
  setDefault.mockReset().mockResolvedValue({ ok: true });
  setMine.mockReset().mockResolvedValue({ ok: true });
});

describe('ProjectStrip', () => {
  it('says who can read captures, in words rather than scope names', () => {
    render(<ProjectStrip data={data({ defaultScope: 'org' })} accountSlug="a" />);

    expect(
      screen.getByText(/shared with everyone in your team/i),
    ).toBeDefined();
    // The database value must not leak onto the screen.
    expect(screen.queryByText(/scope=/i)).toBeNull();
  });

  it('tells the truth to someone who has opted out', () => {
    // The project shares; this person does not. Showing the project's
    // sentence here would be a false statement about their own work.
    render(
      <ProjectStrip
        data={data({ defaultScope: 'org', myOverride: 'private' })}
        accountSlug="a"
      />,
    );

    expect(screen.getByText(/your own captures here stay private/i)).toBeDefined();
    expect(
      screen.queryByText(/shared with everyone in your team/i),
    ).toBeNull();
  });

  it('lets an admin widen', () => {
    render(<ProjectStrip data={data({ viewerRole: 'admin' })} accountSlug="a" />);

    const select = screen.getByLabelText(/where captures go/i);
    const team = [...select.querySelectorAll('option')].find(
      (o) => o.value === 'org',
    );

    expect(team?.disabled).toBe(false);
  });

  it('does not let a manager widen, but does let them narrow', () => {
    // The asymmetry: publishing everyone's future work is the admin's call;
    // stopping it must not require finding an admin first.
    render(<ProjectStrip data={data({ viewerRole: 'manage' })} accountSlug="a" />);

    const select = screen.getByLabelText(/where captures go/i);
    const options = [...select.querySelectorAll('option')];

    expect(options.find((o) => o.value === 'org')?.disabled).toBe(true);
    expect(options.find((o) => o.value === 'project')?.disabled).toBe(true);
    expect(options.find((o) => o.value === 'private')?.disabled).toBe(false);
  });

  it('shows no project-wide control at all to a plain member', () => {
    render(<ProjectStrip data={data({ viewerRole: 'write' })} accountSlug="a" />);

    expect(screen.queryByLabelText(/where captures go/i)).toBeNull();
    // But they can still opt themselves out.
    expect(screen.getByLabelText(/my captures/i)).toBeDefined();
  });

  it('gives every member their own opt-out, whatever their role', () => {
    render(<ProjectStrip data={data({ viewerRole: 'read' })} accountSlug="a" />);

    fireEvent.change(screen.getByLabelText(/my captures/i), {
      target: { value: 'private' },
    });

    expect(setMine).toHaveBeenCalledWith(
      expect.objectContaining({ mine: 'private' }),
    );
  });

  it('never sends another user id — the action takes the caller from session', () => {
    render(<ProjectStrip data={data()} accountSlug="a" />);

    fireEvent.change(screen.getByLabelText(/my captures/i), {
      target: { value: 'private' },
    });

    const payload = setMine.mock.calls[0]?.[0] ?? {};
    expect(Object.keys(payload)).not.toContain('userId');
  });

  it('says plainly that nothing already stored moves', () => {
    render(<ProjectStrip data={data()} accountSlug="a" />);

    expect(screen.getByText(/nothing already stored moves/i)).toBeDefined();
  });

  it('links to the project for access management', () => {
    render(<ProjectStrip data={data()} accountSlug="acct" />);

    const link = screen.getByText(/manage access/i).closest('a');
    expect(link?.getAttribute('href')).toBe(
      '/home/acct/projects/11111111-1111-1111-1111-111111111111',
    );
  });
});
