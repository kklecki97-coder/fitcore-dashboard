import type { Client, Message, WorkoutLog, WorkoutProgram, CheckIn, WorkoutSetLog } from './types';

// ── Mock client: Marcus Chen (c1) ──
export const clientUser: Client = {
  id: 'c1',
  name: 'Marcus Chen',
  avatar: '',
  email: 'marcus@email.com',
  plan: 'Premium',
  status: 'active',
  startDate: '2025-09-15',
  nextCheckIn: '2026-02-24',
  monthlyRate: 199,
  progress: 72,
  metrics: {
    weight: [88.5, 87.2, 86.8, 85.5, 84.9, 84.2, 83.8],
    bodyFat: [22, 21.5, 20.8, 20.1, 19.5, 19.0, 18.6],
    benchPress: [80, 82.5, 85, 87.5, 90, 90, 92.5],
    squat: [100, 105, 110, 115, 117.5, 120, 122.5],
    deadlift: [120, 125, 130, 135, 140, 142.5, 145],
  },
  goals: ['Drop to 80kg by April', 'Bench press 100kg', 'Improve sleep to 7+ hours', 'Run a 5K under 25 min'],
  notes: '',
  lastActive: '2 hours ago',
  streak: 12,
};

export const coachName = 'Coach Kamil';

