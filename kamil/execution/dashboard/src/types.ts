export interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  plan: 'Basic' | 'Premium' | 'Elite';
  status: 'active' | 'paused' | 'pending';
  startDate: string;
  nextCheckIn: string;
  monthlyRate: number;
  progress: number;
  height?: number;
  metrics: {
    weight: number[];
    bodyFat: number[];
    benchPress: number[];
    squat: number[];
    deadlift: number[];
  };
  goals: string[];
  notes: string;
  notesHistory: { text: string; date: string; isKey?: boolean }[];
  activityLog: { type: string; description: string; date: string }[];
  lastActive: string;
  streak: number;
}

export type MessageChannel = 'telegram' | 'whatsapp' | 'email' | 'instagram';

export interface Message {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  isFromCoach: boolean;
  channel?: MessageChannel;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface RevenueData {
  month: string;
  revenue: number;
  clients: number;
}

export interface WorkoutLog {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  duration: number;
  date: string;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rpe: number | null;
  tempo: string;
  restSeconds: number | null;
  notes: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  durationWeeks: number;
  clientIds: string[];
  days: WorkoutDay[];
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate: string | null;
  period: string; // e.g. "Feb 2026"
  plan: 'Basic' | 'Premium' | 'Elite';
}

export interface CheckIn {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: 'completed' | 'scheduled' | 'missed';
  // ── Body metrics ──
  weight: number | null;
  bodyFat: number | null;
  // ── Wellness scores (1-10 scales) ──
  mood: 1 | 2 | 3 | 4 | 5 | null;
  energy: number | null;       // 1-10
  stress: number | null;       // 1-10
  sleepHours: number | null;
  // ── Compliance ──
  adherence: number | null;    // 0-100 percentage
  nutritionScore: number | null; // 1-10 (how well they stuck to macros/plan)
  // ── Qualitative ──
  notes: string;               // client self-report
  wins: string;                // 3-5 wins this week
  challenges: string;          // challenges faced
  coachFeedback: string;
  // ── Progress photos ──
  photos: { url: string; label: 'front' | 'side' | 'back' }[];
  // ── Review workflow ──
  reviewStatus: 'pending' | 'reviewed' | 'flagged'; // coach review state
  flagReason: string;          // why flagged (needs program change, call, etc.)
  // ── Follow-up notes (post-review) ──
  followUpNotes: { text: string; date: string }[];
}

export type Page = 'overview' | 'clients' | 'client-detail' | 'add-client' | 'messages' | 'analytics' | 'schedule' | 'settings' | 'programs' | 'program-builder' | 'payments' | 'check-ins';

export type Theme = 'dark' | 'light';

export type NotificationType = 'message' | 'checkin' | 'payment' | 'program' | 'client';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  clientId?: string;
  targetPage?: Page;
}
