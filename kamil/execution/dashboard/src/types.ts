export interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  plan: string;
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

export interface Message {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  isFromCoach: boolean;
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

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate: string | null;
  period: string; // e.g. "Feb 2026"
  plan: string;
  paymentUrl?: string | null;
  stripeSessionId?: string | null;
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
  steps: number | null;        // daily average steps
  nutritionScore: number | null; // 1-10 (how well they stuck to macros/plan)
  // ── Qualitative ──
  notes: string;               // client self-report
  wins: string;                // 3-5 wins this week
  challenges: string;          // challenges faced
  coachFeedback: string;
  // ── Progress photos ──
  photos: { url: string; label: string }[];
  // ── Review workflow ──
  reviewStatus: 'pending' | 'reviewed' | 'flagged'; // coach review state
  flagReason: string;          // why flagged (needs program change, call, etc.)
  // ── Follow-up notes (post-review) ──
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

export type Page = 'overview' | 'clients' | 'client-detail' | 'add-client' | 'messages' | 'analytics' | 'schedule' | 'settings' | 'programs' | 'program-builder' | 'program-create-chooser' | 'ai-program-creator' | 'program-import' | 'payments' | 'check-ins' | 'exercise-library' | 'habits';

// ── Habit Tracking ──

export type HabitType = 'checkbox' | 'number' | 'scale';

export interface Habit {
  id: string;
  coachId: string | null;      // null = global preset
  name: string;
  type: HabitType;
  defaultTarget: number | null; // e.g. 3 (liters), 8 (hours), null for checkbox
  unit: string | null;          // 'L', 'h', 'g', 'min', 'steps', null
  icon: string;                 // lucide icon name
  isPreset: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface HabitAssignment {
  id: string;
  coachId: string;
  clientId: string;
  habitId: string;
  habit?: Habit;                // joined from habits table
  targetValue: number | null;   // override per client
  startDate: string;
  endDate: string | null;       // null = ongoing
  isActive: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  clientId: string;
  habitAssignmentId: string;
  logDate: string;              // YYYY-MM-DD
  value: number | null;         // 2.5 for water, 7.5 for sleep, 8 for scale, 1 for checkbox
  completed: boolean;           // true if target met
  createdAt: string;
}

// ── Exercise Library ──

export type MuscleGroup = 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'full-body' | 'cardio';
export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'band' | 'other';
export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'rotation' | 'isolation';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface CatalogExercise {
  id: string;
  name: string;
  namePl?: string;
  slug: string;
  description: string;
  descriptionPl?: string;
  instructions: string[];
  instructionsPl?: string[];
  tips: string[];
  commonMistakes: string[];
  primaryMuscle: string;
  secondaryMuscles: string[];
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  movementPattern: MovementPattern;
  difficulty: Difficulty;
  mechanic: 'compound' | 'isolation';
  gifUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
  isGlobal: boolean;
  isCoachCustom?: boolean;
  isFavorite?: boolean;
}

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