// ── Assigned program: Hypertrophy Block A ──
export const myProgram: WorkoutProgram = {
  id: 'wp1',
  name: 'Hypertrophy Block A',
  status: 'active',
  durationWeeks: 6,
  clientIds: ['c1'],
  isTemplate: false,
  createdAt: '2026-01-20',
  updatedAt: '2026-02-10',
  days: [
    {
      id: 'wd1',
      name: 'Upper Body A',
      exercises: [
        { id: 'e1', name: 'Bench Press', sets: 4, reps: '8-10', weight: '80kg', rpe: 8, tempo: '3-1-2-0', restSeconds: 120, notes: 'Pause at bottom' },
        { id: 'e2', name: 'Barbell Row', sets: 4, reps: '8-10', weight: '70kg', rpe: 7, tempo: '2-1-2-0', restSeconds: 90, notes: '' },
        { id: 'e3', name: 'Overhead Press', sets: 3, reps: '10-12', weight: '45kg', rpe: 7, tempo: '2-0-2-0', restSeconds: 90, notes: '' },
        { id: 'e4', name: 'Lat Pulldown', sets: 3, reps: '10-12', weight: '60kg', rpe: 7, tempo: '2-1-2-0', restSeconds: 60, notes: '' },
        { id: 'e5', name: 'Dumbbell Curl', sets: 3, reps: '12-15', weight: '14kg', rpe: 8, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
        { id: 'e6', name: 'Tricep Pushdown', sets: 3, reps: '12-15', weight: '25kg', rpe: 7, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
      ],
    },
    {
      id: 'wd2',
      name: 'Lower Body A',
      exercises: [
        { id: 'e7', name: 'Back Squat', sets: 4, reps: '6-8', weight: '110kg', rpe: 8, tempo: '3-1-2-0', restSeconds: 180, notes: 'Belt on working sets' },
        { id: 'e8', name: 'Romanian Deadlift', sets: 3, reps: '10-12', weight: '90kg', rpe: 7, tempo: '3-0-2-0', restSeconds: 90, notes: '' },
        { id: 'e9', name: 'Leg Press', sets: 3, reps: '12-15', weight: '180kg', rpe: 8, tempo: '2-0-2-0', restSeconds: 90, notes: '' },
        { id: 'e10', name: 'Walking Lunges', sets: 3, reps: '12/leg', weight: '20kg DBs', rpe: 7, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
        { id: 'e11', name: 'Leg Curl', sets: 3, reps: '12-15', weight: '45kg', rpe: 7, tempo: '2-1-2-0', restSeconds: 60, notes: '' },
        { id: 'e12', name: 'Calf Raise', sets: 4, reps: '15-20', weight: '80kg', rpe: 8, tempo: '2-2-2-0', restSeconds: 45, notes: '' },
      ],
    },
    {
      id: 'wd3',
      name: 'Upper Body B',
      exercises: [
        { id: 'e13', name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', weight: '32kg', rpe: 8, tempo: '3-0-2-0', restSeconds: 90, notes: '' },
        { id: 'e14', name: 'Cable Row', sets: 4, reps: '10-12', weight: '65kg', rpe: 7, tempo: '2-1-2-0', restSeconds: 90, notes: 'Squeeze at contraction' },
        { id: 'e15', name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', weight: '10kg', rpe: 8, tempo: '2-1-2-0', restSeconds: 60, notes: '' },
        { id: 'e16', name: 'Face Pull', sets: 3, reps: '15-20', weight: '20kg', rpe: 7, tempo: '2-1-2-0', restSeconds: 60, notes: '' },
        { id: 'e17', name: 'Hammer Curl', sets: 3, reps: '10-12', weight: '16kg', rpe: 7, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
        { id: 'e18', name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', weight: '20kg', rpe: 7, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
      ],
    },
    {
      id: 'wd4',
      name: 'Lower Body B',
      exercises: [
        { id: 'e19', name: 'Deadlift', sets: 4, reps: '5-6', weight: '140kg', rpe: 8, tempo: '2-1-2-0', restSeconds: 180, notes: 'Mixed grip on top sets' },
        { id: 'e20', name: 'Front Squat', sets: 3, reps: '8-10', weight: '80kg', rpe: 7, tempo: '3-1-2-0', restSeconds: 120, notes: '' },
        { id: 'e21', name: 'Hip Thrust', sets: 3, reps: '10-12', weight: '100kg', rpe: 8, tempo: '2-2-2-0', restSeconds: 90, notes: '' },
        { id: 'e22', name: 'Bulgarian Split Squat', sets: 3, reps: '10/leg', weight: '16kg DBs', rpe: 8, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
        { id: 'e23', name: 'Leg Extension', sets: 3, reps: '12-15', weight: '50kg', rpe: 7, tempo: '2-1-2-0', restSeconds: 60, notes: '' },
        { id: 'e24', name: 'Hanging Leg Raise', sets: 3, reps: '12-15', weight: 'BW', rpe: null, tempo: '2-0-2-0', restSeconds: 60, notes: '' },
      ],
    },
  ],
};

// ── Check-ins ──
export const myCheckIns: CheckIn[] = [
  {
    id: 'ci-m1', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-17', status: 'completed',
    weight: 83.8, bodyFat: 18.6, mood: 4, energy: 7, stress: 4, sleepHours: 7.5,
    adherence: 92, nutritionScore: 8,
    notes: 'Feeling strong this week. Sleep has been improving a lot.',
    wins: 'Hit a new bench PR at 92.5kg. Stuck to meal plan 6 out of 7 days.',
    challenges: 'One late night on Wednesday threw off Thursday morning session.',
    coachFeedback: 'Great work on the bench PR! The consistency with nutrition is paying off. Let\'s keep the sleep momentum going — try to stay off screens after 10 PM.',
    reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-m2', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-10', status: 'completed',
    weight: 84.2, bodyFat: 19.0, mood: 4, energy: 6, stress: 5, sleepHours: 6.5,
    adherence: 88, nutritionScore: 7,
    notes: 'Decent week overall. Work stress was higher than usual.',
    wins: 'Didn\'t miss any sessions despite busy schedule. Squat felt smooth at 120kg.',
    challenges: 'Stress eating on two evenings. Need better late-night snack strategy.',
    coachFeedback: 'Solid discipline getting all sessions in. For the stress eating, let\'s try prepping some high-protein snacks to have ready. Also, try a 10-min walk after dinner.',
    reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-m3', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-03', status: 'completed',
    weight: 84.9, bodyFat: 19.5, mood: 3, energy: 5, stress: 6, sleepHours: 6,
    adherence: 80, nutritionScore: 6,
    notes: 'Rough week. Felt tired and motivation was low.',
    wins: 'Still showed up for 4 out of 5 sessions.',
    challenges: 'Sleep was bad — averaging under 6.5 hours. Energy in the gym was low.',
    coachFeedback: 'Everyone has weeks like this. The fact that you still showed up is what matters. Let\'s focus on sleep this week — aim for 7+ hours. Cut caffeine after 2 PM.',
    reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-m4', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-01-27', status: 'completed',
    weight: 85.5, bodyFat: 20.1, mood: 4, energy: 7, stress: 4, sleepHours: 7,
    adherence: 90, nutritionScore: 7,
    notes: 'Good week. Feeling the program clicking.',
    wins: 'Deadlift 140kg for 5 reps felt solid. Weight trending down nicely.',
    challenges: 'Weekends are harder to stay on track with nutrition.',
    coachFeedback: 'Love the deadlift progress. For weekends, try meal prepping Saturday morning — it removes the decision fatigue.',
    reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-m5', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-01-20', status: 'completed',
    weight: 86.8, bodyFat: 20.8, mood: 3, energy: 6, stress: 5, sleepHours: 6.5,
    adherence: 82, nutritionScore: 6,
    notes: 'First week back after holiday break. Body felt stiff.',
    wins: 'Got back to routine without missing a beat. Bench at 85kg x 10.',
    challenges: 'Lost some strength over the break. Took extra warm-up time.',
    coachFeedback: 'Coming back strong after a break is the hardest part — you nailed it. The strength will come back fast, don\'t worry. We\'re starting the new block now.',
    reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-m6', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-01-13', status: 'completed',
    weight: 87.2, bodyFat: 21.5, mood: 3, energy: 5, stress: 4, sleepHours: 6,
    adherence: 70, nutritionScore: 5,
    notes: 'Holiday aftermath. Getting back on track.',
    wins: 'Showed up Monday and didn\'t skip.',
    challenges: 'Weight went up over holidays. Feeling sluggish.',
    coachFeedback: 'Don\'t stress about the holiday weight — most of it is water. You\'re back, that\'s what counts. Let\'s ease into the first week.',
    reviewStatus: 'reviewed', flagReason: '',
  },
  {
    id: 'ci-m7', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-24', status: 'scheduled',
    weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null,
    adherence: null, nutritionScore: null,
    notes: '', wins: '', challenges: '', coachFeedback: '',
    reviewStatus: 'pending', flagReason: '',
  },
];

// ── Messages ──
export const myMessages: Message[] = [
  { id: 'msg1', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Hey Coach, just hit 92.5kg on bench today! 🔥', timestamp: '2026-02-21T14:30:00', isRead: true, isFromCoach: false, channel: 'whatsapp' },
  { id: 'msg2', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'That\'s incredible Marcus! You\'re ahead of schedule on that goal. How did it feel? RPE?', timestamp: '2026-02-21T14:45:00', isRead: true, isFromCoach: true, channel: 'whatsapp' },
  { id: 'msg3', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Felt like RPE 8.5, maybe could have had one more rep. Form was clean.', timestamp: '2026-02-21T14:52:00', isRead: true, isFromCoach: false, channel: 'whatsapp' },
  { id: 'msg4', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Perfect. We\'ll push for 95kg next week. Keep the momentum going 💪', timestamp: '2026-02-21T15:00:00', isRead: true, isFromCoach: true, channel: 'whatsapp' },
  { id: 'msg5', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Quick question — should I add an extra set on lat pulldowns? Feels too easy at 60kg.', timestamp: '2026-02-20T09:15:00', isRead: true, isFromCoach: false, channel: 'whatsapp' },
  { id: 'msg6', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Good instinct. Bump the weight to 65kg first and see if 3 sets still feels easy. If so, we\'ll add a 4th set next week.', timestamp: '2026-02-20T10:30:00', isRead: true, isFromCoach: true, channel: 'whatsapp' },
  { id: 'msg7', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Got it, will try 65kg tomorrow. Thanks!', timestamp: '2026-02-20T10:35:00', isRead: true, isFromCoach: false, channel: 'whatsapp' },
  { id: 'msg8', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Hey Marcus, don\'t forget your check-in is due Monday. How are you feeling this week?', timestamp: '2026-02-19T18:00:00', isRead: true, isFromCoach: true, channel: 'whatsapp' },
  { id: 'msg9', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Feeling good! Sleep has been much better since I cut the late-night screen time. Will submit check-in Sunday evening.', timestamp: '2026-02-19T19:22:00', isRead: true, isFromCoach: false, channel: 'whatsapp' },
  { id: 'msg10', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'That\'s great to hear. The sleep changes are the game changer honestly. Talk Sunday 🙌', timestamp: '2026-02-19T19:30:00', isRead: true, isFromCoach: true, channel: 'whatsapp' },
  { id: 'msg11', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Coach, I\'m feeling a bit of shoulder discomfort on overhead press. Nothing sharp, just tightness.', timestamp: '2026-02-17T16:45:00', isRead: true, isFromCoach: false, channel: 'whatsapp' },
  { id: 'msg12', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '', text: 'Thanks for flagging that. Let\'s swap OHP for landmine press this week and see if it feels better. Do some extra band pull-aparts in your warm-up too.', timestamp: '2026-02-17T17:15:00', isRead: true, isFromCoach: true, channel: 'whatsapp' },
];

// ── Workout logs ──
export const myWorkoutLogs: WorkoutLog[] = [
  { id: 'wl1', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 65, date: '2026-02-21', completed: true },
  { id: 'wl2', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 70, date: '2026-02-20', completed: true },
  { id: 'wl3', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 60, date: '2026-02-19', completed: true },
  { id: 'wl4', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 75, date: '2026-02-18', completed: true },
  { id: 'wl5', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 62, date: '2026-02-17', completed: true },
  { id: 'wl6', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 68, date: '2026-02-14', completed: true },
  { id: 'wl7', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 58, date: '2026-02-13', completed: true },
  { id: 'wl8', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 72, date: '2026-02-12', completed: true },
  { id: 'wl9', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 60, date: '2026-02-11', completed: true },
  { id: 'wl10', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 65, date: '2026-02-10', completed: false },
  { id: 'wl11', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 55, date: '2026-02-07', completed: true },
  { id: 'wl12', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 70, date: '2026-02-06', completed: true },
  { id: 'wl13', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 63, date: '2026-02-05', completed: true },
  { id: 'wl14', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 68, date: '2026-02-04', completed: true },
  { id: 'wl15', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 60, date: '2026-02-03', completed: true },
  { id: 'wl16', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 72, date: '2026-01-31', completed: true },
  { id: 'wl17', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 58, date: '2026-01-30', completed: true },
  { id: 'wl18', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 65, date: '2026-01-29', completed: false },
  { id: 'wl19', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 55, date: '2026-01-28', completed: true },
  { id: 'wl20', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 70, date: '2026-01-27', completed: true },
];

// ── Set logs for today's workout (Upper Body A) ──
export const initialSetLogs: WorkoutSetLog[] = [];
