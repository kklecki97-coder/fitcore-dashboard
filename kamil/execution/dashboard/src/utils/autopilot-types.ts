/**
 * Autopilot Types — shared between drafts, hook, and UI.
 */
import type { TriggerType, TriggerPriority } from './smart-coach-engine';

export type CoachTone = 'motivational' | 'technical' | 'friendly' | 'formal';

export interface CoachAutopilotSettings {
  enabled: boolean;
  tone: CoachTone;
  customPhrases: string[];
  maxDraftsPerDay: number;
  autoSendLowPriority: boolean;
}

export const DEFAULT_AUTOPILOT_SETTINGS: CoachAutopilotSettings = {
  enabled: true,
  tone: 'friendly',
  customPhrases: [],
  maxDraftsPerDay: 20,
  autoSendLowPriority: false,
};

export interface MessageDraft {
  id: string;
  triggerId: string;
  clientId: string;
  clientName: string;
  triggerType: TriggerType;
  priority: TriggerPriority;
  text: string;
  context: string; // human-readable trigger reason
  generatedAt: string;
  status: 'pending' | 'approved' | 'edited' | 'skipped';
}
