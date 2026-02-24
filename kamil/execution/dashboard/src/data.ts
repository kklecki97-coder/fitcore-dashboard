import type { Client, Message, RevenueData, WorkoutLog, WorkoutProgram, Invoice, CheckIn } from './types';

const avatarColors = [
  '#00e5c8', '#6366f1', '#f59e0b', '#ef4444', '#22c55e',
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
];

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function getAvatarColor(id: string): string {
  const idx = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarColors[idx % avatarColors.length];
}

export const clients: Client[] = [
  {
    id: 'c1',
    name: 'Marcus Chen',
    avatar: '',
    email: 'marcus@example.com',
    plan: 'Elite',
    status: 'active',
    startDate: '2025-08-15',
    nextCheckIn: '2026-02-22',
    monthlyRate: 299,
    progress: 82,
    metrics: {
      weight: [95, 93, 91, 89.5, 88, 87, 86],
      bodyFat: [22, 21, 20, 19, 18.5, 17.8, 17],
      benchPress: [80, 85, 87.5, 90, 92.5, 95, 100],
      squat: [100, 110, 115, 120, 125, 130, 140],
      deadlift: [120, 130, 135, 140, 145, 150, 160],
    },
    goals: ['Lose 10kg', 'Bench 120kg', 'Run 5K under 25min'],
    notes: 'Responding well to progressive overload. Increase volume next phase.',
    notesHistory: [
      { text: 'Responding well to progressive overload. Increase volume next phase.', date: '2026-02-18', isKey: true },
      { text: 'Bench stalling at 95kg — switch to 5x3 heavy singles next week.', date: '2026-02-04' },
      { text: 'Great first month. Cardio needs work — add 2x LISS sessions.', date: '2026-01-20' },
    ],
    activityLog: [
      { type: 'check-in', description: 'Check-in reviewed — adherence 90%', date: '2026-02-15T14:00:00' },
      { type: 'message', description: 'Message sent about bench PR', date: '2026-02-13T10:30:00' },
      { type: 'notes', description: 'Notes updated — progressive overload response', date: '2026-02-18T09:00:00' },
      { type: 'program', description: 'Program "Hypertrophy Block A" assigned', date: '2026-01-15T11:00:00' },
      { type: 'plan', description: 'Plan changed: Premium → Elite', date: '2025-10-01T08:00:00' },
    ],
    lastActive: '2 hours ago',
    streak: 14,
  },
  {
    id: 'c2',
    name: 'Sarah Williams',
    avatar: '',
    email: 'sarah@example.com',
    plan: 'Premium',
    status: 'active',
    startDate: '2025-10-01',
    nextCheckIn: '2026-02-23',
    monthlyRate: 199,
    progress: 68,
    metrics: {
      weight: [70, 69, 68.5, 68, 67.5, 67, 66.5],
      bodyFat: [28, 27, 26.5, 26, 25, 24.5, 24],
      benchPress: [30, 32.5, 35, 37.5, 40, 40, 42.5],
      squat: [50, 55, 60, 65, 67.5, 70, 75],
      deadlift: [60, 65, 70, 75, 80, 82.5, 85],
    },
    goals: ['Tone up', 'First pull-up', 'Improve mobility'],
    notes: 'Knee issue — avoid deep squats. Focus on hip hinge patterns.',
    notesHistory: [
      { text: 'Knee issue — avoid deep squats. Focus on hip hinge patterns.', date: '2026-02-10', isKey: true },
      { text: 'Good progress on upper body. Increase pulling volume.', date: '2026-01-25' },
    ],
    activityLog: [
      { type: 'check-in', description: 'Check-in reviewed — knee improving', date: '2026-02-16T15:00:00' },
      { type: 'message', description: 'Message sent about modified squats', date: '2026-02-20T09:30:00' },
      { type: 'notes', description: 'Notes updated — knee protocol', date: '2026-02-10T10:00:00' },
    ],
    lastActive: '5 hours ago',
    streak: 8,
  },
  {
    id: 'c3',
    name: 'Jake Morrison',
    avatar: '',
    email: 'jake@example.com',
    plan: 'Elite',
    status: 'active',
    startDate: '2025-06-10',
    nextCheckIn: '2026-02-21',
    monthlyRate: 299,
    progress: 91,
    metrics: {
      weight: [82, 83, 83.5, 84, 84, 84.5, 85],
      bodyFat: [15, 14.5, 14, 13.5, 13, 12.5, 12],
      benchPress: [100, 105, 107.5, 110, 115, 117.5, 120],
      squat: [140, 145, 150, 155, 157.5, 160, 165],
      deadlift: [170, 175, 180, 185, 190, 195, 200],
    },
    goals: ['Compete in powerlifting', 'Total 500kg', 'Sub-10% BF'],
    notes: 'Competition prep phase. Peak week starts March 1.',
    notesHistory: [
      { text: 'Competition prep phase. Peak week starts March 1.', date: '2026-02-20', isKey: true },
      { text: 'Volume block done. Transition to intensity phase.', date: '2026-02-01', isKey: true },
      { text: 'Squat form looking solid. Push deadlift volume.', date: '2026-01-10' },
    ],
    activityLog: [
      { type: 'check-in', description: 'Check-in submitted — perfect adherence', date: '2026-02-21T08:00:00' },
      { type: 'program', description: 'Program "Powerlifting Peak" assigned', date: '2026-02-01T09:00:00' },
      { type: 'notes', description: 'Notes updated — peak week plan', date: '2026-02-20T11:00:00' },
      { type: 'message', description: 'Discussion about deload timing', date: '2026-02-20T13:15:00' },
    ],
    lastActive: '30 min ago',
    streak: 32,
  },
  {
    id: 'c4',
    name: 'Emma Rodriguez',
    avatar: '',
    email: 'emma@example.com',
    plan: 'Basic',
    status: 'pending',
    startDate: '2026-02-10',
    nextCheckIn: '2026-02-24',
    monthlyRate: 99,
    progress: 15,
    metrics: {
      weight: [75, 74.5],
      bodyFat: [30, 29.5],
      benchPress: [20, 22.5],
      squat: [30, 35],
      deadlift: [40, 45],
    },
    goals: ['Get started', 'Build consistency', 'Feel stronger'],
    notes: 'Complete beginner. Focus on form and habit-building.',
    notesHistory: [
      { text: 'Complete beginner. Focus on form and habit-building.', date: '2026-02-10', isKey: true },
    ],
    activityLog: [
      { type: 'check-in', description: 'First check-in reviewed', date: '2026-02-17T16:00:00' },
      { type: 'message', description: 'Welcome message sent', date: '2026-02-10T10:00:00' },
    ],
    lastActive: '1 day ago',
    streak: 3,
  },
  {
    id: 'c5',
    name: 'David Park',
    avatar: '',
    email: 'david@example.com',
    plan: 'Premium',
    status: 'active',
    startDate: '2025-09-20',
    nextCheckIn: '2026-02-25',
    monthlyRate: 199,
    progress: 73,
    metrics: {
      weight: [88, 87, 86, 85, 84.5, 84, 83],
      bodyFat: [20, 19.5, 19, 18.5, 18, 17.5, 17],
      benchPress: [70, 75, 77.5, 80, 82.5, 85, 87.5],
      squat: [90, 95, 100, 105, 110, 112.5, 115],
      deadlift: [110, 115, 120, 125, 130, 135, 140],
    },
    goals: ['Visible abs', 'Run a half-marathon', 'Improve sleep'],
    notes: 'Shift worker — adjust training times. Nutrition tracking is key.',
    notesHistory: [
      { text: 'Shift worker — adjust training times. Nutrition tracking is key.', date: '2026-02-05', isKey: true },
      { text: 'Started well. Monitor adherence around shift changes.', date: '2026-01-15' },
    ],
    activityLog: [
      { type: 'check-in', description: 'Check-in flagged — sleep declining', date: '2026-02-18T14:00:00' },
      { type: 'message', description: 'Message about missed session', date: '2026-02-19T22:45:00' },
      { type: 'notes', description: 'Notes updated — shift schedule adjustments', date: '2026-02-05T09:00:00' },
    ],
    lastActive: '4 hours ago',
    streak: 11,
  },
  {
    id: 'c6',
    name: 'Lisa Thompson',
    avatar: '',
    email: 'lisa@example.com',
    plan: 'Elite',
    status: 'paused',
    startDate: '2025-07-01',
    nextCheckIn: '—',
    monthlyRate: 299,
    progress: 55,
    metrics: {
      weight: [63, 62.5, 62, 62, 63, 63.5],
      bodyFat: [24, 23.5, 23, 23, 23.5, 24],
      benchPress: [35, 37.5, 40, 42.5, 40, 40],
      squat: [60, 65, 70, 72.5, 70, 68],
      deadlift: [70, 75, 80, 85, 82, 80],
    },
    goals: ['Return from injury', 'Rebuild strength', 'Pain-free training'],
    notes: 'Paused — recovering from shoulder injury. Check in March 1.',
    notesHistory: [
      { text: 'Paused — recovering from shoulder injury. Check in March 1.', date: '2026-02-01', isKey: true },
      { text: 'Shoulder flared up again. Pause all pressing movements.', date: '2026-01-20' },
    ],
    activityLog: [
      { type: 'plan', description: 'Status changed to Paused', date: '2026-02-01T10:00:00' },
      { type: 'notes', description: 'Notes updated — injury pause', date: '2026-02-01T10:05:00' },
    ],
    lastActive: '2 weeks ago',
    streak: 0,
  },
  {
    id: 'c7',
    name: 'Tom Bradley',
    avatar: '',
    email: 'tom@example.com',
    plan: 'Premium',
    status: 'active',
    startDate: '2025-11-15',
    nextCheckIn: '2026-02-22',
    monthlyRate: 199,
    progress: 60,
    metrics: {
      weight: [105, 103, 101, 99, 97, 96],
      bodyFat: [28, 27, 26, 25, 24, 23.5],
      benchPress: [90, 92.5, 95, 97.5, 100, 100],
      squat: [120, 122.5, 125, 130, 132.5, 135],
      deadlift: [140, 145, 147.5, 150, 155, 157.5],
    },
    goals: ['Drop to 90kg', 'Maintain strength', 'Better cardio'],
    notes: 'Great adherence. Cardio improving steadily. Keep pushing.',
    notesHistory: [
      { text: 'Great adherence. Cardio improving steadily. Keep pushing.', date: '2026-02-15', isKey: true },
      { text: 'Weight loss on track. Increase cardio to 3x/week.', date: '2026-01-28' },
    ],
    activityLog: [
      { type: 'check-in', description: 'Check-in reviewed — sub-96kg milestone', date: '2026-02-15T11:00:00' },
      { type: 'message', description: 'Celebration message — weight milestone', date: '2026-02-19T09:30:00' },
      { type: 'notes', description: 'Notes updated — cardio progress', date: '2026-02-15T11:30:00' },
    ],
    lastActive: '1 hour ago',
    streak: 19,
  },
  {
    id: 'c8',
    name: 'Aisha Patel',
    avatar: '',
    email: 'aisha@example.com',
    plan: 'Basic',
    status: 'active',
    startDate: '2025-12-01',
    nextCheckIn: '2026-02-26',
    monthlyRate: 99,
    progress: 40,
    metrics: {
      weight: [58, 58, 57.5, 57],
      bodyFat: [26, 25.5, 25, 24.5],
      benchPress: [20, 22.5, 25, 27.5],
      squat: [35, 40, 45, 50],
      deadlift: [45, 50, 55, 60],
    },
    goals: ['Build muscle', 'Improve posture', 'Gain confidence'],
    notes: 'Progressing well for 3 months in. Increase protein target.',
    notesHistory: [
      { text: 'Progressing well for 3 months in. Increase protein target.', date: '2026-02-19', isKey: true },
      { text: 'Good attitude. Form improving on compound lifts.', date: '2026-01-15' },
    ],
    activityLog: [
      { type: 'check-in', description: 'Check-in reviewed — posture improving', date: '2026-02-19T15:00:00' },
      { type: 'message', description: 'Program update — added glute day', date: '2026-02-19T16:30:00' },
      { type: 'notes', description: 'Notes updated — protein target', date: '2026-02-19T15:30:00' },
    ],
    lastActive: '6 hours ago',
    streak: 6,
  },
  // ── Potential clients (email leads) ──
  {
    id: 'c9',
    name: 'Ryan Kowalski',
    avatar: '',
    email: 'ryan.kowalski@gmail.com',
    plan: 'Basic',
    status: 'pending',
    startDate: '',
    nextCheckIn: '',
    monthlyRate: 0,
    progress: 0,
    metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
    goals: ['Lose 15kg', 'Run a 5K'],
    notes: 'Inbound lead from Instagram. Interested in weight loss coaching.',
    notesHistory: [
      { text: 'Inbound lead from Instagram. Interested in weight loss coaching.', date: '2026-02-20' },
    ],
    activityLog: [
      { type: 'message', description: 'Initial inquiry received', date: '2026-02-20T08:15:00' },
      { type: 'message', description: 'Discovery call offered', date: '2026-02-20T10:00:00' },
    ],
    lastActive: '1 day ago',
    streak: 0,
  },
  {
    id: 'c10',
    name: 'Natalie Souza',
    avatar: '',
    email: 'natalie.souza@outlook.com',
    plan: 'Premium',
    status: 'pending',
    startDate: '',
    nextCheckIn: '',
    monthlyRate: 0,
    progress: 0,
    metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
    goals: ['Body recomp', 'Compete in bikini'],
    notes: 'Referral from Marcus Chen. Experienced lifter looking for comp prep.',
    notesHistory: [
      { text: 'Referral from Marcus Chen. Experienced lifter looking for comp prep.', date: '2026-02-21' },
    ],
    activityLog: [
      { type: 'message', description: 'Referral inquiry from Marcus Chen', date: '2026-02-21T07:30:00' },
    ],
    lastActive: '3 hours ago',
    streak: 0,
  },
  {
    id: 'c11',
    name: 'Jordan Miles',
    avatar: '',
    email: 'jordan.miles@gmail.com',
    plan: 'Basic',
    status: 'pending',
    startDate: '',
    nextCheckIn: '',
    monthlyRate: 0,
    progress: 0,
    metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
    goals: ['Return to 85kg lean', 'Rebuild squat to 180kg', 'Athletic conditioning'],
    notes: 'Instagram DM lead. Former college athlete, 2 years out of gym.',
    notesHistory: [
      { text: 'Instagram DM lead. Former college athlete, 2 years out of gym.', date: '2026-02-21' },
    ],
    activityLog: [
      { type: 'message', description: 'Instagram DM inquiry', date: '2026-02-21T10:00:00' },
    ],
    lastActive: '2 hours ago',
    streak: 0,
  },
];

