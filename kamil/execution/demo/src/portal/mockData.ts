import type { Client, WorkoutProgram, WorkoutLog, CheckIn, Message, WorkoutSetLog, WeeklySchedule } from './types';

// ── Helper: dates relative to today ──
const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
const thisMonday = (() => {
  const d = new Date(today);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
})();

export const mockClient: Client = {
  id: 'mock-client-1',
  name: 'Kuba Mika',
  avatar: '',
  email: 'kuba@fitcore.tech',
  plan: 'Premium',
  status: 'active',
  startDate: '2026-03-10',
  nextCheckIn: fmt(daysFromNow(3)),
  monthlyRate: 199,
  progress: 10,
  metrics: {
    weight: [88, 88, 88, 88, 88, 88, 88],
    bodyFat: [20, 20, 20, 20, 20, 20, 20],
    benchPress: [50, 50, 50, 50, 50, 50, 50],
    squat: [0, 0, 0, 0, 0, 0, 0],
    deadlift: [0, 0, 0, 0, 0, 0, 0],
  },
  height: 182,
  goals: ['Build Upper Body Strength', 'Get Stronger for BJJ', 'Stay Consistent'],
  notes: '',
  lastActive: fmt(today),
  streak: 0,
  onboarded: true,
};

export const mockCoachName = 'Kamil Klecki';

export const mockProgram: WorkoutProgram = {
  id: 'mock-prog-1',
  name: 'Full Body + Martial Arts',
  status: 'active',
  durationWeeks: 12,
  clientIds: ['mock-client-1'],
  days: [
    {
      id: 'day-bjj',
      name: 'BJJ + Box',
      exercises: [],
    },
    {
      id: 'day-gym',
      name: 'Full Body (Gym)',
      exercises: [
        { id: 'ex1', name: 'DB Bench Press', sets: 4, reps: '10', weight: '15kg', rpe: 7, tempo: '2010', restSeconds: 90, notes: 'Dumbbells, each side' },
        { id: 'ex2', name: 'Cable Row', sets: 4, reps: '10', weight: '30kg', rpe: 7, tempo: '2011', restSeconds: 90, notes: '' },
        { id: 'ex3', name: 'DB Shoulder Press', sets: 3, reps: '10', weight: '12kg', rpe: 7, tempo: '2010', restSeconds: 90, notes: 'Dumbbells, each side' },
        { id: 'ex4', name: 'Lat Pulldown', sets: 3, reps: '10', weight: '35kg', rpe: 7, tempo: '2011', restSeconds: 60, notes: '' },
        { id: 'ex5', name: 'Face Pulls', sets: 3, reps: '15', weight: '10kg', rpe: 6, tempo: '2011', restSeconds: 60, notes: 'Shoulder health' },
        { id: 'ex6', name: 'Hammer Curls', sets: 3, reps: '12', weight: '12kg', rpe: 7, tempo: '2010', restSeconds: 60, notes: 'Grip strength for BJJ' },
        { id: 'ex7', name: 'Tricep Pushdown', sets: 3, reps: '12', weight: '15kg', rpe: 7, tempo: '2010', restSeconds: 60, notes: '' },
      ],
    },
  ],
  isTemplate: false,
  createdAt: '2026-03-10',
  updatedAt: '2026-03-10',
};

// Schedule: Mon=BJJ+Box, Wed=BJJ+Box, Fri=Gym
export const mockWeeklySchedule: WeeklySchedule = {
  id: 'mock-sched-1',
  clientId: 'mock-client-1',
  weekStart: fmt(thisMonday),
  dayAssignments: {
    '0': 'day-bjj',   // Monday
    '2': 'day-bjj',   // Wednesday
    '4': 'day-gym',   // Friday
  },
};

// No past workout logs - fresh start - this is a fresh start
export const mockWorkoutLogs: WorkoutLog[] = [];

// No past set logs
export const mockSetLogs: WorkoutSetLog[] = [];

const now = new Date();

export const mockCheckIns: CheckIn[] = [
  {
    id: 'ci1',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    date: fmt(daysFromNow(4)),
    status: 'scheduled',
    weight: null,
    bodyFat: null,
    mood: null,
    energy: null,
    stress: null,
    sleepHours: null,
    steps: null,
    nutritionScore: null,
    notes: '',
    wins: '',
    challenges: '',
    coachFeedback: '',
    photos: [],
    reviewStatus: 'pending',
    flagReason: '',
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg1',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Hey Kuba! Welcome to FitCore. I\'ve set up your program - Full Body on Fridays, plus your BJJ+Box on Mon/Wed. Let\'s build some serious upper body strength.',
    timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
    isRead: false,
    isFromCoach: true,
  },
  {
    id: 'msg2',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Thanks coach! Excited to start. The gym day looks good - no legs right? BJJ already kills my legs haha',
    timestamp: new Date(now.getTime() - 1.5 * 3600000).toISOString(),
    isRead: true,
    isFromCoach: false,
  },
  {
    id: 'msg3',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Exactly - no legs on gym day. BJJ + Box gives you plenty of lower body and conditioning. Friday is all upper body push/pull + arms. Focus on getting stronger there and it\'ll carry over to your grappling.',
    timestamp: new Date(now.getTime() - 1 * 3600000).toISOString(),
    isRead: false,
    isFromCoach: true,
  },
  {
    id: 'msg4',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Also, I updated your program - added face pulls on pull day. Your shoulders will thank you later.',
    timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
    isRead: false,
    isFromCoach: true,
  },
  {
    id: 'msg5',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Got it, makes sense. Will aim for 4x10 at 80. And thanks for the face pulls - my rear delts definitely need the work!',
    timestamp: new Date(now.getTime() - 1.5 * 3600000).toISOString(),
    isRead: true,
    isFromCoach: false,
  },
  // Workout completion notification
  {
    id: 'msg-workout-1',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: '',
    timestamp: new Date(now.getTime() - 0.5 * 3600000).toISOString(), // 30 min ago
    isRead: false,
    isFromCoach: false,
    type: 'workout-complete',
    workoutSummary: {
      dayName: 'Upper Body Pull',
      duration: '48:32',
      exercises: 5,
      sets: '15/15',
      volume: '4,280',
    },
  },
  // Older messages
  {
    id: 'msg6',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Quick question - is it okay to do cardio on rest days? Thinking of adding 20min walks.',
    timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(), // 2 days ago
    isRead: true,
    isFromCoach: false,
  },
  {
    id: 'msg7',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Absolutely! Walking is perfect for rest days. Low impact, helps recovery, and keeps your step count up. Aim for 8-10k steps on those days.',
    timestamp: new Date(now.getTime() - 47 * 3600000).toISOString(),
    isRead: true,
    isFromCoach: true,
  },
];
