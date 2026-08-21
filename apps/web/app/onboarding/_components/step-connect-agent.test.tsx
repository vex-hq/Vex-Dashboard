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

const writeText = vi.fn(async () => {});

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
    await screen.findByText('sk-test-key-9911');
    expect(mintKey).toHaveBeenCalledTimes(1);
  });

  it('leads with the agent door and offers the terminal as the alternative', async () => {
    renderStep();

    const agentTab = await screen.findByRole('tab', {
      name: /connectAgentTab/,
    });
    const terminalTab = screen.getByRole('tab', {
      name: /connectTerminalTab/,
    });

    expect(agentTab).toHaveAttribute('aria-selected', 'true');
    expect(terminalTab).toHaveAttribute('aria-selected', 'false');
  });

  it('puts the minted key into the paste-to-your-agent prompt', async () => {
    renderStep();

    await screen.findByText('sk-test-key-9911');

    expect(
      screen.getByText(/KLIO_API_KEY=sk-test-key-9911/),
    ).toBeInTheDocument();
  });

  it('shows the terminal command once that tab is chosen', async () => {
    renderStep();

    const terminalTab = await screen.findByRole('tab', {
      name: /connectTerminalTab/,
    });

    // Radix's Tabs.Trigger changes value on MOUSEDOWN (or focus), not on
    // click. `fireEvent.click` alone dispatches neither in jsdom and leaves
    // the agent panel showing.
    fireEvent.pointerDown(terminalTab, { button: 0, pointerType: 'mouse' });
    fireEvent.mouseDown(terminalTab, { button: 0 });
    fireEvent.click(terminalTab);

    await waitFor(() =>
      expect(
        screen.getByText('npx @klio-tech/klio@latest init'),
      ).toBeInTheDocument(),
    );
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

  it('does not leak a real key into the prompt before one exists', async () => {
    const mintKey = vi.fn(async () => null);

    renderStep({ mintKey });

    await screen.findByText('onboarding.localKeyFailed');

    expect(screen.getByText(/KLIO_API_KEY=YOUR_API_KEY/)).toBeInTheDocument();
  });
});
