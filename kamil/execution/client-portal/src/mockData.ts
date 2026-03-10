import type { Client, WorkoutProgram, WorkoutLog, CheckIn, Message, WorkoutSetLog, WeeklySchedule } from './types';

// ── Helper: dates relative to today ──
const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
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
  startDate: '2025-12-01',
  nextCheckIn: fmt(daysFromNow(3)),
  monthlyRate: 199,
  progress: 42,
  metrics: {
    weight: [92, 91.2, 90.5, 89.8, 89.3, 88.7, 88.1],
    bodyFat: [22, 21.5, 21, 20.5, 20.2, 19.8, 19.5],
    benchPress: [70, 72.5, 75, 77.5, 80, 80, 82.5],
    squat: [90, 95, 100, 105, 107.5, 110, 112.5],
    deadlift: [110, 115, 120, 125, 127.5, 130, 135],
  },
  height: 182,
  goals: ['Lose Weight', 'Bench Press 100kg', 'Body Fat under 15%'],
  notes: '',
  lastActive: fmt(today),
  streak: 12,
  onboarded: true,
};

export const mockCoachName = 'Kamil Klecki';

export const mockProgram: WorkoutProgram = {
  id: 'mock-prog-1',
  name: 'Hypertrophy Block A',
  status: 'active',
  durationWeeks: 12,
  clientIds: ['mock-client-1'],
  days: [
    {
      id: 'day-upper',
      name: 'Upper Body Push',
      exercises: [
        { id: 'ex1', name: 'Bench Press', sets: 4, reps: '8-10', weight: '80kg', rpe: 8, tempo: '3010', restSeconds: 120, notes: '' },
        { id: 'ex2', name: 'Overhead Press', sets: 3, reps: '10-12', weight: '45kg', rpe: 7, tempo: '3010', restSeconds: 90, notes: '' },
        { id: 'ex3', name: 'Incline DB Press', sets: 3, reps: '12', weight: '30kg', rpe: 7, tempo: '2010', restSeconds: 90, notes: '' },
        { id: 'ex4', name: 'Cable Lateral Raise', sets: 3, reps: '15', weight: '10kg', rpe: 8, tempo: '2011', restSeconds: 60, notes: '' },
        { id: 'ex5', name: 'Tricep Pushdown', sets: 3, reps: '12-15', weight: '25kg', rpe: 8, tempo: '2010', restSeconds: 60, notes: '' },
      ],
    },
    {
      id: 'day-lower',
      name: 'Lower Body',
      exercises: [
        { id: 'ex6', name: 'Squat', sets: 4, reps: '6-8', weight: '110kg', rpe: 8, tempo: '3010', restSeconds: 180, notes: '' },
        { id: 'ex7', name: 'Romanian Deadlift', sets: 3, reps: '10-12', weight: '90kg', rpe: 7, tempo: '3010', restSeconds: 120, notes: '' },
        { id: 'ex8', name: 'Leg Press', sets: 3, reps: '12', weight: '180kg', rpe: 8, tempo: '2010', restSeconds: 90, notes: '' },
        { id: 'ex9', name: 'Leg Curl', sets: 3, reps: '12-15', weight: '45kg', rpe: 7, tempo: '2011', restSeconds: 60, notes: '' },
        { id: 'ex10', name: 'Calf Raise', sets: 4, reps: '15', weight: '60kg', rpe: 8, tempo: '2011', restSeconds: 60, notes: '' },
      ],
    },
    {
      id: 'day-pull',
      name: 'Upper Body Pull',
      exercises: [
        { id: 'ex11', name: 'Barbell Row', sets: 4, reps: '8-10', weight: '80kg', rpe: 8, tempo: '2011', restSeconds: 120, notes: '' },
        { id: 'ex12', name: 'Pull-ups', sets: 3, reps: '8-10', weight: 'BW+10kg', rpe: 8, tempo: '2010', restSeconds: 120, notes: '' },
        { id: 'ex13', name: 'Face Pulls', sets: 3, reps: '15', weight: '15kg', rpe: 7, tempo: '2011', restSeconds: 60, notes: '' },
        { id: 'ex14', name: 'Hammer Curls', sets: 3, reps: '12', weight: '16kg', rpe: 7, tempo: '2010', restSeconds: 60, notes: '' },
        { id: 'ex15', name: 'Barbell Curl', sets: 3, reps: '10-12', weight: '30kg', rpe: 8, tempo: '2010', restSeconds: 60, notes: '' },
      ],
    },
  ],
  isTemplate: false,
  createdAt: '2026-02-01',
  updatedAt: '2026-03-01',
};

// Schedule: Mon=Upper Push, Wed=Lower, Fri=Upper Pull (3 days)
export const mockWeeklySchedule: WeeklySchedule = {
  id: 'mock-sched-1',
  clientId: 'mock-client-1',
  weekStart: fmt(thisMonday),
  dayAssignments: {
    '0': 'day-upper',  // Monday
    '2': 'day-lower',  // Wednesday
    '4': 'day-pull',   // Friday
  },
};

// Helper: get Monday of N weeks ago (0 = this week)
const mondayOfWeek = (weeksAgo: number) => {
  const d = new Date(thisMonday);
  d.setDate(d.getDate() - weeksAgo * 7);
  return d;
};
const weekDay = (weeksAgo: number, dayOffset: number) => {
  const d = mondayOfWeek(weeksAgo);
  d.setDate(d.getDate() + dayOffset);
  return fmt(d);
};