export const messages: Message[] = [
  // Marcus Chen — bench PR conversation (via Telegram)
  {
    id: 'm1a', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '',
    text: 'How did the bench session feel today? You were due for a heavy single.',
    timestamp: '2026-02-20T13:00:00', isRead: true, isFromCoach: true, channel: 'telegram', deliveryStatus: 'read',
  },
  {
    id: 'm1b', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '',
    text: 'Felt amazing honestly. Warm-ups were flying.',
    timestamp: '2026-02-20T13:45:00', isRead: true, isFromCoach: false, channel: 'telegram',
  },
  {
    id: 'm1', clientId: 'c1', clientName: 'Marcus Chen', clientAvatar: '',
    text: 'Hit a new PR on bench today! 102.5kg for 2 reps. Feeling strong.',
    timestamp: '2026-02-20T14:30:00', isRead: false, isFromCoach: false, channel: 'telegram',
  },
  // Jake Morrison — deload question (via WhatsApp)
  {
    id: 'm2a', clientId: 'c3', clientName: 'Jake Morrison', clientAvatar: '',
    text: 'Squats felt heavy yesterday, RPE was way higher than usual.',
    timestamp: '2026-02-20T12:00:00', isRead: true, isFromCoach: false, channel: 'whatsapp',
  },
  {
    id: 'm2', clientId: 'c3', clientName: 'Jake Morrison', clientAvatar: '',
    text: 'Coach, should I deload this week before peak? Feeling a bit beat up.',
    timestamp: '2026-02-20T13:15:00', isRead: false, isFromCoach: false, channel: 'whatsapp',
  },
  // Emma Rodriguez — first workout (via WhatsApp)
  {
    id: 'm3', clientId: 'c4', clientName: 'Emma Rodriguez', clientAvatar: '',
    text: "Had my first workout today — it was tough but I loved it! Thanks for the program.",
    timestamp: '2026-02-20T11:45:00', isRead: false, isFromCoach: false, channel: 'whatsapp',
  },
  // Sarah Williams — knee rehab conversation (via WhatsApp)
  {
    id: 'm4a', clientId: 'c2', clientName: 'Sarah Williams', clientAvatar: '',
    text: "How's the knee feeling with the modified squats?",
    timestamp: '2026-02-20T09:30:00', isRead: true, isFromCoach: true, channel: 'whatsapp', deliveryStatus: 'read',
  },
  {
    id: 'm4', clientId: 'c2', clientName: 'Sarah Williams', clientAvatar: '',
    text: "My knee felt great during today's session. The modified program is working!",
    timestamp: '2026-02-20T10:00:00', isRead: true, isFromCoach: false, channel: 'whatsapp',
  },
  {
    id: 'm5', clientId: 'c2', clientName: 'Sarah Williams', clientAvatar: '',
    text: "Great to hear! Let's test some deeper range next week if it stays comfortable.",
    timestamp: '2026-02-20T10:15:00', isRead: true, isFromCoach: true, channel: 'whatsapp', deliveryStatus: 'read',
  },
  {
    id: 'm5a', clientId: 'c2', clientName: 'Sarah Williams', clientAvatar: '',
    text: "Sounds good! I'm excited to push a bit further.",
    timestamp: '2026-02-20T10:20:00', isRead: true, isFromCoach: false, channel: 'whatsapp',
  },
  // David Park — missed session (via Email)
  {
    id: 'm6', clientId: 'c5', clientName: 'David Park', clientAvatar: '',
    text: 'Missed yesterday — double shift at work. Will make it up tomorrow morning.',
    timestamp: '2026-02-19T22:30:00', isRead: true, isFromCoach: false, channel: 'email',
  },
  {
    id: 'm6a', clientId: 'c5', clientName: 'David Park', clientAvatar: '',
    text: "No worries, life happens. Just don't skip two in a row — keep the momentum going.",
    timestamp: '2026-02-19T22:45:00', isRead: true, isFromCoach: true, channel: 'email', deliveryStatus: 'read',
  },
  // Tom Bradley — weight milestone (via Telegram)
  {
    id: 'm7', clientId: 'c7', clientName: 'Tom Bradley', clientAvatar: '',
    text: 'Weighed in at 95.8kg this morning! First time under 96 in years.',
    timestamp: '2026-02-19T08:00:00', isRead: true, isFromCoach: false, channel: 'telegram',
  },
  {
    id: 'm8', clientId: 'c7', clientName: 'Tom Bradley', clientAvatar: '',
    text: "Incredible progress Tom! That's 9kg down. Let's celebrate that win.",
    timestamp: '2026-02-19T09:30:00', isRead: true, isFromCoach: true, channel: 'telegram', deliveryStatus: 'read',
  },
  {
    id: 'm8a', clientId: 'c7', clientName: 'Tom Bradley', clientAvatar: '',
    text: "Thanks coach! Couldn't have done it without the accountability. What's next?",
    timestamp: '2026-02-19T09:45:00', isRead: true, isFromCoach: false, channel: 'telegram',
  },
  {
    id: 'm8b', clientId: 'c7', clientName: 'Tom Bradley', clientAvatar: '',
    text: "Next target: 93kg by end of March. We'll bump cardio slightly and keep protein high.",
    timestamp: '2026-02-19T10:00:00', isRead: true, isFromCoach: true, channel: 'telegram', deliveryStatus: 'read',
  },
  // Aisha Patel — program request (via Instagram)
  {
    id: 'm9', clientId: 'c8', clientName: 'Aisha Patel', clientAvatar: '',
    text: 'Can we add a glute day? I feel like I need more lower body focus.',
    timestamp: '2026-02-19T16:00:00', isRead: true, isFromCoach: false, channel: 'instagram',
  },
  {
    id: 'm9a', clientId: 'c8', clientName: 'Aisha Patel', clientAvatar: '',
    text: "Absolutely. I'll swap Friday's session to a glute/hamstring focus. Check your program tomorrow.",
    timestamp: '2026-02-19T16:30:00', isRead: true, isFromCoach: true, channel: 'instagram', deliveryStatus: 'read',
  },
  // Ryan Kowalski — potential client inquiry (via Email)
  {
    id: 'm10', clientId: 'c9', clientName: 'Ryan Kowalski', clientAvatar: '',
    text: "Hi Coach Kamil, I found you on Instagram and I'm really interested in your coaching. I'm 32, about 105kg and want to lose weight properly this time. I've tried diets before but nothing sticks. Do you offer online coaching? What are your rates?",
    timestamp: '2026-02-20T08:15:00', isRead: false, isFromCoach: false, channel: 'email',
  },
  {
    id: 'm10a', clientId: 'c9', clientName: 'Ryan Kowalski', clientAvatar: '',
    text: "Hey Ryan! Thanks for reaching out. I totally understand the frustration with yo-yo dieting. My approach is sustainable — we build habits, not just meal plans. I offer 3 tiers starting at $99/mo. Want to book a free 15-min discovery call this week?",
    timestamp: '2026-02-20T10:00:00', isRead: true, isFromCoach: true, channel: 'email', deliveryStatus: 'read',
  },
  {
    id: 'm10b', clientId: 'c9', clientName: 'Ryan Kowalski', clientAvatar: '',
    text: "That sounds great! I'm free Thursday afternoon or Friday morning. Also, do you provide meal plans or just training?",
    timestamp: '2026-02-20T14:20:00', isRead: false, isFromCoach: false, channel: 'email',
  },
  // Natalie Souza — referral from Marcus (via Email)
  {
    id: 'm11', clientId: 'c10', clientName: 'Natalie Souza', clientAvatar: '',
    text: "Hi! Marcus Chen referred me to you. I've been lifting for 4 years and I'm looking to do my first bikini competition later this year. I need a coach who understands periodization and peak week. Do you have experience with contest prep?",
    timestamp: '2026-02-21T07:30:00', isRead: false, isFromCoach: false, channel: 'email',
  },
  {
    id: 'm11a', clientId: 'c10', clientName: 'Natalie Souza', clientAvatar: '',
    text: "Marcus is a great client — glad he sent you my way! I've coached 3 competitors through their preps. For comp prep I'd recommend the Elite tier ($299/mo) which includes daily check-ins, posing feedback, and peak week protocol. When's your target show date?",
    timestamp: '2026-02-21T09:00:00', isRead: true, isFromCoach: true, channel: 'email', deliveryStatus: 'read',
  },
  {
    id: 'm11b', clientId: 'c10', clientName: 'Natalie Souza', clientAvatar: '',
    text: "I'm looking at a show in late September — so about 7 months out. That gives us plenty of time for a proper off-season into prep. Can we set up a video call to discuss the plan?",
    timestamp: '2026-02-21T11:45:00', isRead: false, isFromCoach: false, channel: 'email',
  },
  // Jordan Miles — Instagram DM lead
  {
    id: 'm12', clientId: 'c11', clientName: 'Jordan Miles', clientAvatar: '',
    text: "Hey! Love your transformation posts. I'm a former college athlete who's been out of the gym for 2 years and want to get back into shape. Do you take on new clients?",
    timestamp: '2026-02-21T10:00:00', isRead: false, isFromCoach: false, channel: 'instagram',
  },
  {
    id: 'm12a', clientId: 'c11', clientName: 'Jordan Miles', clientAvatar: '',
    text: "Hey Jordan! Thanks for the kind words. Absolutely — I'd love to help you get back at it. With your athletic background we can ramp up fast. DM me your goals and I'll send you a free assessment form.",
    timestamp: '2026-02-21T11:30:00', isRead: true, isFromCoach: true, channel: 'instagram', deliveryStatus: 'read',
  },
  {
    id: 'm12b', clientId: 'c11', clientName: 'Jordan Miles', clientAvatar: '',
    text: "Main goals: get back to 85kg lean, rebuild my squat (used to hit 180kg), and feel athletic again. Also interested in some conditioning work. Send me that form!",
    timestamp: '2026-02-21T13:15:00', isRead: false, isFromCoach: false, channel: 'instagram',
  },
];

