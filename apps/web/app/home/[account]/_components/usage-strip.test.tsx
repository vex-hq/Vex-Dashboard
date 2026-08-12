// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProjectUsage } from '../_lib/server/context-usage.loader';
import { UsageStrip } from './usage-strip';

function usage(overrides: Partial<ProjectUsage>): ProjectUsage {
  return {
    projectId: 'p-1',
    projectName: 'api-gateway',
    memories30d: 12,
    recalls30d: 34,
    storageBytes: 2048,
    estContextTokens30d: 5000,
    ...overrides,
  };
}

describe('<UsageStrip />', () => {
  it('always shows the word "estimated" next to the token figure — the honesty canary', () => {
    render(<UsageStrip usage={[usage({})]} />);

    const tokenFigure = screen.getByTestId('est-context-tokens-p-1');
    expect(within(tokenFigure).getByText(/estimated/i)).toBeInTheDocument();
    expect(within(tokenFigure).getByText('5,000')).toBeInTheDocument();
  });

  it('never labels the measured numbers as estimated', () => {
    render(<UsageStrip usage={[usage({})]} />);

    const memories = screen.getByTestId('memories-30d-p-1');
    const recalls = screen.getByTestId('recalls-30d-p-1');
    const storage = screen.getByTestId('storage-bytes-p-1');

    expect(within(memories).queryByText(/estimated/i)).not.toBeInTheDocument();
    expect(within(recalls).queryByText(/estimated/i)).not.toBeInTheDocument();
    expect(within(storage).queryByText(/estimated/i)).not.toBeInTheDocument();

    expect(within(memories).getByText('12')).toBeInTheDocument();
    expect(within(recalls).getByText('34')).toBeInTheDocument();
    expect(within(storage).getByText('2.0 KB')).toBeInTheDocument();
  });

  it('renders the exact honesty tooltip copy, reachable without hover', () => {
    render(<UsageStrip usage={[usage({})]} />);

    const trigger = screen.getByRole('button', {
      name: /what does estimated mean/i,
    });

    fireEvent.click(trigger);

    expect(
      screen.getByText(
        "Klio doesn't see your agents' own token bills; this is recalls × results × average memory size.",
      ),
    ).toBeInTheDocument();
  });

  it('renders every project row present in usage', () => {
    render(
      <UsageStrip
        usage={[
          usage({ projectId: 'p-1', projectName: 'api-gateway' }),
          usage({ projectId: 'p-2', projectName: 'billing-svc' }),
        ]}
      />,
    );

    expect(screen.getByText('api-gateway')).toBeInTheDocument();
    expect(screen.getByText('billing-svc')).toBeInTheDocument();
  });

  it('renders an empty state when there is no usage data', () => {
    render(<UsageStrip usage={[]} />);

    expect(screen.getByText(/no usage yet/i)).toBeInTheDocument();
  });
});
