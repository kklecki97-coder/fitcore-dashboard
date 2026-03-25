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
  name: 'Alex Rivera',
  avatar: '',
  email: 'alex@example.com',
  plan: 'Premium',
  status: 'active',
  startDate: '2026-01-06',
  nextCheckIn: fmt(daysFromNow(3)),
  monthlyRate: 199,
  progress: 45,
  metrics: {
    weight: [88, 87.5, 87, 86.5, 86, 85.5, 85, 84.5, 84, 84, 83.5],
    bodyFat: [20, 19.8, 19.5, 19.2, 19, 18.7, 18.5, 18.2, 18, 17.8, 17.5],
    benchPress: [50, 52.5, 55, 57.5, 60, 62.5, 65, 67.5, 70, 72.5, 75],
    squat: [60, 65, 70, 72.5, 75, 77.5, 80, 82.5, 85, 87.5, 90],
    deadlift: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
    waist: [88, 87, 86.5, 86, 85.5, 85, 84.5, 84, 83.5, 83, 82],
    hips: [98, 97.5, 97, 97, 96.5, 96.5, 96, 96, 96, 96, 96],
    chest: [102, 102, 101.5, 101, 101, 100.5, 100.5, 100, 100, 100, 100],
    bicep: [33, 33.5, 34, 34, 34.5, 35, 35, 35.5, 35.5, 36, 36.5],
    thigh: [58, 58, 58.5, 59, 59, 59.5, 59.5, 60, 60, 60, 59.5],
  },
  height: 182,
  goals: ['Build Upper Body Strength', 'Get Stronger for BJJ', 'Lose Fat'],
  goalTargets: {
    targetWeight: 80,
    targetBodyFat: 14,
    targetBenchPress: 100,
    targetSquat: 120,
    targetDeadlift: 180,
  },
  notes: '',
  lastActive: fmt(today),
  streak: 12,
  onboarded: true,
};

export const mockCoachName = 'Coach Mike';

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
  createdAt: '2026-01-06',
  updatedAt: '2026-01-06',
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

export const mockWorkoutLogs: WorkoutLog[] = [
  { id: 'wl1', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'Full Body (Gym)', duration: 52, date: '2026-03-21', completed: true },
  { id: 'wl2', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'BJJ + Box', duration: 90, date: '2026-03-19', completed: true },
  { id: 'wl3', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'BJJ + Box', duration: 90, date: '2026-03-17', completed: true },
  { id: 'wl4', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'Full Body (Gym)', duration: 48, date: '2026-03-14', completed: true },
  { id: 'wl5', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'BJJ + Box', duration: 90, date: '2026-03-12', completed: true },
  { id: 'wl6', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'BJJ + Box', duration: 90, date: '2026-03-10', completed: true },
  { id: 'wl7', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'Full Body (Gym)', duration: 55, date: '2026-03-07', completed: true },
  { id: 'wl8', clientId: 'mock-client-1', clientName: 'Alex Rivera', type: 'BJJ + Box', duration: 90, date: '2026-03-05', completed: true },
];

export const mockSetLogs: WorkoutSetLog[] = [
  { id: 'sl1', date: '2026-03-21', exerciseId: 'ex1', exerciseName: 'DB Bench Press', setNumber: 1, reps: 10, weight: '20kg', completed: true, rpe: 7 },
  { id: 'sl2', date: '2026-03-21', exerciseId: 'ex1', exerciseName: 'DB Bench Press', setNumber: 2, reps: 10, weight: '20kg', completed: true, rpe: 8 },
  { id: 'sl3', date: '2026-03-21', exerciseId: 'ex1', exerciseName: 'DB Bench Press', setNumber: 3, reps: 8, weight: '22kg', completed: true, rpe: 9 },
  { id: 'sl4', date: '2026-03-21', exerciseId: 'ex2', exerciseName: 'Cable Row', setNumber: 1, reps: 10, weight: '40kg', completed: true, rpe: 7 },
  { id: 'sl5', date: '2026-03-21', exerciseId: 'ex2', exerciseName: 'Cable Row', setNumber: 2, reps: 10, weight: '42.5kg', completed: true, rpe: 8 },
  { id: 'sl6', date: '2026-03-21', exerciseId: 'ex3', exerciseName: 'DB Shoulder Press', setNumber: 1, reps: 10, weight: '14kg', completed: true, rpe: 7 },
  { id: 'sl7', date: '2026-03-21', exerciseId: 'ex4', exerciseName: 'Lat Pulldown', setNumber: 1, reps: 10, weight: '45kg', completed: true, rpe: 7 },
];

const now = new Date();

