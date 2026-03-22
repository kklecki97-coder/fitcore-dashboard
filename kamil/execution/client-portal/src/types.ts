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
  metrics: {
    weight: number[];
    bodyFat: number[];
    benchPress: number[];
    squat: number[];
    deadlift: number[];
  };
  height: number | null;
  goals: string[];
  notes: string;
  lastActive: string;
  streak: number;
  onboarded: boolean;
}

export interface Message {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  isFromCoach: boolean;
  type?: 'text' | 'workout-complete';
  workoutSummary?: {
    dayName: string;
    duration: string;
    exercises: number;
    sets: string;
    volume?: string;
  };
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

export interface CheckIn {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: 'completed' | 'scheduled' | 'missed';
  weight: number | null;
  bodyFat: number | null;
  mood: 1 | 2 | 3 | 4 | 5 | null;
  energy: number | null;
  stress: number | null;
  sleepHours: number | null;
  steps: number | null;
  nutritionScore: number | null;
  notes: string;
  wins: string;
  challenges: string;
  coachFeedback: string;
  /** Photos attached to this check-in. URL may be a signed URL (expires after 24h) or public URL. Label is the pose (front/side/back). (#44) */
  photos: { url: string; label: string }[];
  reviewStatus: 'pending' | 'reviewed' | 'flagged';
  flagReason: string;
}

// ── Client Portal specific types ──

export interface WorkoutSetLog {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: string;
  completed: boolean;
  rpe?: number | null;
}

export interface WeeklySchedule {
  id: string;
  clientId: string;
  weekStart: string;       // YYYY-MM-DD (Monday)
  dayAssignments: Record<string, string>;  // { "0": "workout-day-id", "2": "workout-day-id" } - key is 0=Mon..6=Sun
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate: string | null;
  period: string;
  plan: 'Basic' | 'Premium' | 'Elite';
  /** Payment URL - should be validated before redirecting (must be https:// Stripe URL) (#35) */
  paymentUrl: string | null;
}

export type ClientPage = 'home' | 'program' | 'check-in' | 'progress' | 'messages' | 'settings' | 'calendar' | 'invoices';

export type Theme = 'dark' | 'light';
