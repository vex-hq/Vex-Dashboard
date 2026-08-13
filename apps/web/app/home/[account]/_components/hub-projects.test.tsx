// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HubProjectRow } from '../_lib/hub-projects-model';
import { HubProjects } from './hub-projects';

let currentSearchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/home/acme',
  useSearchParams: () => currentSearchParams,
}));

function row(overrides: Partial<HubProjectRow>): HubProjectRow {
  return {
    id: 'hirly',
    name: 'hirly',
    notes: 186,
    recalled: 0,
    lastActivityAt: '2026-08-12T18:00:00.000Z',
    lead: {
      userId: 'user-abhishek',
      name: 'Abhishek Thakur',
      pictureUrl: null,
    },
    series: [],
    health: 'on-track',
    notRecalled: true,
    statusPercent: 0,
    ...overrides,
  };
}

describe('<HubProjects />', () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    replace.mockReset();
  });

  it('renders Linear project columns and a hexagon name row', () => {
    render(
      <HubProjects
        rows={[row({}), row({ id: 'relio', name: 'relio', notes: 82 })]}
        accountSlug="acme"
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Health' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Priority' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Lead' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Issues' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hirly/i })).toHaveAttribute(
      'href',
      '/home/acme/projects/hirly',
    );
    expect(screen.getAllByText('On track').length).toBeGreaterThan(0);
    expect(screen.getByText('186')).toBeInTheDocument();
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Abhishek Thakur').length).toBe(2);
    expect(screen.getAllByText('AT').length).toBe(2);
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Display' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'More' }),
    ).not.toBeInTheDocument();
  });

  it('leaves Lead blank when the creator is unknown', () => {
    render(<HubProjects rows={[row({ lead: null })]} accountSlug="acme" />);

    expect(screen.queryByTitle('Abhishek Thakur')).not.toBeInTheDocument();
    expect(screen.getAllByText('---')).toHaveLength(1);
  });

  it('writes a Health facet into the URL', () => {
    render(<HubProjects rows={[row({})]} accountSlug="acme" />);

    fireEvent.click(screen.getByRole('button', { name: /insights/i }));
    fireEvent.click(screen.getByRole('button', { name: /not recalled/i }));
    expect(String(replace.mock.calls.at(-1)?.[0])).toContain(
      'health=not-recalled',
    );
  });
});