export const mockCheckIns: CheckIn[] = [
  {
    id: 'ci-next', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: fmt(daysFromNow(4)), status: 'scheduled',
    weight: null, bodyFat: null, waist: null, hips: null, chest: null, bicep: null, thigh: null,
    mood: null, energy: null, stress: null, sleepHours: null, steps: null, nutritionScore: null,
    notes: '', wins: '', challenges: '', coachFeedback: '',
    photos: [], reviewStatus: 'pending', flagReason: '',
  },
  {
    id: 'ci-11', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: '2026-03-21', status: 'completed',
    weight: 83.5, bodyFat: 17.5, waist: 82, hips: 96, chest: 100, bicep: 36.5, thigh: 59.5,
    mood: 5 as 1|2|3|4|5, energy: 8, stress: 3, sleepHours: 7.5, steps: 9200, nutritionScore: 9,
    notes: 'Feeling great this week, energy is high.',
    wins: 'Hit 75kg bench press PR! New personal best.',
    challenges: 'Slight shoulder tightness after BJJ on Wednesday.',
    coachFeedback: 'Incredible progress on bench! Keep the momentum. Add extra shoulder mobility on rest days.',
    photos: [], reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-10', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: '2026-03-14', status: 'completed',
    weight: 84, bodyFat: 17.8, waist: 83, hips: 96, chest: 100, bicep: 36, thigh: 60,
    mood: 4 as 1|2|3|4|5, energy: 7, stress: 4, sleepHours: 7, steps: 8500, nutritionScore: 8,
    notes: 'Good week overall, stuck to the plan.',
    wins: 'Completed all 3 sessions this week.',
    challenges: 'Work was stressful, harder to hit protein targets.',
    coachFeedback: 'Solid consistency. Don\'t stress about perfect macros on busy days - hitting 80% is fine.',
    photos: [], reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-9', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: '2026-03-07', status: 'completed',
    weight: 84.5, bodyFat: 18, waist: 83.5, hips: 96, chest: 100, bicep: 35.5, thigh: 60,
    mood: 4 as 1|2|3|4|5, energy: 7, stress: 5, sleepHours: 6.5, steps: 7800, nutritionScore: 7,
    notes: 'Decent week but sleep was rough.',
    wins: 'Deadlift felt easy at 120kg.',
    challenges: 'Only slept 6h two nights this week.',
    coachFeedback: 'Sleep is the #1 recovery tool. Try no screens 1h before bed.',
    photos: [], reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-8', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: '2026-02-28', status: 'completed',
    weight: 85, bodyFat: 18.2, waist: 84, hips: 96, chest: 100.5, bicep: 35.5, thigh: 60,
    mood: 4 as 1|2|3|4|5, energy: 8, stress: 3, sleepHours: 8, steps: 10200, nutritionScore: 8,
    notes: 'Best week so far, everything clicked.',
    wins: 'Hit 10k steps every day! BJJ sparring went amazing.',
    challenges: 'None really, great week.',
    coachFeedback: 'This is what consistency looks like. Keep it up!',
    photos: [], reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-7', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: '2026-02-21', status: 'completed',
    weight: 85.5, bodyFat: 18.5, waist: 84.5, hips: 96.5, chest: 100.5, bicep: 35, thigh: 59.5,
    mood: 3 as 1|2|3|4|5, energy: 6, stress: 6, sleepHours: 6.5, steps: 6500, nutritionScore: 6,
    notes: 'Tough week, was sick for 2 days.',
    wins: 'Still made it to BJJ twice despite feeling off.',
    challenges: 'Had a cold, missed one gym session.',
    coachFeedback: 'Rest when sick - no shame in that. You still showed up which shows character.',
    photos: [], reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-6', clientId: 'mock-client-1', clientName: 'Alex Rivera',
    date: '2026-02-14', status: 'completed',
    weight: 86, bodyFat: 18.7, waist: 85, hips: 96.5, chest: 101, bicep: 35, thigh: 59.5,
    mood: 4 as 1|2|3|4|5, energy: 7, stress: 4, sleepHours: 7.5, steps: 8800, nutritionScore: 8,
    notes: 'Solid week, feeling stronger.',
    wins: 'Bench press 65kg for 4x8 clean reps.',
    challenges: 'Valentine dinner threw off diet a bit.',
    coachFeedback: 'One dinner won\'t derail progress. Enjoy life! Bench is moving nicely.',
    photos: [], reviewStatus: 'reviewed', flagReason: '',
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg1', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Hey Alex! Welcome to FitCore. I\'ve set up your program - Full Body on Fridays, plus your BJJ+Box on Mon/Wed. Let\'s build some serious upper body strength.',
    timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
    isRead: false, isFromCoach: true,
  },
  {
    id: 'msg2', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Thanks coach! Excited to start. The gym day looks good - no legs right? BJJ already kills my legs haha',
    timestamp: new Date(now.getTime() - 1.5 * 3600000).toISOString(),
    isRead: true, isFromCoach: false,
  },
  {
    id: 'msg3', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Exactly - no legs on gym day. BJJ + Box gives you plenty of lower body and conditioning. Friday is all upper body push/pull + arms. Focus on getting stronger there and it\'ll carry over to your grappling.',
    timestamp: new Date(now.getTime() - 1 * 3600000).toISOString(),
    isRead: false, isFromCoach: true,
  },
  {
    id: 'msg4', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Also, I updated your program - added face pulls on pull day. Your shoulders will thank you later.',
    timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
    isRead: false, isFromCoach: true,
  },
  {
    id: 'msg5', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Got it, makes sense. Will aim for 4x10 at 80. And thanks for the face pulls - my rear delts definitely need the work!',
    timestamp: new Date(now.getTime() - 1.5 * 3600000).toISOString(),
    isRead: true, isFromCoach: false,
  },
  {
    id: 'msg-workout-1', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: '',
    timestamp: new Date(now.getTime() - 0.5 * 3600000).toISOString(),
    isRead: false, isFromCoach: false,
    type: 'workout-complete',
    workoutSummary: { dayName: 'Upper Body Pull', duration: '48:32', exercises: 5, sets: '15/15', volume: '4,280' },
  },
  {
    id: 'msg6', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Quick question - is it okay to do cardio on rest days? Thinking of adding 20min walks.',
    timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(),
    isRead: true, isFromCoach: false,
  },
  {
    id: 'msg7', clientId: 'mock-client-1', clientName: 'Alex Rivera', clientAvatar: '',
    text: 'Absolutely! Walking is perfect for rest days. Low impact, helps recovery, and keeps your step count up. Aim for 8-10k steps on those days.',
    timestamp: new Date(now.getTime() - 47 * 3600000).toISOString(),
    isRead: true, isFromCoach: true,
  },
];