export const mockWorkoutLogs: WorkoutLog[] = [
  // This week (2/3 — Mon + Wed done, Fri not yet)
  { id: 'wl1', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Push', duration: 55, date: weekDay(0, 0), completed: true },
  { id: 'wl2', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Lower Body', duration: 50, date: weekDay(0, 2), completed: true },
  // Last week (3/3 — Mon + Wed + Fri)
  { id: 'wl3', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Push', duration: 58, date: weekDay(1, 0), completed: true },
  { id: 'wl4', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Lower Body', duration: 50, date: weekDay(1, 2), completed: true },
  { id: 'wl5', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Pull', duration: 48, date: weekDay(1, 4), completed: true },
  // 2 weeks ago (2/3 — missed Fri)
  { id: 'wl6', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Push', duration: 60, date: weekDay(2, 0), completed: true },
  { id: 'wl7', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Lower Body', duration: 52, date: weekDay(2, 2), completed: true },
  // 3 weeks ago (3/3 — Mon + Wed + Fri)
  { id: 'wl8', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Push', duration: 55, date: weekDay(3, 0), completed: true },
  { id: 'wl9', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Lower Body', duration: 48, date: weekDay(3, 2), completed: true },
  { id: 'wl10', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Pull', duration: 50, date: weekDay(3, 4), completed: true },
  // 4 weeks ago (2/3 — missed Wed)
  { id: 'wl11', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Push', duration: 57, date: weekDay(4, 0), completed: true },
  { id: 'wl12', clientId: 'mock-client-1', clientName: 'Kuba Mika', type: 'Upper Body Pull', duration: 45, date: weekDay(4, 4), completed: true },
];

export const mockSetLogs: WorkoutSetLog[] = [
  // Today's partial workout (if today is a training day)
  { id: 'sl1', date: fmt(today), exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 1, reps: 10, weight: '80kg', completed: true, rpe: 7 },
  { id: 'sl2', date: fmt(today), exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 2, reps: 9, weight: '80kg', completed: true, rpe: 8 },
  // Previous workout logs
  { id: 'sl3', date: fmt(thisMonday), exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 1, reps: 10, weight: '77.5kg', completed: true, rpe: 7 },
  { id: 'sl4', date: fmt(thisMonday), exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 2, reps: 9, weight: '77.5kg', completed: true, rpe: 8 },
  { id: 'sl5', date: fmt(thisMonday), exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 3, reps: 8, weight: '80kg', completed: true, rpe: 8 },
  { id: 'sl6', date: fmt(thisMonday), exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 4, reps: 8, weight: '80kg', completed: true, rpe: 9 },
];

const now = new Date();

export const mockCheckIns: CheckIn[] = [
  {
    id: 'ci1',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    date: fmt(daysAgo(3)),
    status: 'completed',
    weight: 88.1,
    bodyFat: 19.5,
    mood: 4,
    energy: 4,
    stress: 2,
    sleepHours: 7.5,
    steps: 9200,
    nutritionScore: 8,
    notes: 'Feeling great this week, energy levels are up.',
    wins: 'Hit a new PR on squat — 112.5kg for 6 reps!',
    challenges: 'Still struggling with meal prep on Sundays.',
    coachFeedback: 'Amazing progress on squat! Keep pushing. For meal prep — try batch cooking on Saturday evening instead, many clients find that easier.',
    photos: [],
    reviewStatus: 'reviewed',
    flagReason: '',
  },
  {
    id: 'ci2',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    date: fmt(daysAgo(10)),
    status: 'completed',
    weight: 88.7,
    bodyFat: 19.8,
    mood: 3,
    energy: 3,
    stress: 3,
    sleepHours: 6.5,
    steps: 7800,
    nutritionScore: 6,
    notes: 'Bit tired this week, sleep has been off.',
    wins: 'Stayed consistent with all 3 training days.',
    challenges: 'Sleep quality, too much screen time before bed.',
    coachFeedback: 'Consistency is key and you nailed it. Try setting a phone curfew 1h before bed — it makes a huge difference for sleep quality.',
    photos: [],
    reviewStatus: 'reviewed',
    flagReason: '',
  },
  {
    id: 'ci3',
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
    text: 'Hey Kuba! Saw your check-in — really solid week. Your squat numbers are going up fast. Keep the intensity on upper days and we should see bench follow.',
    timestamp: new Date(now.getTime() - 4 * 3600000).toISOString(), // 4h ago
    isRead: false,
    isFromCoach: true,
    channel: 'whatsapp',
  },
  {
    id: 'msg2',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Thanks coach! Should I increase bench weight next session or keep it at 80kg for another week?',
    timestamp: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
    isRead: true,
    isFromCoach: false,
    channel: 'whatsapp',
  },
  {
    id: 'msg3',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Stay at 80kg but aim for 4x10 this time. Once you hit that cleanly, we bump to 82.5kg. No rush — progressive overload is a marathon not a sprint.',
    timestamp: new Date(now.getTime() - 3 * 3600000).toISOString(),
    isRead: false,
    isFromCoach: true,
    channel: 'whatsapp',
  },
  {
    id: 'msg4',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Also, I updated your program — added face pulls on pull day. Your shoulders will thank you later.',
    timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
    isRead: false,
    isFromCoach: true,
    channel: 'whatsapp',
  },
  {
    id: 'msg5',
    clientId: 'mock-client-1',
    clientName: 'Kuba Mika',
    clientAvatar: '',
    text: 'Got it, makes sense. Will aim for 4x10 at 80. And thanks for the face pulls — my rear delts definitely need the work!',
    timestamp: new Date(now.getTime() - 1.5 * 3600000).toISOString(),
    isRead: true,
    isFromCoach: false,
    channel: 'whatsapp',
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
    channel: 'whatsapp',
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
    text: 'Quick question — is it okay to do cardio on rest days? Thinking of adding 20min walks.',
    timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(), // 2 days ago
    isRead: true,
    isFromCoach: false,
    channel: 'whatsapp',
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
    channel: 'whatsapp',
  },
];
