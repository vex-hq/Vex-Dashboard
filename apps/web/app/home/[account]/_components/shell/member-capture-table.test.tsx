// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MemberCapture } from '../../_lib/server/member-capture.loader';
import { MemberCaptureTable } from './member-capture-table';

/**
 * The reason this component exists is the zero row, so that is what these
 * tests are about.
 *
 * Two people were added on consecutive days, both onboarded, both holding
 * working keys, and neither had ever captured. Nothing in the product showed
 * it — finding out took a hand-written query against production. A silent
 * member must therefore read as a state needing action, not as an empty cell.
 */
const person = (id: string, name: string, email: string) => ({
  userId: id,
  name,
  email,
  picture_url: null,
}) as never;

const stats = (over: Partial<MemberCapture> & { userId: string }): MemberCapture => ({
  memories: 0,
  lastCaptureAt: null,
  agents: 0,
  ...over,
});

describe('MemberCaptureTable', () => {
  it('says "nothing yet" for a member who has never captured', () => {
    render(
      <MemberCaptureTable
        people={[person('u1', 'Stephan', 'stephan@example.com')]}
        capture={new Map()}
      />,
    );

    expect(screen.getByText('nothing yet')).toBeDefined();
  });

  it('counts the silent members in the header', () => {
    render(
      <MemberCaptureTable
        people={[
          person('u1', 'A', 'a@x.com'),
          person('u2', 'B', 'b@x.com'),
          person('u3', 'C', 'c@x.com'),
        ]}
        capture={
          new Map([['u3', stats({ userId: 'u3', memories: 12, agents: 1 })]])
        }
      />,
    );

    expect(
      screen.getByText(/2 people have not captured anything yet/i),
    ).toBeDefined();
  });

  it('tells them what to actually do, with the SCOPED package name', () => {
    // `npx klio` resolves to an unrelated third-party package on npm, so the
    // shorthand silently installs the wrong thing. The instruction must carry
    // the scope and say why.
    const { container } = render(
      <MemberCaptureTable
        people={[person('u1', 'Stephan', 's@x.com')]}
        capture={new Map()}
      />,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('npx @klio-tech/klio@latest init');
    expect(text).toMatch(/unrelated package/i);
  });

  it('says nothing prescriptive once everyone is capturing', () => {
    render(
      <MemberCaptureTable
        people={[person('u1', 'A', 'a@x.com')]}
        capture={
          new Map([['u1', stats({ userId: 'u1', memories: 5, agents: 1 })]])
        }
      />,
    );

    expect(screen.queryByText(/have not captured/i)).toBeNull();
    expect(screen.queryByText(/npx @klio-tech/i)).toBeNull();
  });

  it('shows counts for an active member, and never their content', () => {
    const { container } = render(
      <MemberCaptureTable
        people={[person('u1', 'A', 'a@x.com')]}
        capture={
          new Map([
            [
              'u1',
              stats({
                userId: 'u1',
                memories: 1234,
                agents: 2,
                lastCaptureAt: new Date().toISOString(),
              }),
            ],
          ])
        }
      />,
    );

    expect(screen.getByText('1,234')).toBeDefined();
    // The loader selects counts and a timestamp only; nothing here may render
    // memory text, for any viewer.
    expect(container.textContent).not.toMatch(/content|memory text/i);
  });

  it('renders nothing at all when the workspace has no people', () => {
    const { container } = render(
      <MemberCaptureTable people={[]} capture={new Map()} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
