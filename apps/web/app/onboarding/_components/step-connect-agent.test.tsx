// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepConnectAgent } from './step-connect-agent';

/**
 * `react-i18next` is stubbed to echo the key, so these assertions are about
 * STRUCTURE (which panel is showing, what the code blocks contain) and never
 * about English wording — copy is free to change without breaking them.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * `motion/react` renders its own DOM wrappers with animation props React
 * would warn about on plain elements. Reduced to passthroughs.
 *
 * The cache is load-bearing, not an optimisation. A proxy that built a fresh
 * component on every property access hands React a NEW component type each
 * render, so React unmounts and remounts the whole subtree — which resets
 * Radix's internal tab state back to its default and made the tab-switch
 * test fail against a component that works correctly in the browser.
 */
const motionComponents = new Map<string, React.FC<{ children?: React.ReactNode }>>();

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
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const writeText = vi.fn(async (_text: string) => {});

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText } });
});

type StepProps = Parameters<typeof StepConnectAgent>[0];

function renderStep(overrides: Partial<StepProps> = {}) {
  const props: StepProps = {
    mintKey: vi.fn(async () => 'sk-test-key-9911'),
    onNext: vi.fn(),
    onBack: vi.fn(),
    onKeyCreated: vi.fn(),
    ...overrides,
  };

  return { ...render(<StepConnectAgent {...props} />), props };
}

describe('StepConnectAgent', () => {
  it('mints exactly once on mount', async () => {
    // THE REGRESSION THIS GUARDS. Every mint revokes the previous key, so a
    // dependency that changes identity between renders — an inline arrow
    // passed as `mintKey` or `onKeyCreated` — silently invalidates the key
    // the user was just shown. It has to fire once and stay fired.
    const mintKey = vi.fn(async () => 'sk-test-key-9911');

    renderStep({ mintKey });

    await waitFor(() => expect(mintKey).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('copy-agent-prompt')).toBeEnabled(),
    );
    expect(mintKey).toHaveBeenCalledTimes(1);
  });

  it('is one button, not a wall of text', async () => {
    // The prompt is written for a machine — nobody reads it, they copy it.
    // Rendering it in full buried the actual action under a screenful of
    // monospace, so it must live in the clipboard and nowhere else.
    renderStep();

    await waitFor(() =>
      expect(screen.getByTestId('copy-agent-prompt')).toBeEnabled(),
    );

    expect(screen.queryByText(/KLIO_API_KEY=/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase 2 incomplete/)).not.toBeInTheDocument();
    // The key is inside the copied prompt; showing it here is one more
    // thing to read that the agent path never needs.
    expect(screen.queryByText('sk-test-key-9911')).not.toBeInTheDocument();
  });

  it('copies the full prompt, with the key, on one click', async () => {
    renderStep();

    const button = await screen.findByTestId('copy-agent-prompt');
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));

    const copied = writeText.mock.calls[0]![0];
    expect(copied).toContain('KLIO_API_KEY=sk-test-key-9911');
    expect(copied).toContain('init --cloud');
  });

  it('confirms the copy and says what to do next', async () => {
    renderStep();

    const button = await screen.findByTestId('copy-agent-prompt');
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await screen.findByText('onboarding.connectAgentPasteHint');
  });

  it('keeps the terminal route collapsed until asked for', async () => {
    renderStep();

    await waitFor(() =>
      expect(screen.getByTestId('copy-agent-prompt')).toBeEnabled(),
    );

    expect(
      screen.queryByText('npx @klio-tech/klio@latest init'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('onboarding.connectTerminalToggle'));

    await screen.findByText('npx @klio-tech/klio@latest init');
    // The CLI really does stop and ask for the key on this path, so here it
    // is shown — and only here.
    expect(screen.getByText('sk-test-key-9911')).toBeInTheDocument();
  });

  it('offers a retry, and never traps the user, when minting fails', async () => {
    const mintKey = vi.fn(async () => {
      throw new Error('rate limited');
    });

    const { props } = renderStep({ mintKey });

    await screen.findByText('onboarding.localKeyFailed');

    // Continue must stay live: a key can be minted later from Settings, and
    // the next screen still works. A failed mint is not a dead end.
    const next = screen.getByRole('button', { name: 'onboarding.next' });
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(props.onNext).toHaveBeenCalled();
  });

  it('does not put a real key in the clipboard before one exists', async () => {
    const mintKey = vi.fn(async () => null);

    renderStep({ mintKey });

    await screen.findByText('onboarding.localKeyFailed');
    fireEvent.click(screen.getByTestId('copy-agent-prompt'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).toContain(
      'KLIO_API_KEY=YOUR_API_KEY',
    );
  });
});
