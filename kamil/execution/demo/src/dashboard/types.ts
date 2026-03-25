export interface GoalTargets {
  targetWeight?: number;
  targetBodyFat?: number;
  targetBenchPress?: number;
  targetSquat?: number;
  targetDeadlift?: number;
}

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
    waist: number[];
    hips: number[];
    chest: number[];
    bicep: number[];
    thigh: number[];
  };
  goals: string[];
  goalTargets?: GoalTargets;
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
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachingPlan {
  id: string;
  coachId: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'weekly' | 'one-time';
  description: string;
  isActive: boolean;
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
  period: string;
  plan: string;
  paymentUrl?: string | null;
}

export interface CheckIn {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: 'completed' | 'scheduled' | 'missed';
  weight: number | null;
  bodyFat: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  bicep: number | null;
  thigh: number | null;
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
  photos: { url: string; label: string }[];
  reviewStatus: 'pending' | 'reviewed' | 'flagged';
  flagReason: string;
  followUpNotes: { text: string; date: string }[];
}

export interface WorkoutSetLog {
  id: string;
  date: string;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: string;
  completed: boolean;
  rpe?: number | null;
}

export type Page = 'overview' | 'clients' | 'client-detail' | 'add-client' | 'messages' | 'analytics' | 'settings' | 'programs' | 'program-builder' | 'payments' | 'check-ins';

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
