import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, CheckCircle, RefreshCw } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import ProgramPage from './components/ProgramPage';
import CheckInPage from './components/CheckInPage';
import MessagesPage from './components/MessagesPage';
import CalendarPage from './components/CalendarPage';
import ProgressPage from './components/ProgressPage';
import SettingsPage from './components/SettingsPage';
import InvoicesPage from './components/InvoicesPage';
import OnboardingPage from './components/OnboardingPage';
import useIsMobile from './hooks/useIsMobile';
import { useLang } from './i18n';
import { supabase } from './lib/supabase';
import { mockClient, mockCoachName, mockProgram, mockWorkoutLogs, mockCheckIns, mockMessages, mockSetLogs, mockWeeklySchedule } from './mockData';
import type { ClientPage, Theme, Client, Message, CheckIn, WorkoutSetLog, WorkoutProgram, WorkoutLog, WeeklySchedule, Invoice } from './types';

// Toggle this to true to bypass auth and use mock data for UI development
const USE_MOCK_DATA = false;

function App() {
  const { t } = useLang();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Password recovery state ──
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetUpdating, setResetUpdating] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // ── Auth: listen to Supabase session ──
  useEffect(() => {
    if (USE_MOCK_DATA) {
      setIsLoggedIn(true);
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('getSession failed:', error);
      setIsLoggedIn(!!session);
      setAuthLoading(false);

      // Check for password recovery from URL hash (cross-tab support - Fix #19)
      if (session && window.location.hash.includes('type=recovery')) {
        setShowResetPassword(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (_remember: boolean) => {
    // Session is handled by Supabase - onAuthStateChange fires automatically
  };

  const handleLogout = async () => {
    try { sessionStorage.removeItem('fitcore-client-page'); } catch { /* ignore */ }
    // Clear all data state so stale data doesn't flash on next login
    setClientUser(null);
    setCoachName('');
    setMyProgram(null);
    setSetLogs([]);
    setWorkoutLogs([]);
    setCheckIns([]);
    setMessages([]);
    setWeeklySchedule(null);
    await supabase.auth.signOut();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (resetNewPassword.length < 6) {
      setResetError(t.login.passwordMinReset);
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError(t.login.passwordMismatchReset);
      return;
    }

    setResetUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: resetNewPassword });

    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
    }
    setResetUpdating(false);
  };

  const handleCloseResetModal = () => {
    setShowResetPassword(false);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
    // Clean up URL hash if present
    if (window.location.hash.includes('type=recovery')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const [currentPage, _setCurrentPage] = useState<ClientPage>(() => {
    try {
      const saved = sessionStorage.getItem('fitcore-client-page');
      if (saved) return saved as ClientPage;
    } catch { /* ignore */ }
    return 'home';
  });
  const setCurrentPage = (page: ClientPage) => {
    _setCurrentPage(page);
    try { sessionStorage.setItem('fitcore-client-page', page); } catch { /* ignore */ }
    // Mark unread coach messages as read when opening messages
    if (page === 'messages') {
      const unreadIds = messages.filter(m => m.isFromCoach && !m.isRead).map(m => m.id);
      if (unreadIds.length > 0) {
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, isRead: true } : m));
        supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then();
      }
    }
  };
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-client-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // ── Data state (loaded from Supabase) ──
  const [clientUser, setClientUser] = useState<Client | null>(null);
  const [coachName, setCoachName] = useState('Your Coach');
  const [myProgram, setMyProgram] = useState<WorkoutProgram | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [setLogs, setSetLogs] = useState<WorkoutSetLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Fix #20: Longer toast duration (6s) and click-to-dismiss
  const showError = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 6000);
  };


  // ── Load all client data from Supabase on login ──
  const loadData = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('getUser failed:', userError);
      // Session is stale/invalid - sign out so user sees login page
      await supabase.auth.signOut();
      return false;
    }

    // Load the client row for this auth user
    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (clientError) {
      console.error('clients query failed:', clientError);
      return false;
    }
    if (!clientRow) return false;

    // Load client metrics (time series)
    const { data: metricsData, error: metricsError } = await supabase
      .from('client_metrics')
      .select('*')
      .eq('client_id', clientRow.id)
      .order('recorded_at');

    if (metricsError) console.error('client_metrics query failed:', metricsError);

    const metrics = {
      weight: (metricsData ?? []).filter(m => m.weight != null).map(m => Number(m.weight)),
      bodyFat: (metricsData ?? []).filter(m => m.body_fat != null).map(m => Number(m.body_fat)),
      benchPress: (metricsData ?? []).filter(m => m.bench_press != null).map(m => Number(m.bench_press)),
      squat: (metricsData ?? []).filter(m => m.squat != null).map(m => Number(m.squat)),
      deadlift: (metricsData ?? []).filter(m => m.deadlift != null).map(m => Number(m.deadlift)),
    };

    const client: Client = {
      id: clientRow.id,
      name: clientRow.name,
      avatar: '',
      email: clientRow.email ?? '',
      plan: clientRow.plan,
      status: clientRow.status,
      startDate: clientRow.start_date ?? '',
      nextCheckIn: clientRow.next_check_in ?? '',
      monthlyRate: clientRow.monthly_rate ?? 0,
      progress: clientRow.progress ?? 0,
      metrics,
      height: clientRow.height ?? null,
      goals: clientRow.goals ?? [],
      notes: clientRow.notes ?? '',
      lastActive: clientRow.last_active ?? '',
      streak: clientRow.streak ?? 0,
      onboarded: clientRow.onboarded ?? false,
    };
    setClientUser(client);

    // Load coach name
    const { data: coachRow, error: coachError } = await supabase
      .from('coaches')
      .select('name')
      .eq('id', clientRow.coach_id)
      .single();
    if (coachError) console.error('coaches query failed:', coachError);
    if (coachRow) setCoachName(coachRow.name);

    // Load assigned program (via program_clients junction)
    const { data: assignments, error: assignError } = await supabase
      .from('program_clients')
      .select('program_id')
      .eq('client_id', clientRow.id);

    if (assignError) console.error('program_clients query failed:', assignError);

    if (assignments && assignments.length > 0) {
      const programIds = assignments.map(a => a.program_id);
      const { data: programs, error: progError } = await supabase
        .from('workout_programs')
        .select('*, workout_days(*, exercises(*))')
        .in('id', programIds)
        .order('created_at', { ascending: false });

      if (progError) console.error('workout_programs query failed:', progError);

      if (programs && programs.length > 0) {
        const activeProgram = programs.find(p => p.status === 'active') ?? programs[0];
        setMyProgram({
          id: activeProgram.id,
          name: activeProgram.name,
          status: activeProgram.status,
          durationWeeks: activeProgram.duration_weeks,
          clientIds: [clientRow.id],
          isTemplate: activeProgram.is_template,
          createdAt: activeProgram.created_at?.split('T')[0] ?? '',
          updatedAt: activeProgram.updated_at?.split('T')[0] ?? '',
          days: (activeProgram.workout_days ?? [])
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
        });
      }
    }

    // Load check-ins
    const { data: checkInData, error: ciError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('client_id', clientRow.id)
      .order('date', { ascending: false });

    if (ciError) console.error('check_ins query failed:', ciError);

    if (checkInData) {
      // Load photos for all check-ins
      const checkInIds = checkInData.map(r => r.id);
      const { data: photoData } = checkInIds.length > 0
        ? await supabase.from('check_in_photos').select('*').in('check_in_id', checkInIds)
        : { data: [] };

      // Fix #1: Use signed URLs instead of public URLs for photos
      const photosByCheckIn: Record<string, { url: string; label: string }[]> = {};
      for (const p of (photoData ?? [])) {
        if (!photosByCheckIn[p.check_in_id]) photosByCheckIn[p.check_in_id] = [];
        let photoUrl = p.url;
        // If URL is a public Supabase storage URL, generate a signed one instead
        if (photoUrl && photoUrl.includes('/storage/v1/object/public/')) {
          const storagePath = photoUrl.split('/storage/v1/object/public/check-in-photos/')[1];
          if (storagePath) {
            const { data: signedData } = await supabase.storage
              .from('check-in-photos')
              .createSignedUrl(storagePath, 3600); // 1 hour expiry
            if (signedData?.signedUrl) photoUrl = signedData.signedUrl;
          }
        }
        photosByCheckIn[p.check_in_id].push({ url: photoUrl, label: p.label ?? '' });
      }

      setCheckIns(checkInData.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: clientRow.name,
        date: r.date,
        status: r.status,
        weight: r.weight,
        bodyFat: r.body_fat,
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
      })));
    }

    // Load messages
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientRow.id)
      .order('timestamp');

    if (msgError) console.error('messages query failed:', msgError);

    if (msgData) {
      setMessages(msgData.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: clientRow.name,
        clientAvatar: '',
        text: r.text,
        timestamp: r.timestamp,
        isRead: r.is_read,
        isFromCoach: r.is_from_coach,
      })));
      // Messages loaded - Realtime subscription handles new messages
    }

    // Load workout logs
    const { data: logData, error: logError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('client_id', clientRow.id)
      .order('date', { ascending: false });

    if (logError) console.error('workout_logs query failed:', logError);

    if (logData) {
      setWorkoutLogs(logData.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: clientRow.name,
        type: r.type,
        duration: r.duration ?? 0,
        date: r.date,
        completed: r.completed ?? false,
      })));
    }

    // Load workout set logs
    const { data: setLogData, error: slError } = await supabase
      .from('workout_set_logs')
      .select('*')
      .eq('client_id', clientRow.id)
      .order('date', { ascending: false });

    if (slError) console.error('workout_set_logs query failed:', slError);

    if (setLogData) {
      setSetLogs(setLogData.map(r => ({
        id: r.id,
        date: r.date,
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        setNumber: r.set_number,
        reps: r.reps,
        weight: r.weight ?? '',
        completed: r.completed ?? false,
        rpe: r.rpe,
      })));
    }

    // Load weekly schedule
    const nowDate = new Date();
    const nowDow = nowDate.getDay(); // 0=Sun
    const mondayOff = nowDow === 0 ? -6 : 1 - nowDow;
    const thisMonday = new Date(nowDate);
    thisMonday.setDate(nowDate.getDate() + mondayOff);
    const weekStartStr = thisMonday.toISOString().split('T')[0];

    const { data: schedRow } = await supabase
      .from('weekly_schedule')
      .select('*')
      .eq('client_id', clientRow.id)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    if (schedRow) {
      setWeeklySchedule({
        id: schedRow.id,
        clientId: schedRow.client_id,
        weekStart: schedRow.week_start,
        dayAssignments: schedRow.day_assignments ?? {},
      });
    } else {
      // No schedule for this week - find the most recent one (could be past or future)
      const { data: latestRow } = await supabase
        .from('weekly_schedule')
        .select('*')
        .eq('client_id', clientRow.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      setWeeklySchedule({
        id: latestRow?.id ?? '',
        clientId: clientRow.id,
        weekStart: weekStartStr,
        dayAssignments: latestRow?.day_assignments ?? {},
      });
    }

    // Load invoices
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientRow.id)
      .order('created_at', { ascending: false });

    if (invError) console.error('invoices query failed:', invError);

    if (invData) {
      setInvoices(invData.map(r => ({
        id: r.id,
        clientId: r.client_id,
        amount: r.amount,
        status: r.status,
        dueDate: r.due_date ?? '',
        paidDate: r.paid_date ?? null,
        period: r.period ?? '',
        plan: r.plan,
        paymentUrl: r.payment_url ?? null,
      })));
    }

    return true;
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (USE_MOCK_DATA) {
      setClientUser(mockClient);
      setCoachName(mockCoachName);
      setMyProgram(mockProgram);
      setWorkoutLogs(mockWorkoutLogs);
      setCheckIns(mockCheckIns);
      setMessages(mockMessages);
      setSetLogs(mockSetLogs);
      setWeeklySchedule(mockWeeklySchedule);
      return;
    }
    setDataLoading(true);
    setLoadError(false);
    loadData().then((success) => {
      if (!success) setLoadError(true);
    }).catch(() => {
      setLoadError(true);
    }).finally(() => setDataLoading(false));
  }, [isLoggedIn, loadData]);

  // Fix #21: Retry button for failed data loads
  const handleRetry = () => {
    setDataLoading(true);
    setLoadError(false);
    loadData().then((success) => {
      if (!success) setLoadError(true);
    }).catch(() => {
      setLoadError(true);
    }).finally(() => setDataLoading(false));
  };

  // ── Realtime messages - subscribe to INSERT/UPDATE on messages for this client ──
  const clientUserRef = useRef(clientUser);
  useEffect(() => { clientUserRef.current = clientUser; }, [clientUser]);

  useEffect(() => {
    if (!isLoggedIn || !clientUser) return;

    const channel = supabase
      .channel('client-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientUser.id}`,
        },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          const cu = clientUserRef.current;
          const msg: Message = {
            id: r.id as string,
            clientId: r.client_id as string,
            clientName: cu?.name ?? '',
            clientAvatar: '',
            text: r.text as string,
            timestamp: r.timestamp as string,
            isRead: r.is_read as boolean,
            isFromCoach: r.is_from_coach as boolean,
          };
          // Only append if we don't already have it (avoids duplicating optimistic inserts)
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientUser.id}`,
        },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          setMessages(prev => prev.map(m =>
            m.id === r.id ? { ...m, isRead: r.is_read as boolean } : m
          ));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn, clientUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-client-theme', theme);
  }, [theme]);

  // ── Handlers ──
  const handleSendMessage = async (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    const { error } = await supabase.from('messages').insert({
      id: msg.id,
      client_id: msg.clientId,
      text: msg.text,
      timestamp: msg.timestamp,
      is_read: msg.isRead,
      is_from_coach: msg.isFromCoach,
    });
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      showError(t.errors?.messageFailed ?? 'Failed to send message');
    }
  };

  const handleSubmitCheckIn = async (ci: CheckIn) => {
    setCheckIns(prev => [...prev, ci]);

    const { error } = await supabase.from('check_ins').insert({
      id: ci.id,
      client_id: ci.clientId,
      date: ci.date,
      status: ci.status,
      weight: ci.weight,
      body_fat: ci.bodyFat,
      mood: ci.mood,
      energy: ci.energy,
      stress: ci.stress,
      sleep_hours: ci.sleepHours,
      steps: ci.steps,
      nutrition_score: ci.nutritionScore,
      notes: ci.notes,
      wins: ci.wins,
      challenges: ci.challenges,
      coach_feedback: ci.coachFeedback,
      review_status: ci.reviewStatus,
      flag_reason: ci.flagReason,
    });

    if (error) {
      console.error('check_ins insert failed:', error);
      setCheckIns(prev => prev.filter(c => c.id !== ci.id));
      showError(t.errors?.checkInFailed ?? 'Failed to submit check-in');
      return;
    }

    // Sync weight & body_fat to client_metrics so HomePage picks them up
    if (ci.weight != null || ci.bodyFat != null) {
      const { error: metricsErr } = await supabase.from('client_metrics').insert({
        client_id: ci.clientId,
        recorded_at: ci.date,
        weight: ci.weight,
        body_fat: ci.bodyFat,
      });
      if (metricsErr) console.error('client_metrics sync failed:', metricsErr);
      else {
        // Update local state so UI refreshes without reload
        setClient(prev => {
          if (!prev) return prev;
          const newWeight = ci.weight != null ? [...prev.metrics.weight, ci.weight] : prev.metrics.weight;
          const newBodyFat = ci.bodyFat != null ? [...prev.metrics.bodyFat, ci.bodyFat] : prev.metrics.bodyFat;
          return { ...prev, metrics: { ...prev.metrics, weight: newWeight, bodyFat: newBodyFat } };
        });
      }
    }

    // Fix #1: Upload photos using signed URLs instead of public URLs
    const photosWithFiles = ci.photos.filter((p: { url: string; label: string; file?: File }) => p.file);
    for (const photo of photosWithFiles) {
      const file = (photo as { url: string; label: string; file: File }).file;
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${ci.clientId}/${ci.id}/${photo.label.replace(/\s+/g, '_')}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('check-in-photos')
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        console.error('Photo upload failed:', uploadErr);
        continue;
      }

      // Use signed URL instead of public URL
      const { data: signedData } = await supabase.storage
        .from('check-in-photos')
        .createSignedUrl(path, 3600);

      if (signedData?.signedUrl) {
        await supabase.from('check_in_photos').insert({
          check_in_id: ci.id,
          url: signedData.signedUrl,
          label: photo.label,
        });
      }
    }

    // Notify coach via email (fire-and-forget)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: ci.clientName,
          checkInDate: ci.date,
        }),
      }).catch(() => {}); // Silent - don't block check-in on email failure
    });
  };

  const handleLogWorkout = async (type: string, date: string) => {
    if (!clientUser) {
      showError('Failed to log workout');
      return;
    }
    const newLog: WorkoutLog = {
      id: crypto.randomUUID(),
      clientId: clientUser.id,
      clientName: clientUser.name,
      type,
      duration: 0,
      date,
      completed: true,
    };
    setWorkoutLogs(prev => [...prev, newLog]);
    if (USE_MOCK_DATA) return;
    const { error } = await supabase.from('workout_logs').insert({
      id: newLog.id,
      client_id: clientUser.id,
      type: newLog.type,
      duration: newLog.duration,
      date: newLog.date,
      completed: true,
    });
    if (error) {
      setWorkoutLogs(prev => prev.filter(l => l.id !== newLog.id));
      showError('Failed to log workout');
    }
  };

  const handleRemoveWorkout = async (type: string, date: string) => {
    const toRemove = workoutLogs.find(l => l.type === type && l.date === date && l.completed);
    if (!toRemove) return;
    setWorkoutLogs(prev => prev.filter(l => l.id !== toRemove.id));
    if (USE_MOCK_DATA) return;
    const { error } = await supabase.from('workout_logs').delete().eq('id', toRemove.id);
    if (error) {
      setWorkoutLogs(prev => [...prev, toRemove]);
      showError('Failed to remove workout log');
    }
  };

  const handleLogSet = async (log: WorkoutSetLog) => {
    if (!clientUser) {
      showError(t.errors?.workoutLogFailed ?? 'Failed to save workout log');
      return;
    }
    setSetLogs(prev => [...prev, log]);
    if (USE_MOCK_DATA) return;
    const { error } = await supabase.from('workout_set_logs').insert({
      id: log.id,
      client_id: clientUser.id,
      exercise_id: log.exerciseId,
      exercise_name: log.exerciseName,
      set_number: log.setNumber,
      reps: log.reps,
      weight: log.weight,
      completed: log.completed,
      rpe: log.rpe ?? null,
      date: log.date,
    });
    if (error) {
      setSetLogs(prev => prev.filter(l => l.id !== log.id));
      showError(t.errors?.workoutLogFailed ?? 'Failed to save workout log');
    }
  };

  const handleRemoveLog = async (exerciseId: string, setNumber: number, date: string) => {
    const toRemove = setLogs.find(l => l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date);
    if (!toRemove) return;
    setSetLogs(prev => prev.filter(l => !(l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date)));
    if (USE_MOCK_DATA) return;
    const { error } = await supabase.from('workout_set_logs').delete().eq('id', toRemove.id);
    if (error) {
      setSetLogs(prev => [...prev, toRemove]);
      showError(t.errors?.workoutLogFailed ?? 'Failed to remove workout log');
    }
  };

  const handleUpdateLog = async (exerciseId: string, setNumber: number, date: string, updates: Partial<WorkoutSetLog>) => {
    let updatedLog: WorkoutSetLog | null = null;
    let originalLog: WorkoutSetLog | null = null;
    setSetLogs(prev => prev.map(l => {
      if (l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date) {
        originalLog = l;
        updatedLog = { ...l, ...updates };
        return updatedLog;
      }
      return l;
    }));
    if (USE_MOCK_DATA || !updatedLog) return;
    if (updatedLog) {
      const u = updatedLog as WorkoutSetLog;
      const { error } = await supabase.from('workout_set_logs').update({
        reps: u.reps,
        weight: u.weight,
        completed: u.completed,
        rpe: u.rpe ?? null,
      }).eq('id', u.id);
      if (error) {
        if (originalLog) {
          setSetLogs(prev => prev.map(l => l.id === u.id ? originalLog! : l));
        }
        showError(t.errors?.workoutLogFailed ?? 'Failed to update workout log');
      }
    }
  };

  const handleUpdateSchedule = async (assignments: Record<string, string>) => {
    if (!clientUser) return;

    // Compute this Monday
    const nowDate = new Date();
    const nowDow = nowDate.getDay();
    const mondayOff = nowDow === 0 ? -6 : 1 - nowDow;
    const thisMonday = new Date(nowDate);
    thisMonday.setDate(nowDate.getDate() + mondayOff);
    const weekStartStr = thisMonday.toISOString().split('T')[0];

    // Optimistic update
    const prev = weeklySchedule;
    setWeeklySchedule(ws => ({
      id: ws?.id ?? '',
      clientId: clientUser.id,
      weekStart: weekStartStr,
      dayAssignments: assignments,
    }));

    const payload = {
      client_id: clientUser.id,
      week_start: weekStartStr,
      day_assignments: assignments,
    };

    let data: any = null;
    let error: any = null;

    if (prev?.id) {
      // Try update first
      const res = await supabase
        .from('weekly_schedule')
        .update({ day_assignments: assignments })
        .eq('id', prev.id)
        .select()
        .single();
      data = res.data;
      error = res.error;

      // If update failed (row gone), fall back to insert
      if (error) {
        console.warn('weekly_schedule update failed, trying insert:', error);
        const res2 = await supabase
          .from('weekly_schedule')
          .insert(payload)
          .select()
          .single();
        data = res2.data;
        error = res2.error;
      }
    } else {
      // Insert new row
      const res = await supabase
        .from('weekly_schedule')
        .insert(payload)
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('weekly_schedule save failed:', error);
      setWeeklySchedule(prev);
      showError('Failed to save schedule');
    } else if (data) {
      setWeeklySchedule({
        id: data.id,
        clientId: data.client_id,
        weekStart: data.week_start,
        dayAssignments: data.day_assignments ?? {},
      });
    }
  };

  const renderPage = () => {
    if (!clientUser) return null;

    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            client={clientUser}
            program={myProgram}
            workoutLogs={workoutLogs}
            checkIns={checkIns}
            messages={messages}
            coachName={coachName}
            onNavigate={setCurrentPage}
            weeklySchedule={weeklySchedule}
            onUpdateSchedule={handleUpdateSchedule}
          />
        );
      case 'program':
        return (
          <ProgramPage
            program={myProgram}
            setLogs={setLogs}
            onLogSet={handleLogSet}
            onLogWorkout={handleLogWorkout}
            onRemoveWorkout={handleRemoveWorkout}
            onRemoveLog={handleRemoveLog}
            onUpdateLog={handleUpdateLog}
            workoutLogs={workoutLogs}
            weeklySchedule={weeklySchedule}
          />
        );
      case 'check-in':
        return (
          <CheckInPage
            checkIns={checkIns}
            onSubmitCheckIn={handleSubmitCheckIn}
            clientId={clientUser.id}
            clientName={clientUser.name}
          />
        );
      case 'messages':
        return (
          <MessagesPage
            messages={messages}
            onSendMessage={handleSendMessage}
            coachName={coachName}
            clientId={clientUser.id}
            clientName={clientUser.name}
          />
        );
      case 'calendar':
        return (
          <CalendarPage
            program={myProgram}
            workoutLogs={workoutLogs}
            weeklySchedule={weeklySchedule}
            onUpdateSchedule={handleUpdateSchedule}
          />
        );
      case 'progress':
        return (
          <ProgressPage
            client={clientUser}
            workoutLogs={workoutLogs}
            checkIns={checkIns}
          />
        );
      case 'invoices':
        return (
          <InvoicesPage invoices={invoices} />
        );
      case 'settings':
        return (
          <SettingsPage
            client={clientUser}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
            onClientUpdate={(updates) => setClientUser(prev => prev ? { ...prev, ...updates } : null)}
            onNavigate={setCurrentPage}
          />
        );
      default:
        return null;
    }
  };

  // Fix #21: Show retry button when data load fails
  if (authLoading || dataLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>{dataLoading ? 'Loading data...' : 'Loading...'}</div>
      </div>
    );
  }

  if (loadError && !clientUser) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Failed to load data</div>
        <button
          onClick={handleRetry}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', border: 'none', borderRadius: '10px',
            background: 'var(--accent-primary)', color: '#07090e',
            fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} /> Retry
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px', border: '1px solid var(--border-primary)', borderRadius: '10px',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)',
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show onboarding for first-time clients
  if (clientUser && !clientUser.onboarded) {
    return (
      <OnboardingPage
        client={clientUser}
        onComplete={(updates) => setClientUser(prev => prev ? { ...prev, ...updates } : null)}
      />
    );
  }

  return (
    <ErrorBoundary>
    {/* Password Reset Modal - Fix #19: overlay always closeable */}
    {showResetPassword && (
      <div style={resetStyles.overlay} onClick={handleCloseResetModal}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={resetStyles.card}
          onClick={e => e.stopPropagation()}
        >
          {resetSuccess ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
              <h2 style={resetStyles.title}>{t.login.passwordUpdated}</h2>
              <button onClick={handleCloseResetModal} style={resetStyles.btn}>
                {t.login.backToLogin}
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Lock size={36} color="var(--accent-primary)" style={{ marginBottom: 12 }} />
                <h2 style={resetStyles.title}>{t.login.setNewPassword}</h2>
              </div>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={resetStyles.label}>{t.login.newPassword}</label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={resetStyles.input}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label style={resetStyles.label}>{t.login.confirmNewPassword}</label>
                  <input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={resetStyles.input}
                    required
                  />
                </div>
                {resetError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ color: 'var(--accent-danger)', fontSize: 13, fontWeight: 500, textAlign: 'center' }}
                  >
                    {resetError}
                  </motion.div>
                )}
                <button
                  type="submit"
                  disabled={resetUpdating}
                  style={{
                    ...resetStyles.btn,
                    opacity: resetUpdating ? 0.7 : 1,
                    cursor: resetUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resetUpdating ? t.login.updatingPassword : t.login.updatePassword}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    )}

    <div style={styles.app}>
      {/* Desktop side nav */}
      {!isMobile && (
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={false} onLogout={handleLogout} unreadCount={messages.filter(m => m.isFromCoach && !m.isRead).length} />
      )}

      <div style={styles.main}>
        <Header clientName={clientUser?.name ?? ''} currentPage={currentPage} onNavigate={setCurrentPage} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              ...styles.content,
              paddingBottom: isMobile ? 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' : '0px',
            }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={true} onLogout={handleLogout} unreadCount={messages.filter(m => m.isFromCoach && !m.isRead).length} />
      )}
    </div>

    {/* Error toast - Fix #20: click to dismiss, 6s timeout */}
    {toastError && (
      <div
        onClick={() => setToastError(null)}
        style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#dc2626', color: '#fff', padding: '12px 24px', borderRadius: 12,
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 9999, cursor: 'pointer',
        }}
      >
        {toastError}
      </div>
    )}
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    paddingBottom: '0px',
  },
};

const resetStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 32px',
    boxShadow: 'var(--shadow-elevated)',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    letterSpacing: '0.3px',
    textTransform: 'uppercase' as const,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: 12,
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
};

export default App;
