// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepConnectCloud } from './step-connect-cloud';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
}));

/** Memoised — a fresh component per render remounts and resets local state. */
const motionComponents = new Map<
  string,
  React.FC<{ children?: React.ReactNode }>
>();

vi.mock('motion/react', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_target, prop: string) => {
      const cached = motionComponents.get(prop);

      if (cached) return cached;

      const Component = ({ children }: { children?: React.ReactNode }) => (
        <div>{children}</div>
      );

      motionComponents.set(prop, Component);

      return Component;
    },
  }),
}));

const writeText = vi.fn(async (_text: string) => {});

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText } });
});

function renderStep(apiKey: string | null = 'sk-cloud-key-4242') {
  const props = {
    accountSlug: 'acme',
    apiKey,
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  return { ...render(<StepConnectCloud {...props} />), props };
}

describe('StepConnectCloud', () => {
  it('is one button, not three stacked code blocks', () => {
    // What shipped: connector URL, MCP endpoint, auth header and a JSON
    // config repeating both — before the reader had decided whether the
    // screen even applied to them.
    renderStep();

    expect(screen.getByTestId('copy-connector-url')).toBeInTheDocument();
    expect(screen.queryByText(/mcpServers/)).not.toBeInTheDocument();
    expect(screen.queryByText(/X-Vex-Key/)).not.toBeInTheDocument();
  });

  it('never shows the key on the default view', () => {
    // The OAuth route needs no key at all. Showing one implies otherwise.
    renderStep();

    expect(screen.queryByText(/sk-cloud-key-4242/)).not.toBeInTheDocument();
  });

  it('copies the connector URL on one click', async () => {
    renderStep();

    fireEvent.click(screen.getByTestId('copy-connector-url'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).toBe('https://mcp.klio.tech/mcp');
  });

  it('reveals the key-based route only when asked', async () => {
    renderStep();

    fireEvent.click(screen.getByText('onboarding.cloudManualLabel'));

    await screen.findByText(/mcpServers/);
    expect(screen.getByText(/X-Vex-Key: sk-cloud-key-4242/)).toBeInTheDocument();
  });

  it('falls back to the placeholder when no key was minted', async () => {
    renderStep(null);

    fireEvent.click(screen.getByText('onboarding.cloudManualLabel'));

    // Both the header line and the JSON config carry it, hence findAll.
    const shown = await screen.findAllByText(/YOUR_API_KEY/);
    expect(shown.length).toBeGreaterThan(0);
  });
});