export const revenueData: RevenueData[] = [
  { month: 'Sep', revenue: 1495, clients: 5 },
  { month: 'Oct', revenue: 1694, clients: 6 },
  { month: 'Nov', revenue: 1893, clients: 7 },
  { month: 'Dec', revenue: 1992, clients: 8 },
  { month: 'Jan', revenue: 1693, clients: 7 },
  { month: 'Feb', revenue: 1692, clients: 8 },
];

export const workoutLogs: WorkoutLog[] = [
  // ── Marcus Chen (c1) — 4-5x/week ──
  { id: 'w1-01', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 75, date: '2026-02-20', completed: true },
  { id: 'w1-02', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 70, date: '2026-02-18', completed: true },
  { id: 'w1-03', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 65, date: '2026-02-17', completed: true },
  { id: 'w1-04', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 70, date: '2026-02-15', completed: true },
  { id: 'w1-05', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 75, date: '2026-02-13', completed: true },
  { id: 'w1-06', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 70, date: '2026-02-11', completed: true },
  { id: 'w1-07', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 65, date: '2026-02-10', completed: true },
  { id: 'w1-08', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 72, date: '2026-02-08', completed: false },
  { id: 'w1-09', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 75, date: '2026-02-06', completed: true },
  { id: 'w1-10', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 68, date: '2026-02-04', completed: true },
  { id: 'w1-11', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 70, date: '2026-02-03', completed: true },
  { id: 'w1-12', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 65, date: '2026-02-01', completed: true },
  { id: 'w1-13', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 75, date: '2026-01-30', completed: true },
  { id: 'w1-14', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 70, date: '2026-01-28', completed: true },
  { id: 'w1-15', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 65, date: '2026-01-27', completed: true },
  { id: 'w1-16', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 70, date: '2026-01-25', completed: true },
  { id: 'w1-17', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 72, date: '2026-01-23', completed: true },
  { id: 'w1-18', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 68, date: '2026-01-21', completed: false },
  { id: 'w1-19', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 70, date: '2026-01-20', completed: true },
  { id: 'w1-20', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body B', duration: 65, date: '2026-01-18', completed: true },
  { id: 'w1-21', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body A', duration: 75, date: '2026-01-16', completed: true },
  { id: 'w1-22', clientId: 'c1', clientName: 'Marcus Chen', type: 'Lower Body A', duration: 70, date: '2026-01-14', completed: true },
  { id: 'w1-23', clientId: 'c1', clientName: 'Marcus Chen', type: 'Upper Body B', duration: 68, date: '2026-01-12', completed: true },

  // ── Sarah Williams (c2) — 3-4x/week ──
  { id: 'w2-01', clientId: 'c2', clientName: 'Sarah Williams', type: 'Lower Body', duration: 55, date: '2026-02-20', completed: true },
  { id: 'w2-02', clientId: 'c2', clientName: 'Sarah Williams', type: 'Upper Body', duration: 50, date: '2026-02-18', completed: true },
  { id: 'w2-03', clientId: 'c2', clientName: 'Sarah Williams', type: 'Full Body', duration: 55, date: '2026-02-16', completed: true },
  { id: 'w2-04', clientId: 'c2', clientName: 'Sarah Williams', type: 'Lower Body', duration: 50, date: '2026-02-13', completed: true },
  { id: 'w2-05', clientId: 'c2', clientName: 'Sarah Williams', type: 'Upper Body', duration: 48, date: '2026-02-11', completed: true },
  { id: 'w2-06', clientId: 'c2', clientName: 'Sarah Williams', type: 'Full Body', duration: 55, date: '2026-02-09', completed: false },
  { id: 'w2-07', clientId: 'c2', clientName: 'Sarah Williams', type: 'Lower Body', duration: 52, date: '2026-02-06', completed: true },
  { id: 'w2-08', clientId: 'c2', clientName: 'Sarah Williams', type: 'Upper Body', duration: 50, date: '2026-02-04', completed: true },
  { id: 'w2-09', clientId: 'c2', clientName: 'Sarah Williams', type: 'Full Body', duration: 55, date: '2026-02-02', completed: true },
  { id: 'w2-10', clientId: 'c2', clientName: 'Sarah Williams', type: 'Lower Body', duration: 50, date: '2026-01-30', completed: true },
  { id: 'w2-11', clientId: 'c2', clientName: 'Sarah Williams', type: 'Upper Body', duration: 48, date: '2026-01-28', completed: true },
  { id: 'w2-12', clientId: 'c2', clientName: 'Sarah Williams', type: 'Lower Body', duration: 50, date: '2026-01-25', completed: true },
  { id: 'w2-13', clientId: 'c2', clientName: 'Sarah Williams', type: 'Full Body', duration: 55, date: '2026-01-23', completed: false },
  { id: 'w2-14', clientId: 'c2', clientName: 'Sarah Williams', type: 'Upper Body', duration: 48, date: '2026-01-21', completed: true },
  { id: 'w2-15', clientId: 'c2', clientName: 'Sarah Williams', type: 'Lower Body', duration: 52, date: '2026-01-18', completed: true },

  // ── Jake Morrison (c3) — 5-6x/week (powerlifter) ──
  { id: 'w3-01', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 90, date: '2026-02-20', completed: true },
  { id: 'w3-02', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-02-19', completed: true },
  { id: 'w3-03', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 80, date: '2026-02-18', completed: true },
  { id: 'w3-04', clientId: 'c3', clientName: 'Jake Morrison', type: 'Accessories', duration: 60, date: '2026-02-17', completed: true },
  { id: 'w3-05', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 90, date: '2026-02-16', completed: true },
  { id: 'w3-06', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-02-14', completed: true },
  { id: 'w3-07', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 82, date: '2026-02-13', completed: true },
  { id: 'w3-08', clientId: 'c3', clientName: 'Jake Morrison', type: 'Accessories', duration: 55, date: '2026-02-12', completed: true },
  { id: 'w3-09', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 88, date: '2026-02-11', completed: true },
  { id: 'w3-10', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-02-09', completed: true },
  { id: 'w3-11', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 80, date: '2026-02-07', completed: true },
  { id: 'w3-12', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 92, date: '2026-02-06', completed: true },
  { id: 'w3-13', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-02-04', completed: true },
  { id: 'w3-14', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 78, date: '2026-02-03', completed: false },
  { id: 'w3-15', clientId: 'c3', clientName: 'Jake Morrison', type: 'Accessories', duration: 60, date: '2026-02-02', completed: true },
  { id: 'w3-16', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 90, date: '2026-01-31', completed: true },
  { id: 'w3-17', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-01-30', completed: true },
  { id: 'w3-18', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 80, date: '2026-01-28', completed: true },
  { id: 'w3-19', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 88, date: '2026-01-27', completed: true },
  { id: 'w3-20', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-01-25', completed: true },
  { id: 'w3-21', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 82, date: '2026-01-23', completed: true },
  { id: 'w3-22', clientId: 'c3', clientName: 'Jake Morrison', type: 'Accessories', duration: 58, date: '2026-01-22', completed: true },
  { id: 'w3-23', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 90, date: '2026-01-20', completed: true },
  { id: 'w3-24', clientId: 'c3', clientName: 'Jake Morrison', type: 'Bench Day', duration: 85, date: '2026-01-18', completed: true },
  { id: 'w3-25', clientId: 'c3', clientName: 'Jake Morrison', type: 'Deadlift Day', duration: 80, date: '2026-01-16', completed: true },
  { id: 'w3-26', clientId: 'c3', clientName: 'Jake Morrison', type: 'Squat Day', duration: 90, date: '2026-01-14', completed: true },

  // ── Emma Rodriguez (c4) — 3x/week (beginner) ──
  { id: 'w4-01', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body A', duration: 45, date: '2026-02-20', completed: true },
  { id: 'w4-02', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body B', duration: 40, date: '2026-02-18', completed: true },
  { id: 'w4-03', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body A', duration: 45, date: '2026-02-15', completed: true },
  { id: 'w4-04', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body B', duration: 42, date: '2026-02-13', completed: false },
  { id: 'w4-05', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body A', duration: 45, date: '2026-02-11', completed: true },
  { id: 'w4-06', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body B', duration: 40, date: '2026-02-08', completed: true },
  { id: 'w4-07', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body A', duration: 43, date: '2026-02-06', completed: true },
  { id: 'w4-08', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body B', duration: 40, date: '2026-02-04', completed: true },
  { id: 'w4-09', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body A', duration: 45, date: '2026-02-01', completed: false },
  { id: 'w4-10', clientId: 'c4', clientName: 'Emma Rodriguez', type: 'Full Body B', duration: 38, date: '2026-01-29', completed: true },

  // ── David Park (c5) — 3-4x/week ──
  { id: 'w5-01', clientId: 'c5', clientName: 'David Park', type: 'Push Day', duration: 65, date: '2026-02-20', completed: false },
  { id: 'w5-02', clientId: 'c5', clientName: 'David Park', type: 'Pull Day', duration: 60, date: '2026-02-18', completed: true },
  { id: 'w5-03', clientId: 'c5', clientName: 'David Park', type: 'Leg Day', duration: 65, date: '2026-02-16', completed: true },
  { id: 'w5-04', clientId: 'c5', clientName: 'David Park', type: 'Push Day', duration: 60, date: '2026-02-13', completed: true },
  { id: 'w5-05', clientId: 'c5', clientName: 'David Park', type: 'Pull Day', duration: 58, date: '2026-02-11', completed: true },
  { id: 'w5-06', clientId: 'c5', clientName: 'David Park', type: 'Leg Day', duration: 65, date: '2026-02-09', completed: false },
  { id: 'w5-07', clientId: 'c5', clientName: 'David Park', type: 'Push Day', duration: 62, date: '2026-02-06', completed: true },
  { id: 'w5-08', clientId: 'c5', clientName: 'David Park', type: 'Pull Day', duration: 60, date: '2026-02-04', completed: true },
  { id: 'w5-09', clientId: 'c5', clientName: 'David Park', type: 'Leg Day', duration: 65, date: '2026-02-02', completed: true },
  { id: 'w5-10', clientId: 'c5', clientName: 'David Park', type: 'Push Day', duration: 60, date: '2026-01-30', completed: true },
  { id: 'w5-11', clientId: 'c5', clientName: 'David Park', type: 'Pull Day', duration: 58, date: '2026-01-28', completed: true },
  { id: 'w5-12', clientId: 'c5', clientName: 'David Park', type: 'Leg Day', duration: 65, date: '2026-01-25', completed: true },
  { id: 'w5-13', clientId: 'c5', clientName: 'David Park', type: 'Push Day', duration: 60, date: '2026-01-23', completed: true },

  // ── Lisa Thompson (c6) — paused, few early entries ──
  { id: 'w6-01', clientId: 'c6', clientName: 'Lisa Thompson', type: 'Upper Body', duration: 50, date: '2026-01-20', completed: true },
  { id: 'w6-02', clientId: 'c6', clientName: 'Lisa Thompson', type: 'Lower Body', duration: 48, date: '2026-01-18', completed: true },
  { id: 'w6-03', clientId: 'c6', clientName: 'Lisa Thompson', type: 'Upper Body', duration: 50, date: '2026-01-15', completed: false },
  { id: 'w6-04', clientId: 'c6', clientName: 'Lisa Thompson', type: 'Lower Body', duration: 45, date: '2026-01-13', completed: true },

  // ── Tom Bradley (c7) — 4x/week ──
  { id: 'w7-01', clientId: 'c7', clientName: 'Tom Bradley', type: 'Full Body', duration: 60, date: '2026-02-20', completed: true },
  { id: 'w7-02', clientId: 'c7', clientName: 'Tom Bradley', type: 'Upper Body', duration: 55, date: '2026-02-18', completed: true },
  { id: 'w7-03', clientId: 'c7', clientName: 'Tom Bradley', type: 'Lower Body', duration: 60, date: '2026-02-16', completed: true },
  { id: 'w7-04', clientId: 'c7', clientName: 'Tom Bradley', type: 'Cardio', duration: 40, date: '2026-02-15', completed: true },
  { id: 'w7-05', clientId: 'c7', clientName: 'Tom Bradley', type: 'Full Body', duration: 62, date: '2026-02-13', completed: true },
  { id: 'w7-06', clientId: 'c7', clientName: 'Tom Bradley', type: 'Upper Body', duration: 55, date: '2026-02-11', completed: true },
  { id: 'w7-07', clientId: 'c7', clientName: 'Tom Bradley', type: 'Lower Body', duration: 60, date: '2026-02-09', completed: true },
  { id: 'w7-08', clientId: 'c7', clientName: 'Tom Bradley', type: 'Cardio', duration: 38, date: '2026-02-08', completed: false },
  { id: 'w7-09', clientId: 'c7', clientName: 'Tom Bradley', type: 'Full Body', duration: 60, date: '2026-02-06', completed: true },
  { id: 'w7-10', clientId: 'c7', clientName: 'Tom Bradley', type: 'Upper Body', duration: 55, date: '2026-02-04', completed: true },
  { id: 'w7-11', clientId: 'c7', clientName: 'Tom Bradley', type: 'Lower Body', duration: 58, date: '2026-02-02', completed: true },
  { id: 'w7-12', clientId: 'c7', clientName: 'Tom Bradley', type: 'Cardio', duration: 40, date: '2026-02-01', completed: true },
  { id: 'w7-13', clientId: 'c7', clientName: 'Tom Bradley', type: 'Full Body', duration: 60, date: '2026-01-30', completed: true },
  { id: 'w7-14', clientId: 'c7', clientName: 'Tom Bradley', type: 'Upper Body', duration: 55, date: '2026-01-28', completed: true },
  { id: 'w7-15', clientId: 'c7', clientName: 'Tom Bradley', type: 'Lower Body', duration: 60, date: '2026-01-26', completed: true },
  { id: 'w7-16', clientId: 'c7', clientName: 'Tom Bradley', type: 'Cardio', duration: 40, date: '2026-01-25', completed: true },
  { id: 'w7-17', clientId: 'c7', clientName: 'Tom Bradley', type: 'Full Body', duration: 62, date: '2026-01-23', completed: true },

  // ── Aisha Patel (c8) — 3x/week ──
  { id: 'w8-01', clientId: 'c8', clientName: 'Aisha Patel', type: 'Upper Body', duration: 50, date: '2026-02-20', completed: false },
  { id: 'w8-02', clientId: 'c8', clientName: 'Aisha Patel', type: 'Lower Body', duration: 48, date: '2026-02-18', completed: true },
  { id: 'w8-03', clientId: 'c8', clientName: 'Aisha Patel', type: 'Full Body', duration: 50, date: '2026-02-15', completed: true },
  { id: 'w8-04', clientId: 'c8', clientName: 'Aisha Patel', type: 'Upper Body', duration: 48, date: '2026-02-13', completed: true },
  { id: 'w8-05', clientId: 'c8', clientName: 'Aisha Patel', type: 'Lower Body', duration: 50, date: '2026-02-11', completed: true },
  { id: 'w8-06', clientId: 'c8', clientName: 'Aisha Patel', type: 'Full Body', duration: 45, date: '2026-02-08', completed: true },
  { id: 'w8-07', clientId: 'c8', clientName: 'Aisha Patel', type: 'Upper Body', duration: 50, date: '2026-02-06', completed: false },
  { id: 'w8-08', clientId: 'c8', clientName: 'Aisha Patel', type: 'Lower Body', duration: 48, date: '2026-02-04', completed: true },
  { id: 'w8-09', clientId: 'c8', clientName: 'Aisha Patel', type: 'Full Body', duration: 50, date: '2026-02-01', completed: true },
  { id: 'w8-10', clientId: 'c8', clientName: 'Aisha Patel', type: 'Upper Body', duration: 45, date: '2026-01-29', completed: true },
  { id: 'w8-11', clientId: 'c8', clientName: 'Aisha Patel', type: 'Lower Body', duration: 48, date: '2026-01-27', completed: true },
];

export const scheduleToday = [
  { time: '07:00', client: 'Jake Morrison', type: 'Squat Day', status: 'completed' as const, duration: 60 },
  { time: '09:00', client: 'Marcus Chen', type: 'Upper Body', status: 'completed' as const, duration: 45 },
  { time: '11:00', client: 'Sarah Williams', type: 'Lower Body', status: 'completed' as const, duration: 60 },
  { time: '14:00', client: 'Tom Bradley', type: 'Full Body', status: 'current' as const, duration: 90 },
  { time: '16:00', client: 'David Park', type: 'Push Day', status: 'upcoming' as const, duration: 60 },
  { time: '18:00', client: 'Aisha Patel', type: 'Upper Body', status: 'upcoming' as const, duration: 45 },
];

export const exerciseLibrary: string[] = [
  'Barbell Back Squat', 'Front Squat', 'Goblet Squat', 'Bulgarian Split Squat',
  'Leg Press', 'Romanian Deadlift', 'Conventional Deadlift', 'Sumo Deadlift',
  'Hip Thrust', 'Leg Extension', 'Leg Curl', 'Calf Raise',
  'Barbell Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press',
  'Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise',
  'Barbell Row', 'Dumbbell Row', 'Lat Pulldown', 'Pull-Up', 'Chin-Up',
  'Cable Row', 'Face Pull', 'Rear Delt Fly',
  'Barbell Curl', 'Hammer Curl', 'Tricep Pushdown', 'Skull Crusher',
  'Plank', 'Ab Rollout', 'Cable Crunch', 'Hanging Leg Raise',
  'Lunges', 'Step-Up', 'Glute Bridge', 'Good Morning',
];

export const invoices: Invoice[] = [
  // ── February 2026 ──
  { id: 'inv-01', clientId: 'c1', clientName: 'Marcus Chen', amount: 299, status: 'paid', dueDate: '2026-02-01', paidDate: '2026-01-30', period: 'Feb 2026', plan: 'Elite' },
  { id: 'inv-02', clientId: 'c2', clientName: 'Sarah Williams', amount: 199, status: 'paid', dueDate: '2026-02-01', paidDate: '2026-02-01', period: 'Feb 2026', plan: 'Premium' },
  { id: 'inv-03', clientId: 'c3', clientName: 'Jake Morrison', amount: 299, status: 'paid', dueDate: '2026-02-01', paidDate: '2026-01-29', period: 'Feb 2026', plan: 'Elite' },
  { id: 'inv-04', clientId: 'c4', clientName: 'Emma Rodriguez', amount: 99, status: 'pending', dueDate: '2026-02-10', paidDate: null, period: 'Feb 2026', plan: 'Basic' },
  { id: 'inv-05', clientId: 'c5', clientName: 'David Park', amount: 199, status: 'paid', dueDate: '2026-02-01', paidDate: '2026-02-02', period: 'Feb 2026', plan: 'Premium' },
  { id: 'inv-06', clientId: 'c6', clientName: 'Lisa Thompson', amount: 299, status: 'overdue', dueDate: '2026-02-01', paidDate: null, period: 'Feb 2026', plan: 'Elite' },
  { id: 'inv-07', clientId: 'c7', clientName: 'Tom Bradley', amount: 199, status: 'paid', dueDate: '2026-02-01', paidDate: '2026-02-01', period: 'Feb 2026', plan: 'Premium' },
  { id: 'inv-08', clientId: 'c8', clientName: 'Aisha Patel', amount: 99, status: 'paid', dueDate: '2026-02-01', paidDate: '2026-02-03', period: 'Feb 2026', plan: 'Basic' },
  // ── January 2026 ──
  { id: 'inv-09', clientId: 'c1', clientName: 'Marcus Chen', amount: 299, status: 'paid', dueDate: '2026-01-01', paidDate: '2025-12-30', period: 'Jan 2026', plan: 'Elite' },
  { id: 'inv-10', clientId: 'c2', clientName: 'Sarah Williams', amount: 199, status: 'paid', dueDate: '2026-01-01', paidDate: '2026-01-01', period: 'Jan 2026', plan: 'Premium' },
  { id: 'inv-11', clientId: 'c3', clientName: 'Jake Morrison', amount: 299, status: 'paid', dueDate: '2026-01-01', paidDate: '2025-12-31', period: 'Jan 2026', plan: 'Elite' },
  { id: 'inv-12', clientId: 'c5', clientName: 'David Park', amount: 199, status: 'paid', dueDate: '2026-01-01', paidDate: '2026-01-02', period: 'Jan 2026', plan: 'Premium' },
  { id: 'inv-13', clientId: 'c6', clientName: 'Lisa Thompson', amount: 299, status: 'paid', dueDate: '2026-01-01', paidDate: '2026-01-01', period: 'Jan 2026', plan: 'Elite' },
  { id: 'inv-14', clientId: 'c7', clientName: 'Tom Bradley', amount: 199, status: 'paid', dueDate: '2026-01-01', paidDate: '2026-01-01', period: 'Jan 2026', plan: 'Premium' },
  { id: 'inv-15', clientId: 'c8', clientName: 'Aisha Patel', amount: 99, status: 'paid', dueDate: '2026-01-01', paidDate: '2026-01-03', period: 'Jan 2026', plan: 'Basic' },
  // ── December 2025 ──
  { id: 'inv-16', clientId: 'c1', clientName: 'Marcus Chen', amount: 299, status: 'paid', dueDate: '2025-12-01', paidDate: '2025-11-30', period: 'Dec 2025', plan: 'Elite' },
  { id: 'inv-17', clientId: 'c2', clientName: 'Sarah Williams', amount: 199, status: 'paid', dueDate: '2025-12-01', paidDate: '2025-12-01', period: 'Dec 2025', plan: 'Premium' },
  { id: 'inv-18', clientId: 'c3', clientName: 'Jake Morrison', amount: 299, status: 'paid', dueDate: '2025-12-01', paidDate: '2025-12-01', period: 'Dec 2025', plan: 'Elite' },
  { id: 'inv-19', clientId: 'c5', clientName: 'David Park', amount: 199, status: 'paid', dueDate: '2025-12-01', paidDate: '2025-12-02', period: 'Dec 2025', plan: 'Premium' },
  { id: 'inv-20', clientId: 'c6', clientName: 'Lisa Thompson', amount: 299, status: 'paid', dueDate: '2025-12-01', paidDate: '2025-12-01', period: 'Dec 2025', plan: 'Elite' },
  { id: 'inv-21', clientId: 'c7', clientName: 'Tom Bradley', amount: 199, status: 'paid', dueDate: '2025-12-01', paidDate: '2025-12-01', period: 'Dec 2025', plan: 'Premium' },
];

export const checkIns: CheckIn[] = [
  // ── Marcus Chen — consistent, strong performer ──
  { id: 'ci-01', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-22', status: 'scheduled', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-02', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-15', status: 'completed', weight: 86, bodyFat: 17, mood: 4, energy: 8, stress: 3, sleepHours: 7.5, adherence: 90, nutritionScore: 8, notes: 'Feeling strong. Bench PR this week. Sleep could be better on weekends.', wins: 'Bench PR 102.5kg x2, Hit all 4 sessions, Protein target every day', challenges: 'Weekend sleep was rough — stayed up late Saturday', coachFeedback: 'Great progress Marcus! Keep the momentum. Add 2.5kg to bench next week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-03', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-08', status: 'completed', weight: 86.5, bodyFat: 17.2, mood: 3, energy: 6, stress: 5, sleepHours: 7, adherence: 85, nutritionScore: 7, notes: 'Missed one session due to work. Otherwise solid week.', wins: 'Squat felt smooth at 130kg, Meal prepped Sunday, Walked 10k steps 5/7 days', challenges: 'Work deadline killed my Thursday session, Stress eating on Wednesday', coachFeedback: 'No worries about the missed session. Nutrition was on point — keep it up.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-04', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-02-01', status: 'completed', weight: 87, bodyFat: 17.5, mood: 4, energy: 8, stress: 2, sleepHours: 8, adherence: 95, nutritionScore: 9, notes: 'Best week so far. Hit all sessions and nailed macros.', wins: 'All 4 sessions completed, Macros within 5% every day, New deadlift rep PR', challenges: 'None this week — felt great all around', coachFeedback: 'Incredible consistency! This is exactly how we build results.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-04b', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-01-25', status: 'completed', weight: 87.5, bodyFat: 17.8, mood: 3, energy: 5, stress: 6, sleepHours: 6.5, adherence: 75, nutritionScore: 6, notes: 'Rough week. Work stress got to me. Still made it to 3 sessions.', wins: 'Showed up despite not feeling it, Kept protein high', challenges: 'Only 3/4 sessions, Late nights at work, Cravings on Thursday', coachFeedback: 'Showing up when you don\'t feel like it IS the win. Let\'s aim for 4 sessions next week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-04c', clientId: 'c1', clientName: 'Marcus Chen', date: '2026-01-18', status: 'completed', weight: 88, bodyFat: 18, mood: 4, energy: 7, stress: 3, sleepHours: 7.5, adherence: 90, nutritionScore: 8, notes: 'Back on track. Energy was great midweek.', wins: '4/4 sessions done, Brought lunch to work every day, Hit a squat PR', challenges: 'Sunday was a rest day I didn\'t plan — felt lazy', coachFeedback: 'Great bounce back! Unplanned rest days happen. Your body needed it.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },

  // ── Sarah Williams — rehabbing knee, steady progress ──
  { id: 'ci-05', clientId: 'c2', clientName: 'Sarah Williams', date: '2026-02-23', status: 'scheduled', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-06', clientId: 'c2', clientName: 'Sarah Williams', date: '2026-02-16', status: 'completed', weight: 66.5, bodyFat: 24, mood: 4, energy: 7, stress: 3, sleepHours: 7, adherence: 80, nutritionScore: 7, notes: 'Knee feels great! Did deeper squats this week without pain.', wins: 'Pain-free squats for the first time, Completed all 3 sessions, Down 0.5kg', challenges: 'Still nervous about going heavy on legs', coachFeedback: 'Excellent news about the knee. Let\'s progress to parallel squats next week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-07', clientId: 'c2', clientName: 'Sarah Williams', date: '2026-02-09', status: 'completed', weight: 67, bodyFat: 24.2, mood: 3, energy: 5, stress: 5, sleepHours: 6.5, adherence: 75, nutritionScore: 6, notes: 'Skipped one session — felt tired. Knee was a bit stiff on Tuesday.', wins: 'Completed 2/3 sessions, Foam rolled every morning', challenges: 'Knee stiffness on Tuesday, Low energy all week, Ate out 3 times', coachFeedback: 'Rest when you need to. Try 10 min foam rolling before leg days for the stiffness.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-07b', clientId: 'c2', clientName: 'Sarah Williams', date: '2026-02-02', status: 'completed', weight: 67.5, bodyFat: 24.5, mood: 3, energy: 6, stress: 4, sleepHours: 7, adherence: 70, nutritionScore: 5, notes: 'Struggled with nutrition this week. Knee felt okay though.', wins: 'Knee improving steadily, Hit a deadlift PR 82.5kg', challenges: 'Nutrition fell off — too many meals out, Only 2/3 sessions', coachFeedback: 'Focus on meal prep this weekend. Even just 3-4 meals ready to go makes a huge difference.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-07c', clientId: 'c2', clientName: 'Sarah Williams', date: '2026-01-26', status: 'completed', weight: 68, bodyFat: 25, mood: 2, energy: 4, stress: 7, sleepHours: 5.5, adherence: 60, nutritionScore: 4, notes: 'Terrible week. Knee flared up on Monday and I panicked. Barely trained.', wins: 'Still showed up twice', challenges: 'Knee pain scare, Work was insane, Only slept 5-6 hours most nights', coachFeedback: 'I understand the frustration. The flare-up was likely from overuse, not damage. Let\'s dial back leg volume next week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },

  // ── Jake Morrison — elite, comp prep ──
  { id: 'ci-08', clientId: 'c3', clientName: 'Jake Morrison', date: '2026-02-21', status: 'completed', weight: 85.2, bodyFat: 11.8, mood: 5, energy: 9, stress: 2, sleepHours: 9, adherence: 100, nutritionScore: 10, notes: 'Peak week starts now. Everything is dialed in. Best I\'ve ever felt going into a comp.', wins: 'All 6 sessions crushed, Perfect nutrition all week, 9hr sleep average, New squat PR 167.5kg', challenges: 'None — everything clicked this week', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [{ url: '/mock/jake-front-w8.jpg', label: 'front' }, { url: '/mock/jake-side-w8.jpg', label: 'side' }, { url: '/mock/jake-back-w8.jpg', label: 'back' }], followUpNotes: [] },
  { id: 'ci-09', clientId: 'c3', clientName: 'Jake Morrison', date: '2026-02-14', status: 'completed', weight: 85, bodyFat: 12, mood: 5, energy: 8, stress: 2, sleepHours: 8.5, adherence: 100, nutritionScore: 9, notes: 'Competition prep going perfectly. All lifts trending up. Feeling dialed in.', wins: '6/6 sessions, Squat 165kg x2, Bench 117.5kg smooth, Weight on target', challenges: 'Slight hip tightness on Wednesday — foam rolled it out', coachFeedback: 'You\'re peaking at the right time. Start reducing volume next week for peak week.', reviewStatus: 'reviewed', flagReason: '', photos: [{ url: '/mock/jake-front-w7.jpg', label: 'front' }, { url: '/mock/jake-side-w7.jpg', label: 'side' }], followUpNotes: [{ text: 'Sent updated peak week program via email. Jake confirmed he received it.', date: '2026-02-15' }] },
  { id: 'ci-10', clientId: 'c3', clientName: 'Jake Morrison', date: '2026-02-07', status: 'completed', weight: 84.5, bodyFat: 12.2, mood: 4, energy: 7, stress: 3, sleepHours: 8, adherence: 95, nutritionScore: 9, notes: 'Deadlift felt heavy. Might need an extra rest day.', wins: '5/6 sessions, Bench PR attempt went well, Nutrition dialed', challenges: 'Deadlift 195kg felt like RPE 10, Accumulated fatigue', coachFeedback: 'Fatigue is expected at this stage. Take Friday completely off, we\'ll push hard Monday.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-10b', clientId: 'c3', clientName: 'Jake Morrison', date: '2026-01-31', status: 'completed', weight: 84.2, bodyFat: 12.5, mood: 4, energy: 8, stress: 2, sleepHours: 8.5, adherence: 100, nutritionScore: 9, notes: 'Great training week. Volume is feeling manageable again.', wins: '6/6 sessions, Deadlift 190kg felt easy, Sleep was excellent', challenges: 'Slight quad soreness from heavy squats', coachFeedback: 'Volume adaptation is kicking in. Great sign 4 weeks out.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-10c', clientId: 'c3', clientName: 'Jake Morrison', date: '2026-01-24', status: 'completed', weight: 84, bodyFat: 12.8, mood: 3, energy: 6, stress: 4, sleepHours: 7.5, adherence: 90, nutritionScore: 8, notes: 'Felt a bit run down mid-week. Skipped accessories on Thursday.', wins: '5/6 sessions, Bench still progressing, Weight holding steady', challenges: 'Fatigue accumulation, Slight headache Thursday', coachFeedback: 'Normal fatigue for this training phase. Keep calories up — don\'t cut now.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },

  // ── David Park — shift worker, struggling with sleep ──
  { id: 'ci-11', clientId: 'c5', clientName: 'David Park', date: '2026-02-25', status: 'scheduled', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-12', clientId: 'c5', clientName: 'David Park', date: '2026-02-18', status: 'completed', weight: 83, bodyFat: 17, mood: 3, energy: 4, stress: 7, sleepHours: 5.5, adherence: 70, nutritionScore: 5, notes: 'Tough week with shift changes. Sleep was terrible. Managed 3 sessions.', wins: 'Made it to gym 3 times despite shifts, Kept water intake up', challenges: 'Sleep averaged 5.5 hours, Ate fast food twice, Night shifts killed motivation', coachFeedback: 'Sleep is your bottleneck right now. Try melatonin 30min before bed on night shifts.', reviewStatus: 'flagged', flagReason: 'Sleep declining 3 weeks — needs schedule adjustment', photos: [], followUpNotes: [{ text: 'Texted David about trying melatonin. Will check back Wednesday.', date: '2026-02-19' }] },
  { id: 'ci-13', clientId: 'c5', clientName: 'David Park', date: '2026-02-11', status: 'missed', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: 'Missed check-in — followed up via email. Double shift week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-13b', clientId: 'c5', clientName: 'David Park', date: '2026-02-04', status: 'completed', weight: 83.5, bodyFat: 17.2, mood: 3, energy: 5, stress: 6, sleepHours: 6, adherence: 75, nutritionScore: 6, notes: 'Better than last week. Got 3 solid sessions in. Sleep still bad.', wins: '3/4 sessions done, Found a meal prep service that delivers', challenges: 'Night shifts continue, Sleep under 6hr on work nights', coachFeedback: 'Meal prep service is a smart move. Let\'s try shifting your workout window to accommodate shifts.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-13c', clientId: 'c5', clientName: 'David Park', date: '2026-01-28', status: 'completed', weight: 84, bodyFat: 17.5, mood: 2, energy: 3, stress: 8, sleepHours: 5, adherence: 50, nutritionScore: 4, notes: 'Worst week so far. Only made it twice. Shift schedule is killing me.', wins: 'Didn\'t quit, Still tracked what I ate', challenges: '2/4 sessions only, 5hr sleep average, Stress through the roof', coachFeedback: 'Two sessions is still better than zero. We need to talk about adjusting your schedule — let\'s book a quick call.', reviewStatus: 'flagged', flagReason: 'Adherence dropped to 50% — needs coaching call', photos: [], followUpNotes: [] },

  // ── Tom Bradley — weight loss journey, motivated ──
  { id: 'ci-14', clientId: 'c7', clientName: 'Tom Bradley', date: '2026-02-22', status: 'scheduled', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-15', clientId: 'c7', clientName: 'Tom Bradley', date: '2026-02-15', status: 'completed', weight: 96, bodyFat: 23.5, mood: 5, energy: 8, stress: 2, sleepHours: 7, adherence: 90, nutritionScore: 8, notes: 'Under 96kg for the first time! Cardio is getting easier too.', wins: 'Sub-96kg milestone!, 4/4 sessions, Ran 5K without stopping for the first time, Cooked every meal this week', challenges: 'Sunday dinner out was hard to track macros', coachFeedback: 'Massive milestone Tom! 9kg down is no joke. Let\'s target 93 by end of March.', reviewStatus: 'reviewed', flagReason: '', photos: [{ url: '/mock/tom-front-w6.jpg', label: 'front' }, { url: '/mock/tom-side-w6.jpg', label: 'side' }], followUpNotes: [{ text: 'Called Tom to congratulate on sub-96 milestone. Very motivated — set new target 93kg by March.', date: '2026-02-16' }] },
  { id: 'ci-16', clientId: 'c7', clientName: 'Tom Bradley', date: '2026-02-08', status: 'completed', weight: 96.5, bodyFat: 23.8, mood: 4, energy: 7, stress: 3, sleepHours: 7.5, adherence: 85, nutritionScore: 7, notes: 'Missed one cardio session but kept nutrition clean.', wins: '3/4 sessions completed, Nutrition was solid all week, Lost 0.5kg', challenges: 'Skipped Saturday cardio — was at a friend\'s birthday', coachFeedback: 'Nutrition consistency matters more than one missed cardio. You\'re doing great.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-16b', clientId: 'c7', clientName: 'Tom Bradley', date: '2026-02-01', status: 'completed', weight: 97, bodyFat: 24, mood: 4, energy: 7, stress: 3, sleepHours: 7, adherence: 90, nutritionScore: 7, notes: 'Solid week. Starting to actually enjoy cardio which is wild.', wins: '4/4 sessions, First time enjoying a run, Weight still trending down', challenges: 'Craved pizza hard on Wednesday — had a small portion instead of none', coachFeedback: 'Having a small portion IS the win. That\'s sustainable. Keep doing that.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-16c', clientId: 'c7', clientName: 'Tom Bradley', date: '2026-01-25', status: 'completed', weight: 97.5, bodyFat: 24.3, mood: 3, energy: 6, stress: 4, sleepHours: 6.5, adherence: 80, nutritionScore: 6, notes: 'Good but not great. Felt tired midweek.', wins: '3/4 sessions, Kept tracking even when off plan', challenges: 'Midweek fatigue, Ate out twice, Sleep was broken 2 nights', coachFeedback: 'Tracking when off-plan shows maturity. That data helps us adjust. Prioritize sleep this week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },

  // ── Aisha Patel — newer client, building habits ──
  { id: 'ci-17', clientId: 'c8', clientName: 'Aisha Patel', date: '2026-02-26', status: 'scheduled', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-18', clientId: 'c8', clientName: 'Aisha Patel', date: '2026-02-19', status: 'completed', weight: 57, bodyFat: 24.5, mood: 4, energy: 7, stress: 3, sleepHours: 7, adherence: 80, nutritionScore: 7, notes: 'Really enjoying the new glute focus! Posture feels better at work.', wins: 'Posture improvement at desk, Completed all 3 sessions, Tried hip thrusts for the first time', challenges: 'Still figuring out pre-workout nutrition', coachFeedback: 'That\'s the posture work paying off. Adding hip thrusts next week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-18b', clientId: 'c8', clientName: 'Aisha Patel', date: '2026-02-12', status: 'completed', weight: 57.5, bodyFat: 25, mood: 3, energy: 6, stress: 4, sleepHours: 6.5, adherence: 70, nutritionScore: 6, notes: 'Okay week. Work got busy and I missed Friday.', wins: '2/3 sessions, Started eating more protein', challenges: 'Missed Friday session, Didn\'t meal prep', coachFeedback: 'Protein increase is great! Try prepping just 3 meals for the busy days — doesn\'t need to be all week.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-18c', clientId: 'c8', clientName: 'Aisha Patel', date: '2026-02-05', status: 'completed', weight: 57.5, bodyFat: 25, mood: 4, energy: 7, stress: 3, sleepHours: 7, adherence: 80, nutritionScore: 6, notes: 'Felt good this week. Getting into a routine.', wins: '3/3 sessions done!, Morning routine is becoming a habit', challenges: 'Nutrition still inconsistent on weekends', coachFeedback: 'Consistency breeds results. Great to see the routine forming!', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },

  // ── Emma Rodriguez — beginner, high enthusiasm ──
  { id: 'ci-19', clientId: 'c4', clientName: 'Emma Rodriguez', date: '2026-02-24', status: 'scheduled', weight: null, bodyFat: null, mood: null, energy: null, stress: null, sleepHours: null, adherence: null, nutritionScore: null, notes: '', wins: '', challenges: '', coachFeedback: '', reviewStatus: 'pending', flagReason: '', photos: [], followUpNotes: [] },
  { id: 'ci-20', clientId: 'c4', clientName: 'Emma Rodriguez', date: '2026-02-17', status: 'completed', weight: 74.5, bodyFat: 29.5, mood: 4, energy: 7, stress: 3, sleepHours: 7, adherence: 75, nutritionScore: 5, notes: 'Had my first workout and loved it! Still figuring out the gym routine.', wins: 'First week in the gym!, Tried squats for the first time, Signed up for MyFitnessPal', challenges: 'Felt intimidated at the gym, Not sure how to track macros yet, Missed Wednesday', coachFeedback: 'Amazing start Emma! Don\'t worry about perfection yet — consistency is key. We\'ll dial in nutrition next.', reviewStatus: 'reviewed', flagReason: '', photos: [], followUpNotes: [] },
];

export const workoutPrograms: WorkoutProgram[] = [
  {
    id: 'wp1',
    name: 'Hypertrophy Block A',
    status: 'active',
    durationWeeks: 6,
    clientIds: ['c1'],
    isTemplate: false,
    createdAt: '2026-01-15',
    updatedAt: '2026-02-18',
    days: [
      {
        id: 'wd1a',
        name: 'Upper Body A',
        exercises: [
          { id: 'e1', name: 'Barbell Bench Press', sets: 4, reps: '6-8', weight: '90kg', rpe: 8, tempo: '3-1-2-0', restSeconds: 180, notes: '' },
          { id: 'e2', name: 'Barbell Row', sets: 4, reps: '8-10', weight: '75kg', rpe: 7, tempo: '', restSeconds: 120, notes: '' },
          { id: 'e3', name: 'Overhead Press', sets: 3, reps: '8-12', weight: '50kg', rpe: 7, tempo: '', restSeconds: 120, notes: '' },
          { id: 'e4', name: 'Lateral Raise', sets: 3, reps: '12-15', weight: '12kg', rpe: null, tempo: '', restSeconds: 60, notes: 'Controlled eccentric' },
        ],
      },
      {
        id: 'wd1b',
        name: 'Lower Body A',
        exercises: [
          { id: 'e5', name: 'Barbell Back Squat', sets: 4, reps: '5-6', weight: '120kg', rpe: 8, tempo: '3-1-2-0', restSeconds: 240, notes: 'Belt on working sets' },
          { id: 'e6', name: 'Romanian Deadlift', sets: 3, reps: '8-10', weight: '100kg', rpe: 7, tempo: '3-0-1-0', restSeconds: 120, notes: '' },
          { id: 'e7', name: 'Leg Press', sets: 3, reps: '10-12', weight: '180kg', rpe: null, tempo: '', restSeconds: 120, notes: '' },
          { id: 'e8', name: 'Calf Raise', sets: 4, reps: '12-15', weight: '60kg', rpe: null, tempo: '2-1-1-0', restSeconds: 60, notes: '' },
        ],
      },
    ],
  },
  {
    id: 'wp2',
    name: 'Powerlifting Peak',
    status: 'active',
    durationWeeks: 4,
    clientIds: ['c3'],
    isTemplate: false,
    createdAt: '2026-02-01',
    updatedAt: '2026-02-20',
    days: [
      {
        id: 'wd2a',
        name: 'Squat Day',
        exercises: [
          { id: 'e9', name: 'Barbell Back Squat', sets: 5, reps: '3', weight: '155kg', rpe: 9, tempo: '', restSeconds: 300, notes: 'Competition stance' },
          { id: 'e10', name: 'Front Squat', sets: 3, reps: '5', weight: '120kg', rpe: 7, tempo: '', restSeconds: 180, notes: '' },
          { id: 'e11', name: 'Leg Extension', sets: 3, reps: '10-12', weight: '', rpe: null, tempo: '', restSeconds: 90, notes: '' },
        ],
      },
      {
        id: 'wd2b',
        name: 'Bench Day',
        exercises: [
          { id: 'e12', name: 'Barbell Bench Press', sets: 5, reps: '3', weight: '115kg', rpe: 9, tempo: '', restSeconds: 300, notes: 'Competition pause' },
          { id: 'e13', name: 'Incline Bench Press', sets: 3, reps: '6-8', weight: '80kg', rpe: 7, tempo: '', restSeconds: 180, notes: '' },
          { id: 'e14', name: 'Tricep Pushdown', sets: 3, reps: '12-15', weight: '', rpe: null, tempo: '', restSeconds: 60, notes: '' },
        ],
      },
    ],
  },
  {
    id: 'wp3',
    name: 'Beginner Full Body Template',
    status: 'draft',
    durationWeeks: 8,
    clientIds: [],
    isTemplate: true,
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
    days: [
      {
        id: 'wd3a',
        name: 'Full Body A',
        exercises: [
          { id: 'e15', name: 'Goblet Squat', sets: 3, reps: '10-12', weight: '', rpe: 6, tempo: '2-1-2-0', restSeconds: 90, notes: 'Focus on form' },
          { id: 'e16', name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', weight: '', rpe: 6, tempo: '', restSeconds: 90, notes: '' },
          { id: 'e17', name: 'Lat Pulldown', sets: 3, reps: '10-12', weight: '', rpe: 6, tempo: '', restSeconds: 90, notes: '' },
          { id: 'e18', name: 'Plank', sets: 3, reps: '30s', weight: '', rpe: null, tempo: '', restSeconds: 60, notes: '' },
        ],
      },
      {
        id: 'wd3b',
        name: 'Full Body B',
        exercises: [
          { id: 'e19', name: 'Romanian Deadlift', sets: 3, reps: '10-12', weight: '', rpe: 6, tempo: '3-0-1-0', restSeconds: 90, notes: 'Hip hinge cue' },
          { id: 'e20', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', weight: '', rpe: 6, tempo: '', restSeconds: 90, notes: '' },
          { id: 'e21', name: 'Cable Row', sets: 3, reps: '10-12', weight: '', rpe: 6, tempo: '', restSeconds: 90, notes: '' },
          { id: 'e22', name: 'Glute Bridge', sets: 3, reps: '12-15', weight: '', rpe: null, tempo: '', restSeconds: 60, notes: '' },
        ],
      },
    ],
  },
];
