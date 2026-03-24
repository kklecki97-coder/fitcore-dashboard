import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import MessagesPage from '../MessagesPage';
import type { Client, Message } from '../../types';

// ── Mock data ──
const mockClients: Client[] = [
  {
    id: 'c1', name: 'Marcus Chen', avatar: '', email: 'marcus@test.com',
    plan: 'Premium', status: 'active', startDate: '2025-01-01',
    nextCheckIn: '2026-03-25', monthlyRate: 200, progress: 50,
    metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
    goals: [], notes: '', notesHistory: [], activityLog: [],
    lastActive: new Date().toISOString(), streak: 5, height: 180,
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-1', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '',
    text: 'Hey coach!', timestamp: new Date().toISOString(),
    isRead: true, isFromCoach: false,
  },
];

const mockSendMessage = vi.fn();

vi.mock('../../contexts/DataProvider', () => ({
  useData: () => ({
    clients: mockClients,
    messages: mockMessages,
    sendMessage: mockSendMessage,
  }),
}));

const makeChannel = () => {
  const ch: Record<string, unknown> = {};
  ch.on = () => ch;
  ch.subscribe = () => ch;
  ch.send = () => Promise.resolve();
  ch.unsubscribe = () => {};
  ch.untrack = () => {};
  return ch;
};

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    }),
    channel: () => makeChannel(),
    removeChannel: () => {},
  },
}));

describe('MessagesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<MessagesPage />);
    expect(container).toBeTruthy();
  });

  it('displays client name', () => {
    renderWithProviders(<MessagesPage />);
    const body = document.body.textContent || '';
    expect(body).toContain('Marcus Chen');
  });

  it('shows message text in chat', () => {
    renderWithProviders(<MessagesPage />);
    // Message appears in both sidebar preview and chat — use getAllByText
    const msgs = screen.getAllByText('Hey coach!');
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  it('has a message input', () => {
    renderWithProviders(<MessagesPage />);
    const inputs = document.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
