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
  goals: string[];
  notes: string;
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
  adherence: number | null;
  nutritionScore: number | null;
  notes: string;
  wins: string;
  challenges: string;
  coachFeedback: string;
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
}

export type ClientPage = 'home' | 'program' | 'check-in' | 'progress' | 'messages';

export type Theme = 'dark' | 'light';
