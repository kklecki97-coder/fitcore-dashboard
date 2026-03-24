import { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { useLang } from '../i18n';
import type {
  Client, Message, WorkoutProgram, Invoice, CheckIn,
  AppNotification, WorkoutLog, WorkoutSetLog, CoachingPlan,
} from '../types';
import { calculateOverallProgress } from '../utils/calculateProgress';

// ── Context shape ──

interface DataContextValue {
  // State
  clients: Client[];
  messages: Message[];
  programs: WorkoutProgram[];
  invoices: Invoice[];
  checkIns: CheckIn[];
  workoutLogs: WorkoutLog[];
  setLogs: WorkoutSetLog[];
  plans: CoachingPlan[];
  dataLoading: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;
  confettiKey: number;
  triggerConfetti: () => void;

  // Profile
  profileName: string;
  profileEmail: string;
  profilePhoto: string | null;
  setProfileName: (v: string) => void;
  setProfileEmail: (v: string) => void;
  setProfilePhoto: (v: string | null) => void;

  // Notifications
  appNotifications: AppNotification[];
  setAppNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  notifications: { messages: boolean; checkins: boolean; payments: boolean; weekly: boolean };
  setNotifications: React.Dispatch<React.SetStateAction<{ messages: boolean; checkins: boolean; payments: boolean; weekly: boolean }>>;

  // Client handlers
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Message handlers
  sendMessage: (msg: Message) => Promise<void>;

  // Program handlers
  addProgram: (program: WorkoutProgram) => Promise<void>;
  updateProgram: (id: string, updates: Partial<WorkoutProgram>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  duplicateProgram: (id: string) => Promise<void>;

  // Invoice handlers
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addInvoice: (invoice: Invoice) => Promise<void>;

  // Plan handlers
  addPlan: (plan: CoachingPlan) => Promise<void>;
  updatePlan: (id: string, updates: Partial<CoachingPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;

  // Check-in handlers
  updateCheckIn: (id: string, updates: Partial<CheckIn>) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}

// ── Provider ──

interface DataProviderProps {
  isLoggedIn: boolean;
  children: ReactNode;
}

export function DataProvider({ isLoggedIn, children }: DataProviderProps) {
  const { t } = useLang();
  const { showToast } = useToast();

  // ── Shared state lifted from child pages ──
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [allPrograms, setAllPrograms] = useState<WorkoutProgram[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [allSetLogs, setAllSetLogs] = useState<WorkoutSetLog[]>([]);
  const [allPlans, setAllPlans] = useState<CoachingPlan[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const triggerConfetti = () => setConfettiKey(k => k + 1);
  const prevClientCount = useRef(0);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Client milestone confetti (10, 25, 50, 100 clients) ──
  useEffect(() => {
    const milestones = [10, 25, 50, 100];
    const prev = prevClientCount.current;
    const curr = allClients.length;
    if (prev > 0 && curr > prev && milestones.some(m => prev < m && curr >= m)) {
      triggerConfetti();
      showToast(`Milestone: ${curr} clients!`, 'success');
    }
    prevClientCount.current = curr;
  }, [allClients.length]);

  // ── Profile state ──
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    messages: true,
    checkins: true,
    payments: true,
    weekly: false,
  });

  // ── App notifications (bell icon) ──
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);

  // Track data counts to detect new items for notifications
  const prevMessageCount = useRef(allMessages.length);
  const prevCheckInCount = useRef(allCheckIns.length);
  const prevInvoiceCount = useRef(allInvoices.length);

  useEffect(() => {
    const newNotifs: AppNotification[] = [];

    if (allMessages.length > prevMessageCount.current) {
      const newMsgs = allMessages.slice(prevMessageCount.current).filter(m => !m.isFromCoach);
      newMsgs.forEach(msg => {
        const client = allClients.find(c => c.id === msg.clientId);
        newNotifs.push({
          id: `notif-msg-${msg.id}`,
          type: 'message',
          title: t.notifications.newMessageFrom(client?.name || 'Client'),
          description: msg.text.slice(0, 80) + (msg.text.length > 80 ? '...' : ''),
          timestamp: msg.timestamp,
          isRead: false,
          clientId: msg.clientId,
          targetPage: 'messages',
        });
      });
    }
    prevMessageCount.current = allMessages.length;

    if (allCheckIns.length > prevCheckInCount.current) {
      const newCIs = allCheckIns.slice(prevCheckInCount.current);
      newCIs.forEach(ci => {
        newNotifs.push({
          id: `notif-ci-${ci.id}`,
          type: 'checkin',
          title: t.notifications.checkInSubmitted(ci.clientName),
          description: `Check-in for ${ci.date}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          clientId: ci.clientId,
          targetPage: 'check-ins',
        });
      });
    }
    prevCheckInCount.current = allCheckIns.length;

    if (allInvoices.length > prevInvoiceCount.current) {
      const newInvs = allInvoices.slice(prevInvoiceCount.current);
      newInvs.forEach(inv => {
        newNotifs.push({
          id: `notif-inv-${inv.id}`,
          type: 'payment',
          title: t.notifications.paymentReceived(`$${inv.amount}`),
          description: `${inv.clientName} - ${inv.period}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          clientId: inv.clientId,
          targetPage: 'payments',
        });
      });
    }
    prevInvoiceCount.current = allInvoices.length;

    if (newNotifs.length > 0) {
      setAppNotifications(prev => [...newNotifs, ...prev]);
    }
  }, [allMessages, allCheckIns, allInvoices, allClients, t]);

  // ── Realtime refs ──
  const clientsRef = useRef<Client[]>([]);
  const initialLoadDoneRef = useRef(false);
  useEffect(() => { clientsRef.current = allClients; }, [allClients]);

  // ── Load data from Supabase on login ──
  useEffect(() => {
    if (!isLoggedIn) return;

    // Load profile from auth user + coaches table
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setProfileEmail(user.email ?? '');
        setProfileName(user.user_metadata?.name || 'Trenerze');
        // Load avatar from coaches table
        const { data: coach } = await supabase.from('coaches').select('avatar_url').eq('id', user.id).maybeSingle();
        if (coach?.avatar_url) setProfilePhoto(coach.avatar_url);
      }
    });

    // NOTE: Supabase RLS policies filter by coach_id at the DB level,
    // so all queries here automatically return only this coach's data.
    const loadClients = async (): Promise<Client[]> => {
      const { data, error } = await supabase.from('clients').select('*').order('created_at');
      if (error) { console.error('loadClients failed:', error); showToast('Failed to load clients. Please refresh.', 'error'); return []; }
      if (data) {
        // Load client_metrics time-series data
        const clientIds = data.map(r => r.id);
        const { data: metricsRows } = await supabase
          .from('client_metrics')
          .select('*')
          .in('client_id', clientIds)
          .order('recorded_at');

        // Group metrics by client_id
        const metricsMap = new Map<string, { weight: number[]; bodyFat: number[]; benchPress: number[]; squat: number[]; deadlift: number[]; waist: number[]; hips: number[]; chest: number[]; bicep: number[]; thigh: number[] }>();
        for (const m of metricsRows ?? []) {
          if (!metricsMap.has(m.client_id)) {
            metricsMap.set(m.client_id, { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [], waist: [], hips: [], chest: [], bicep: [], thigh: [] });
          }
          const entry = metricsMap.get(m.client_id)!;
          if (m.weight != null) entry.weight.push(Number(m.weight));
          if (m.body_fat != null) entry.bodyFat.push(Number(m.body_fat));
          if (m.bench_press != null) entry.benchPress.push(Number(m.bench_press));
          if (m.squat != null) entry.squat.push(Number(m.squat));
          if (m.deadlift != null) entry.deadlift.push(Number(m.deadlift));
          if (m.waist != null) entry.waist.push(Number(m.waist));
          if (m.hips != null) entry.hips.push(Number(m.hips));
          if (m.chest != null) entry.chest.push(Number(m.chest));
          if (m.bicep != null) entry.bicep.push(Number(m.bicep));
          if (m.thigh != null) entry.thigh.push(Number(m.thigh));
        }

        const clients = data.map(r => ({
          id: r.id,
          name: r.name,
          avatar: '',
          email: r.email ?? '',
          plan: r.plan,
          status: r.status,
          startDate: r.start_date ?? '',
          nextCheckIn: r.next_check_in ?? '',
          monthlyRate: r.monthly_rate ?? 0,
          progress: r.progress ?? 0,
          height: r.height,
          streak: r.streak ?? 0,
          goals: r.goals ?? [],
          goalTargets: r.goal_targets ?? {},
          notes: r.notes ?? '',
          metrics: metricsMap.get(r.id) ?? { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
          notesHistory: [],
          activityLog: [],
          lastActive: r.last_active ?? '',
        }));
        setAllClients(clients);
        return clients;
      }
      return [];
    };

    const loadMessages = async (clientsList: Client[]) => {
      // Fix #15: Build name map instead of .find() per record
      const nameMap = new Map(clientsList.map(c => [c.id, c.name]));
      const { data, error } = await supabase.from('messages').select('*').order('timestamp');
      if (error) { console.error('loadMessages failed:', error); showToast('Failed to load messages.', 'error'); return; }
      if (data) {
        setAllMessages(data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: nameMap.get(r.client_id) ?? '',
          clientAvatar: '',
          text: r.text,
          timestamp: r.timestamp,
          isRead: r.is_read,
          isFromCoach: r.is_from_coach,
          deliveryStatus: r.delivery_status,
        })));
      }
    };

    const loadInvoices = async (clientsList: Client[]) => {
      const nameMap = new Map(clientsList.map(c => [c.id, c.name]));
      const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (error) { console.error('loadInvoices failed:', error); showToast('Failed to load invoices.', 'error'); return; }
      if (data) {
        setAllInvoices(data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: nameMap.get(r.client_id) ?? '',
          amount: r.amount,
          status: r.status,
          dueDate: r.due_date ?? '',
          paidDate: r.paid_date ?? null,
          period: r.period ?? '',
          plan: r.plan,
          paymentUrl: r.payment_url ?? null,
          stripeSessionId: r.stripe_checkout_session_id ?? null,
        })));
      }
    };

    const loadCheckIns = async (clientsList: Client[]) => {
      const nameMap = new Map(clientsList.map(c => [c.id, c.name]));
      const { data, error } = await supabase.from('check_ins').select('*').order('date', { ascending: false });
      if (error) { console.error('loadCheckIns failed:', error); showToast('Failed to load check-ins.', 'error'); return; }
      if (data) {
        // Load photos for all check-ins
        const checkInIds = data.map(r => r.id);
        const { data: photoData } = checkInIds.length > 0
          ? await supabase.from('check_in_photos').select('*').in('check_in_id', checkInIds)
          : { data: [] };

        // Generate signed URLs on-the-fly from stored paths
        const photosByCheckIn: Record<string, { url: string; label: string }[]> = {};
        for (const p of (photoData ?? [])) {
          if (!photosByCheckIn[p.check_in_id]) photosByCheckIn[p.check_in_id] = [];
          let photoUrl = p.url;
          if (photoUrl && !photoUrl.startsWith('http')) {
            const { data: signedData } = await supabase.storage
              .from('check-in-photos')
              .createSignedUrl(photoUrl, 86400);
            if (signedData?.signedUrl) photoUrl = signedData.signedUrl;
          } else if (photoUrl && photoUrl.includes('/storage/v1/')) {
            const pathMatch = photoUrl.match(/\/check-in-photos\/(.+?)(\?|$)/);
            if (pathMatch?.[1]) {
              const { data: signedData } = await supabase.storage
                .from('check-in-photos')
                .createSignedUrl(decodeURIComponent(pathMatch[1]), 86400);
              if (signedData?.signedUrl) photoUrl = signedData.signedUrl;
            }
          }
          photosByCheckIn[p.check_in_id].push({ url: photoUrl, label: p.label ?? '' });
        }

        setAllCheckIns(data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: nameMap.get(r.client_id) ?? '',
          date: r.date,
          status: r.status,
          weight: r.weight,
          bodyFat: r.body_fat,
          waist: r.waist ?? null,
          hips: r.hips ?? null,
          chest: r.chest ?? null,
          bicep: r.bicep ?? null,
          thigh: r.thigh ?? null,
          mood: r.mood,
          energy: r.energy,
          stress: r.stress,
          sleepHours: r.sleep_hours,
          steps: r.steps,
          nutritionScore: r.nutrition_score,
          notes: r.notes ?? '',
          wins: r.wins ?? '',
          challenges: r.challenges ?? '',
          coachFeedback: r.coach_feedback ?? '',
          reviewStatus: r.review_status,
          flagReason: r.flag_reason ?? '',
          photos: photosByCheckIn[r.id] ?? [],
          followUpNotes: [],
        })));
      }
    };

    const loadPrograms = async () => {
      const { data, error } = await supabase
        .from('workout_programs')
        .select(`*, workout_days(*, exercises(*)), program_clients(client_id)`)
        .order('created_at');
      if (error) { console.error('loadPrograms failed:', error); showToast('Failed to load programs.', 'error'); return; }
      if (data) {
        setAllPrograms(data.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          durationWeeks: p.duration_weeks,
          clientIds: (p.program_clients ?? []).map((pc: { client_id: string }) => pc.client_id),
          isTemplate: p.is_template,
          notes: p.notes ?? '',
          createdAt: p.created_at?.split('T')[0] ?? '',
          updatedAt: p.updated_at?.split('T')[0] ?? '',
          days: (p.workout_days ?? [])
            .sort((a: { day_order: number }, b: { day_order: number }) => a.day_order - b.day_order)
            .map((d: { id: string; name: string; exercises: { id: string; name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; rest_seconds: number | null; notes: string; exercise_order: number }[] }) => ({
              id: d.id,
              name: d.name,
              exercises: (d.exercises ?? [])
                .sort((a, b) => a.exercise_order - b.exercise_order)
                .map(e => ({
                  id: e.id,
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  weight: e.weight,
                  rpe: e.rpe,
                  tempo: e.tempo,
                  restSeconds: e.rest_seconds,
                  notes: e.notes,
                })),
            })),
        })));
      }
    };

    const loadWorkoutLogs = async (): Promise<WorkoutLog[]> => {
      const { data, error } = await supabase.from('workout_logs').select('*, clients(name)').order('date', { ascending: false });
      if (error) { console.error('loadWorkoutLogs failed:', error); showToast('Failed to load workout logs.', 'error'); return []; }
      if (data) {
        const logs = data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: r.clients?.name ?? '',
          type: r.type,
          duration: r.duration ?? 0,
          date: r.date,
          completed: r.completed ?? false,
        }));
        setAllWorkoutLogs(logs);
        return logs;
      }
      return [];
    };

    const loadSetLogs = async () => {
      const { data, error } = await supabase.from('workout_set_logs').select('*').order('date', { ascending: false });
      if (error) { console.error('loadSetLogs failed:', error); showToast('Failed to load set logs.', 'error'); return; }
      if (data) {
        setAllSetLogs(data.map(r => ({
          id: r.id,
          date: r.date,
          clientId: r.client_id,
          exerciseId: r.exercise_id,
          exerciseName: r.exercise_name,
          setNumber: r.set_number,
          reps: r.reps,
          weight: r.weight ?? '',
          completed: r.completed ?? false,
          rpe: r.rpe,
        })));
      }
    };

    const loadPlans = async () => {
      const { data, error } = await supabase.from('coaching_plans').select('*').order('created_at');
      if (error) { console.error('loadPlans failed:', error); showToast('Failed to load plans.', 'error'); return; }
      if (data) {
        setAllPlans(data.map(r => ({
          id: r.id,
          coachId: r.coach_id,
          name: r.name,
          price: Number(r.price),
          billingCycle: r.billing_cycle,
          description: r.description ?? '',
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })));
      }
    };

    setDataLoading(true);
    loadClients().then((clientsList) => {
      Promise.all([
        loadMessages(clientsList),
        loadInvoices(clientsList),
        loadCheckIns(clientsList),
        loadPrograms(),
        loadWorkoutLogs(),
        loadSetLogs(),
        loadPlans(),
      ]).then(([, , , , workoutLogs]) => {
        // ── Auto-calculate overall progress for each client ──
        const logs = (workoutLogs ?? []) as WorkoutLog[];
        const updates: { id: string; progress: number }[] = [];

        const updatedClients = clientsList.map((client) => {
          if (client.status !== 'active') return client;
          const newProgress = calculateOverallProgress(client, logs);
          if (newProgress !== client.progress) {
            updates.push({ id: client.id, progress: newProgress });
            return { ...client, progress: newProgress };
          }
          return client;
        });

        if (updates.length > 0) {
          setAllClients(updatedClients);
          // Persist to Supabase in background (fire-and-forget)
          for (const u of updates) {
            supabase.from('clients').update({ progress: u.progress }).eq('id', u.id).then();
          }
        }
      }).finally(() => {
        initialLoadDoneRef.current = true;
        setDataLoading(false);
        // Show onboarding for first-time coaches (no clients, not seen before)
        if (clientsList.length === 0 && !localStorage.getItem('fitcore-onboarding-done')) {
          setShowOnboarding(true);
        } else if (clientsList.length > 0) {
          // Coach has clients — mark onboarding as done so it never shows again
          localStorage.setItem('fitcore-onboarding-done', 'true');
        }
      });
    });
  }, [isLoggedIn]);

  // ── Realtime messages - subscribe to INSERT/UPDATE on messages table ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('coach-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Skip realtime events during initial load — load query will have the latest data
          if (!initialLoadDoneRef.current) return;
          const r = payload.new as Record<string, unknown>;
          const nameMap = new Map(clientsRef.current.map(c => [c.id, c.name]));
          const msg: Message = {
            id: r.id as string,
            clientId: r.client_id as string,
            clientName: nameMap.get(r.client_id as string) ?? '',
            clientAvatar: '',
            text: r.text as string,
            timestamp: r.timestamp as string,
            isRead: r.is_read as boolean,
            isFromCoach: r.is_from_coach as boolean,
            deliveryStatus: r.delivery_status as Message['deliveryStatus'],
          };
          // Only append if we don't already have it (avoids duplicating optimistic inserts)
          setAllMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          setAllMessages(prev => prev.map(m =>
            m.id === r.id
              ? { ...m, isRead: r.is_read as boolean, deliveryStatus: r.delivery_status as Message['deliveryStatus'] }
              : m
          ));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // ── Realtime check-ins — subscribe to INSERT/UPDATE on check_ins table ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('coach-checkins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins' },
        (payload) => {
          if (!initialLoadDoneRef.current) return;
          const r = payload.new as Record<string, unknown>;
          const nameMap = new Map(clientsRef.current.map(c => [c.id, c.name]));
          const ci: CheckIn = {
            id: r.id as string,
            clientId: r.client_id as string,
            clientName: nameMap.get(r.client_id as string) ?? '',
            date: r.date as string,
            status: r.status as CheckIn['status'],
            weight: r.weight as number | null,
            bodyFat: r.body_fat as number | null,
            waist: (r.waist as number | null) ?? null,
            hips: (r.hips as number | null) ?? null,
            chest: (r.chest as number | null) ?? null,
            bicep: (r.bicep as number | null) ?? null,
            thigh: (r.thigh as number | null) ?? null,
            mood: r.mood as CheckIn['mood'],
            energy: r.energy as number | null,
            stress: r.stress as number | null,
            sleepHours: r.sleep_hours as number | null,
            steps: r.steps as number | null,
            nutritionScore: r.nutrition_score as number | null,
            notes: (r.notes as string) ?? '',
            wins: (r.wins as string) ?? '',
            challenges: (r.challenges as string) ?? '',
            coachFeedback: (r.coach_feedback as string) ?? '',
            reviewStatus: r.review_status as CheckIn['reviewStatus'],
            flagReason: (r.flag_reason as string) ?? '',
            photos: [],
            followUpNotes: [],
          };
          setAllCheckIns(prev => prev.some(c => c.id === ci.id) ? prev : [ci, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'check_ins' },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          setAllCheckIns(prev => prev.map(ci =>
            ci.id === r.id
              ? {
                  ...ci,
                  status: r.status as CheckIn['status'],
                  weight: r.weight as number | null,
                  bodyFat: r.body_fat as number | null,
                  mood: r.mood as CheckIn['mood'],
                  energy: r.energy as number | null,
                  stress: r.stress as number | null,
                  sleepHours: r.sleep_hours as number | null,
                  steps: r.steps as number | null,
                  nutritionScore: r.nutrition_score as number | null,
                  notes: (r.notes as string) ?? '',
                  wins: (r.wins as string) ?? '',
                  challenges: (r.challenges as string) ?? '',
                  reviewStatus: r.review_status as CheckIn['reviewStatus'],
                }
              : ci
          ));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // ── Realtime workout logs — client logs workout, coach sees it instantly ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('coach-workout-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workout_logs' },
        (payload) => {
          if (!initialLoadDoneRef.current) return;
          const r = payload.new as Record<string, unknown>;
          const nameMap = new Map(clientsRef.current.map(c => [c.id, c.name]));
          const log: WorkoutLog = {
            id: r.id as string,
            clientId: r.client_id as string,
            clientName: nameMap.get(r.client_id as string) ?? '',
            type: r.type as string,
            duration: (r.duration as number) ?? 0,
            date: r.date as string,
            completed: (r.completed as boolean) ?? false,
          };
          setAllWorkoutLogs(prev => prev.some(l => l.id === log.id) ? prev : [log, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // ── Realtime workout set logs — for PR detection in Activity Feed ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('coach-set-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workout_set_logs' },
        (payload) => {
          if (!initialLoadDoneRef.current) return;
          const r = payload.new as Record<string, unknown>;
          const log: WorkoutSetLog = {
            id: r.id as string,
            date: r.date as string,
            clientId: r.client_id as string,
            exerciseId: r.exercise_id as string,
            exerciseName: r.exercise_name as string,
            setNumber: (r.set_number as number) ?? 0,
            reps: (r.reps as number) ?? 0,
            weight: (r.weight as string) ?? '',
            completed: (r.completed as boolean) ?? false,
            rpe: r.rpe as number | null | undefined,
          };
          setAllSetLogs(prev => prev.some(l => l.id === log.id) ? prev : [log, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // ── Realtime invoices — payment status changes (paid/overdue) ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('coach-invoices')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'invoices' },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          setAllInvoices(prev => prev.map(inv =>
            inv.id === r.id
              ? { ...inv, status: r.status as Invoice['status'], paidDate: (r.paid_date as string) ?? null }
              : inv
          ));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // ── Handlers ──

  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    // Merge updates into client, then recalculate progress if relevant fields changed
    const needsRecalc = updates.goalTargets !== undefined || updates.metrics !== undefined;
    let mergedClient: Client | undefined;

    setAllClients(prev => prev.map(c => {
      if (c.id !== id) return c;
      mergedClient = { ...c, ...updates };
      if (needsRecalc && mergedClient.status === 'active') {
        const newProgress = calculateOverallProgress(mergedClient, allWorkoutLogs);
        mergedClient = { ...mergedClient, progress: newProgress };
      }
      return mergedClient;
    }));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
    if (updates.nextCheckIn !== undefined) dbUpdates.next_check_in = updates.nextCheckIn || null;
    if (updates.monthlyRate !== undefined) dbUpdates.monthly_rate = updates.monthlyRate;
    if (updates.progress !== undefined && !needsRecalc) dbUpdates.progress = updates.progress;
    if (needsRecalc && mergedClient) dbUpdates.progress = mergedClient.progress;
    if (updates.height !== undefined) dbUpdates.height = updates.height;
    if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
    if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
    if (updates.goalTargets !== undefined) dbUpdates.goal_targets = updates.goalTargets;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updated_at = new Date().toISOString();
      const { error } = await supabase.from('clients').update(dbUpdates).eq('id', id);
      if (error) { console.error('handleUpdateClient failed:', error); showToast('Failed to update client.', 'error'); }
    }
  };

  const handleDeleteClient = async (id: string) => {
    const removed = allClients.find(c => c.id === id);
    setAllClients(prev => prev.filter(c => c.id !== id));
    // Clean up related records before deleting client
    await supabase.from('workout_set_logs').delete().eq('client_id', id);
    await supabase.from('workout_logs').delete().eq('client_id', id);
    await supabase.from('check_in_photos').delete().in('check_in_id',
      (await supabase.from('check_ins').select('id').eq('client_id', id)).data?.map(r => r.id) ?? []
    );
    await supabase.from('check_ins').delete().eq('client_id', id);
    await supabase.from('messages').delete().eq('client_id', id);
    await supabase.from('program_clients').delete().eq('client_id', id);
    await supabase.from('client_metrics').delete().eq('client_id', id);
    await supabase.from('invoices').delete().eq('client_id', id);
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error && removed) {
      setAllClients(prev => [...prev, removed]);
    }
  };

  const handleSendMessage = async (msg: Message) => {
    // Optimistic update
    setAllMessages(prev => [...prev, msg]);
    const { error } = await supabase.from('messages').insert({
      id: msg.id,
      client_id: msg.clientId,
      text: msg.text,
      timestamp: msg.timestamp,
      is_read: msg.isRead,
      is_from_coach: msg.isFromCoach,
      delivery_status: msg.deliveryStatus,
    });
    if (error) {
      console.error('handleSendMessage failed:', error); showToast('Failed to send message.', 'error');
      // Rollback optimistic update
      setAllMessages(prev => prev.filter(m => m.id !== msg.id));
    }
  };

  // ── Program helpers (internal) ──
  const saveProgramToDb = async (program: WorkoutProgram, coachId: string) => {
    const r1 = await supabase.from('workout_programs').upsert({
      id: program.id,
      coach_id: coachId,
      name: program.name,
      status: program.status,
      duration_weeks: program.durationWeeks,
      is_template: program.isTemplate,
      notes: program.notes || '',
      updated_at: new Date().toISOString(),
    });
    if (r1.error) { console.error('saveProgramToDb upsert:', r1.error); showToast('Failed to save program.', 'error'); }
    // Sync program_clients junction table
    await supabase.from('program_clients').delete().eq('program_id', program.id);
    if (program.clientIds.length > 0) {
      await supabase.from('program_clients').insert(
        program.clientIds.map(cid => ({ program_id: program.id, client_id: cid }))
      );
    }
    // Delete old days and re-insert (simplest approach for nested data)
    await supabase.from('workout_days').delete().eq('program_id', program.id);
    // Batch insert all days at once
    if (program.days.length > 0) {
      const dayRows = program.days.map((day, di) => ({
        id: day.id, program_id: program.id, name: day.name, day_order: di,
      }));
      const { error: daysError } = await supabase.from('workout_days').insert(dayRows);
      if (daysError) { console.error('saveProgramToDb days insert:', daysError); showToast('Failed to save program days.', 'error'); return; }
      // Batch insert all exercises across all days at once
      const exerciseRows = program.days.flatMap((day, _di) =>
        day.exercises.map((ex, ei) => ({
          id: ex.id, day_id: day.id, name: ex.name, sets: ex.sets, reps: ex.reps,
          weight: ex.weight, rpe: ex.rpe, tempo: ex.tempo, rest_seconds: ex.restSeconds,
          notes: ex.notes, exercise_order: ei,
        }))
      );
      if (exerciseRows.length > 0) {
        const { error: exError } = await supabase.from('exercises').insert(exerciseRows);
        if (exError) { console.error('saveProgramToDb exercises insert:', exError); showToast('Failed to save exercises.', 'error'); }
      }
    }
  };

  // ── Program handlers ──
  const handleAddProgram = async (program: WorkoutProgram) => {
    showToast(t.notifications.programSaved, 'success');
    setAllPrograms(prev => [...prev, program]);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgramToDb(program, user.id);
  };

  const handleUpdateProgram = async (id: string, updates: Partial<WorkoutProgram>) => {
    let updated: WorkoutProgram | null = null;
    setAllPrograms(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      updated = next.find(p => p.id === id) ?? null;
      return next;
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user && updated) await saveProgramToDb(updated, user.id);
  };

  const handleDeleteProgram = async (id: string) => {
    const removed = allPrograms.find(p => p.id === id);
    setAllPrograms(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('workout_programs').delete().eq('id', id);
    if (error) {
      console.error('handleDeleteProgram failed:', error); showToast('Failed to delete program.', 'error');
      if (removed) setAllPrograms(prev => [...prev, removed]);
    }
  };

  const handleDuplicateProgram = async (id: string) => {
    const source = allPrograms.find(p => p.id === id);
    if (!source) return;
    const now = new Date().toISOString().split('T')[0];
    const newProgram: WorkoutProgram = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      status: 'draft',
      clientIds: [],
      createdAt: now,
      updatedAt: now,
      days: source.days.map(d => ({
        ...d,
        id: crypto.randomUUID(),
        exercises: d.exercises.map(e => ({
          ...e,
          id: crypto.randomUUID(),
        })),
      })),
    };
    setAllPrograms(prev => [...prev, newProgram]);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgramToDb(newProgram, user.id);
  };

  // ── Invoice handlers ──
  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    if (updates.status === 'paid') {
      // Confetti only for first payment from this client
      const invoice = allInvoices.find(inv => inv.id === id);
      const clientHasPriorPayment = invoice && allInvoices.some(
        inv => inv.clientId === invoice.clientId && inv.status === 'paid' && inv.id !== id
      );
      if (!clientHasPriorPayment) {
        triggerConfetti();
      }
      const amt = updates.amount ?? invoice?.amount ?? 0;
      showToast(t.notifications.paymentReceived(`$${amt}`), 'success');
    }
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paidDate !== undefined) dbUpdates.paid_date = updates.paidDate;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('invoices').update(dbUpdates).eq('id', id);
      if (error) { console.error('handleUpdateInvoice failed:', error); showToast('Failed to update invoice.', 'error'); }
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    setAllInvoices(prev => prev.filter(inv => inv.id !== id));
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) console.error('handleDeleteInvoice failed:', error);
  };

  const handleAddInvoice = async (invoice: Invoice) => {
    setAllInvoices(prev => [...prev, invoice]);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('invoices').insert({
      id: invoice.id,
      client_id: invoice.clientId,
      coach_id: user?.id || null,
      amount: invoice.amount,
      status: invoice.status,
      due_date: invoice.dueDate || null,
      paid_date: invoice.paidDate || null,
      period: invoice.period,
      plan: invoice.plan,
    });
    if (error) {
      console.error('handleAddInvoice failed:', error); showToast('Failed to create invoice.', 'error');
      setAllInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      showToast('Failed to create invoice', 'error');
    } else {
      showToast('Invoice created & client notified', 'success');
      // Notify client via email (fire and forget)
      supabase.functions.invoke('notify-invoice', { body: { invoiceId: invoice.id } })
        .catch(() => { /* silent — email is best-effort */ });
    }
  };

  // ── Plan handlers ──
  const handleAddPlan = async (plan: CoachingPlan) => {
    setAllPlans(prev => [...prev, plan]);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('coaching_plans').insert({
      id: plan.id,
      coach_id: user?.id || null,
      name: plan.name,
      price: plan.price,
      billing_cycle: plan.billingCycle,
      description: plan.description || null,
      is_active: plan.isActive,
    });
    if (error) {
      console.error('handleAddPlan failed:', error); showToast('Failed to create plan.', 'error');
      setAllPlans(prev => prev.filter(p => p.id !== plan.id));
    }
  };

  const handleUpdatePlan = async (id: string, updates: Partial<CoachingPlan>) => {
    setAllPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.billingCycle !== undefined) dbUpdates.billing_cycle = updates.billingCycle;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updated_at = new Date().toISOString();
      const { error } = await supabase.from('coaching_plans').update(dbUpdates).eq('id', id);
      if (error) { console.error('handleUpdatePlan failed:', error); showToast('Failed to update plan.', 'error'); }
    }
  };

  const handleDeletePlan = async (id: string) => {
    const removed = allPlans.find(p => p.id === id);
    setAllPlans(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('coaching_plans').delete().eq('id', id);
    if (error) {
      console.error('handleDeletePlan failed:', error); showToast('Failed to delete plan.', 'error');
      if (removed) setAllPlans(prev => [...prev, removed]);
    }
  };

  // ── Check-in handlers ──
  const handleUpdateCheckIn = async (id: string, updates: Partial<CheckIn>) => {
    setAllCheckIns(prev => prev.map(ci => ci.id === id ? { ...ci, ...updates } : ci));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.bodyFat !== undefined) dbUpdates.body_fat = updates.bodyFat;
    if (updates.mood !== undefined) dbUpdates.mood = updates.mood;
    if (updates.energy !== undefined) dbUpdates.energy = updates.energy;
    if (updates.stress !== undefined) dbUpdates.stress = updates.stress;
    if (updates.sleepHours !== undefined) dbUpdates.sleep_hours = updates.sleepHours;
    if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
    if (updates.nutritionScore !== undefined) dbUpdates.nutrition_score = updates.nutritionScore;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.wins !== undefined) dbUpdates.wins = updates.wins;
    if (updates.challenges !== undefined) dbUpdates.challenges = updates.challenges;
    if (updates.coachFeedback !== undefined) dbUpdates.coach_feedback = updates.coachFeedback;
    if (updates.reviewStatus !== undefined) dbUpdates.review_status = updates.reviewStatus;
    if (updates.flagReason !== undefined) dbUpdates.flag_reason = updates.flagReason;
    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updated_at = new Date().toISOString();
      const { error } = await supabase.from('check_ins').update(dbUpdates).eq('id', id);
      if (error) { console.error('handleUpdateCheckIn failed:', error); showToast('Failed to update check-in.', 'error'); }
    }
  };

  const handleAddCheckIn = async (checkIn: CheckIn) => {
    setAllCheckIns(prev => [...prev, checkIn]);
    const { error } = await supabase.from('check_ins').insert({
      id: checkIn.id,
      client_id: checkIn.clientId,
      date: checkIn.date,
      status: checkIn.status,
      weight: checkIn.weight,
      body_fat: checkIn.bodyFat,
      mood: checkIn.mood,
      energy: checkIn.energy,
      stress: checkIn.stress,
      sleep_hours: checkIn.sleepHours,
      steps: checkIn.steps,
      nutrition_score: checkIn.nutritionScore,
      notes: checkIn.notes,
      wins: checkIn.wins,
      challenges: checkIn.challenges,
      coach_feedback: checkIn.coachFeedback,
      review_status: checkIn.reviewStatus,
      flag_reason: checkIn.flagReason,
    });
    if (error) {
      console.error('handleAddCheckIn failed:', error); showToast('Failed to create check-in.', 'error');
      setAllCheckIns(prev => prev.filter(ci => ci.id !== checkIn.id));
    }
  };

  // ── Build context value (memoized on data deps to reduce re-renders) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value: DataContextValue = useMemo(() => ({
    clients: allClients,
    messages: allMessages,
    programs: allPrograms,
    invoices: allInvoices,
    checkIns: allCheckIns,
    workoutLogs: allWorkoutLogs,
    setLogs: allSetLogs,
    plans: allPlans,
    dataLoading,
    showOnboarding,
    setShowOnboarding,
    confettiKey,
    triggerConfetti,

    profileName,
    profileEmail,
    profilePhoto,
    setProfileName,
    setProfileEmail,
    setProfilePhoto,

    appNotifications,
    setAppNotifications,
    notifications,
    setNotifications,

    updateClient: handleUpdateClient,
    deleteClient: handleDeleteClient,

    sendMessage: handleSendMessage,

    addProgram: handleAddProgram,
    updateProgram: handleUpdateProgram,
    deleteProgram: handleDeleteProgram,
    duplicateProgram: handleDuplicateProgram,

    updateInvoice: handleUpdateInvoice,
    deleteInvoice: handleDeleteInvoice,
    addInvoice: handleAddInvoice,

    addPlan: handleAddPlan,
    updatePlan: handleUpdatePlan,
    deletePlan: handleDeletePlan,

    updateCheckIn: handleUpdateCheckIn,
    addCheckIn: handleAddCheckIn,
  }), [
    allClients, allMessages, allPrograms, allInvoices, allCheckIns,
    allWorkoutLogs, allSetLogs, allPlans, dataLoading, showOnboarding,
    confettiKey, profileName, profileEmail, profilePhoto,
    appNotifications, notifications,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
