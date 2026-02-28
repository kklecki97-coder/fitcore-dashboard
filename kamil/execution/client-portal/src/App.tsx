import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import ProgramPage from './components/ProgramPage';
import CheckInPage from './components/CheckInPage';
import ProgressPage from './components/ProgressPage';
import MessagesPage from './components/MessagesPage';
import useIsMobile from './hooks/useIsMobile';
import { supabase } from './lib/supabase';
import type { ClientPage, Theme, Client, Message, CheckIn, WorkoutSetLog, WorkoutProgram, WorkoutLog } from './types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Auth: listen to Supabase session ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (_remember: boolean) => {
    // Session is handled by Supabase — onAuthStateChange fires automatically
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [currentPage, setCurrentPage] = useState<ClientPage>('home');
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-client-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // ── Data state (loaded from Supabase) ──
  const [clientUser, setClientUser] = useState<Client | null>(null);
  const [coachName, setCoachName] = useState('Your Coach');
  const [myProgram, setMyProgram] = useState<WorkoutProgram | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [setLogs, setSetLogs] = useState<WorkoutSetLog[]>([]);

  // ── Load all client data from Supabase on login ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load the client row for this auth user
      const { data: clientRow } = await supabase
        .from('clients')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (!clientRow) return;

      // Load client metrics (time series)
      const { data: metricsData } = await supabase
        .from('client_metrics')
        .select('*')
        .eq('client_id', clientRow.id)
        .order('recorded_at');

      const metrics = {
        weight: (metricsData ?? []).filter(m => m.weight != null).map(m => m.weight as number),
        bodyFat: (metricsData ?? []).filter(m => m.body_fat != null).map(m => m.body_fat as number),
        benchPress: (metricsData ?? []).filter(m => m.bench_press != null).map(m => m.bench_press as number),
        squat: (metricsData ?? []).filter(m => m.squat != null).map(m => m.squat as number),
        deadlift: (metricsData ?? []).filter(m => m.deadlift != null).map(m => m.deadlift as number),
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
        goals: clientRow.goals ?? [],
        notes: clientRow.notes ?? '',
        lastActive: clientRow.last_active ?? '',
        streak: clientRow.streak ?? 0,
      };
      setClientUser(client);

      // Load coach name
      const { data: coachRow } = await supabase
        .from('coaches')
        .select('name')
        .eq('id', clientRow.coach_id)
        .single();
      if (coachRow) setCoachName(coachRow.name);

      // Load assigned program (via program_clients junction)
      const { data: assignments } = await supabase
        .from('program_clients')
        .select('program_id')
        .eq('client_id', clientRow.id);

      if (assignments && assignments.length > 0) {
        // Get the first active program, or the most recently assigned
        const programIds = assignments.map(a => a.program_id);
        const { data: programs } = await supabase
          .from('workout_programs')
          .select('*, workout_days(*, exercises(*))')
          .in('id', programIds)
          .order('created_at', { ascending: false });

        if (programs && programs.length > 0) {
          // Prefer active program
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
      const { data: checkInData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('client_id', clientRow.id)
        .order('date', { ascending: false });

      if (checkInData) {
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
          photos: [],
        })));
      }

      // Load messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', clientRow.id)
        .order('timestamp');

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
          channel: r.channel,
        })));
      }

      // Load workout logs
      const { data: logData } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('client_id', clientRow.id)
        .order('date', { ascending: false });

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
    };

    loadData();
  }, [isLoggedIn]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-client-theme', theme);
  }, [theme]);

  // ── Handlers ──
  const handleSendMessage = async (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    await supabase.from('messages').insert({
      id: msg.id,
      client_id: msg.clientId,
      text: msg.text,
      timestamp: msg.timestamp,
      is_read: msg.isRead,
      is_from_coach: msg.isFromCoach,
      channel: msg.channel,
    });
  };

  const handleSubmitCheckIn = async (ci: CheckIn) => {
    setCheckIns(prev => [...prev, ci]);
    await supabase.from('check_ins').insert({
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
  };

  // Set logs stay local (session-specific workout tracking)
  const handleLogSet = (log: WorkoutSetLog) => {
    setSetLogs(prev => [...prev, log]);
  };

  const handleRemoveLog = (exerciseId: string, setNumber: number, date: string) => {
    setSetLogs(prev => prev.filter(l => !(l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date)));
  };

  const handleUpdateLog = (exerciseId: string, setNumber: number, date: string, updates: Partial<WorkoutSetLog>) => {
    setSetLogs(prev => prev.map(l =>
      l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date
        ? { ...l, ...updates }
        : l
    ));
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
          />
        );
      case 'program':
        return (
          <ProgramPage
            program={myProgram}
            setLogs={setLogs}
            onLogSet={handleLogSet}
            onRemoveLog={handleRemoveLog}
            onUpdateLog={handleUpdateLog}
            workoutLogs={workoutLogs}
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
      case 'progress':
        return (
          <ProgressPage
            client={clientUser}
            workoutLogs={workoutLogs}
            checkIns={checkIns}
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
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
    <div style={styles.app}>
      {/* Desktop side nav */}
      {!isMobile && (
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={false} onLogout={handleLogout} />
      )}

      <div style={styles.main}>
        <Header clientName={clientUser?.name ?? ''} theme={theme} onThemeChange={setTheme} />

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
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={true} onLogout={handleLogout} />
      )}
    </div>
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

export default App;
