// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectFirstAgent } from './connect-first-agent';

/**
 * `ConnectFirstAgent` calls `router.refresh()` from `next/navigation` to
 * ask the parent server component to re-check for a memory, matching how
 * `context-stream.test.tsx` mocks the same module. `refresh` is a
 * controllable deferred promise here (not an immediately-resolved mock) so
 * tests can observe the "Checking…" pending label before it resolves — a
 * plain `vi.fn()` would settle the transition before assertions ever ran.
 */
let refreshDeferred = deferred<void>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: () => refreshDeferred.promise,
  }),
}));

/**
 * `ConnectFirstAgent` also mints the key via a server action. Every test
 * here starts from the post-mint "command" view, so the action always
 * resolves immediately with a fixed key — none of these tests exercise the
 * mint flow itself.
 */
vi.mock('../settings/api-keys/_lib/server/api-keys-actions', () => ({
  createApiKeyAction: vi.fn().mockResolvedValue({ key: 'sk-test-key' }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Renders the card and clicks through mint so the "check" button exists. */
async function renderAtCheckStep() {
  render(<ConnectFirstAgent accountSlug="acme" />);

  fireEvent.click(
    screen.getByRole('button', { name: /create key & show my command/i }),
  );

  return screen.findByRole('button', {
    name: /i ran it — check for my first memory/i,
  });
}

describe('<ConnectFirstAgent />', () => {
  beforeEach(() => {
    refreshDeferred = deferred<void>();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the pending label and disables the button while checking', async () => {
    const checkButton = await renderAtCheckStep();

    act(() => {
      fireEvent.click(checkButton);
    });

    const pendingButton = screen.getByRole('button', { name: /checking/i });
    expect(pendingButton).toBeDisabled();

    // Resolve the in-flight refresh so the test doesn't leak a pending act().
    await act(async () => {
      refreshDeferred.resolve();
      await refreshDeferred.promise;
    });
  });

  it('reports "nothing captured yet" once the check resolves and the card is still mounted', async () => {
    const checkButton = await renderAtCheckStep();

    fireEvent.click(checkButton);

    await act(async () => {
      refreshDeferred.resolve();
      await refreshDeferred.promise;
    });

    await waitFor(() => {
      expect(
        screen.getByText(/no memory captured yet/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/command ran in your terminal without an error/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload the page/i }),
    ).toBeInTheDocument();
  });

  it('re-runs and re-reports on a second click instead of latching on the first result', async () => {
    const checkButton = await renderAtCheckStep();

    fireEvent.click(checkButton);
    await act(async () => {
      refreshDeferred.resolve();
      await refreshDeferred.promise;
    });
    await waitFor(() => {
      expect(
        screen.getByText(/no memory captured yet/i),
      ).toBeInTheDocument();
    });

    // Second round: a fresh deferred so the click genuinely re-triggers the
    // pending state rather than reusing the already-resolved promise.
    refreshDeferred = deferred<void>();

    act(() => {
      fireEvent.click(
        screen.getByRole('button', {
          name: /i ran it — check for my first memory/i,
        }),
      );
    });

    expect(
      screen.getByRole('button', { name: /checking/i }),
    ).toBeInTheDocument();

    await act(async () => {
      refreshDeferred.resolve();
      await refreshDeferred.promise;
    });

    await waitFor(() => {
      expect(
        screen.getByText(/no memory captured yet/i),
      ).toBeInTheDocument();
    });
  });
});
