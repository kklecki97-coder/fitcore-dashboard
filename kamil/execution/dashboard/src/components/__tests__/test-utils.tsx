/**
 * Test utilities — wrapper with providers for component tests.
 */
import { render, type RenderOptions } from '@testing-library/react';
import { I18nProvider } from '../../i18n';
import type { ReactElement } from 'react';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { default as userEvent } from '@testing-library/user-event';
