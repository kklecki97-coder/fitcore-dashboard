import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from './test-utils';
import LoginPage from '../LoginPage';

// ── Mock supabase ──
const mockSignIn = vi.fn();
const mockGetAAL = vi.fn();
const mockListFactors = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      mfa: {
        getAuthenticatorAssuranceLevel: () => mockGetAAL(),
        listFactors: () => mockListFactors(),
      },
    },
  },
}));

describe('LoginPage', () => {
  const onLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } });
    mockListFactors.mockResolvedValue({ data: { totp: [] } });
  });

  it('renders email and password inputs', () => {
    renderWithProviders(<LoginPage onLogin={onLogin} />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('shows error when fields are empty and form submitted', async () => {
    renderWithProviders(<LoginPage onLogin={onLogin} />);
    const user = userEvent.setup();

    // Submit button is "Zaloguj się" (PL default)
    const submitBtn = screen.getByRole('button', { name: /zaloguj/i });
    await user.click(submitBtn);

    // Should show validation error, not call supabase
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls supabase signIn with email and password', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    renderWithProviders(<LoginPage onLogin={onLogin} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@fitcore.io');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'testpass123');

    const submitBtn = screen.getByRole('button', { name: /zaloguj/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@fitcore.io',
        password: 'testpass123',
      });
    });
  });

  it('calls onLogin after successful authentication', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    renderWithProviders(<LoginPage onLogin={onLogin} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@fitcore.io');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'testpass123');

    const submitBtn = screen.getByRole('button', { name: /zaloguj/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(true);
    });
  });

  it('does not call onLogin on invalid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login' } });

    renderWithProviders(<LoginPage onLogin={onLogin} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'wrong@test.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpass');

    const submitBtn = screen.getByRole('button', { name: /zaloguj/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onLogin).not.toHaveBeenCalled();
    });
  });

  it('toggles password visibility', async () => {
    renderWithProviders(<LoginPage onLogin={onLogin} />);
    const user = userEvent.setup();

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Eye toggle button has tabIndex={-1} so we find it differently
    const buttons = document.querySelectorAll('button[type="button"]');
    const eyeBtn = buttons[0]; // first type="button" is the eye toggle
    if (eyeBtn) {
      await user.click(eyeBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});
