import { useState, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './components/OverviewPage';
import ClientsPage from './components/ClientsPage';
import ClientDetailPage from './components/ClientDetailPage';
import MessagesPage from './components/MessagesPage';
import AnalyticsPage from './components/AnalyticsPage';
import SchedulePage from './components/SchedulePage';
import SettingsPage from './components/SettingsPage';
import AddClientPage from './components/AddClientPage';
import WorkoutProgramsPage from './components/WorkoutProgramsPage';
import ProgramBuilderPage from './components/ProgramBuilderPage';
import PaymentsPage from './components/PaymentsPage';
import CheckInsPage from './components/CheckInsPage';
import LoginPage from './components/LoginPage';
import useIsMobile from './hooks/useIsMobile';
import { exerciseLibrary, workoutLogs } from './data';
import { supabase } from './lib/supabase';
import type { Page, Theme, Client, Message, WorkoutProgram, Invoice, CheckIn, AppNotification } from './types';

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

  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [previousPage, setPreviousPage] = useState<Page>('clients');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // ── Shared state lifted from child pages ──
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [allPrograms, setAllPrograms] = useState<WorkoutProgram[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);

  // ── Load data from Supabase on login ──
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadClients = async () => {
      const { data } = await supabase.from('clients').select('*').order('created_at');
      if (data) {
        setAllClients(data.map(r => ({
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
          notes: r.notes ?? '',
          metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
          notesHistory: [],
          activityLog: [],
          lastActive: r.last_active ?? '',
        })));
      }
    };

    const loadMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('timestamp');
      if (data) {
        setAllMessages(data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: allClients.find(c => c.id === r.client_id)?.name ?? '',
          clientAvatar: '',
          text: r.text,
          timestamp: r.timestamp,
          isRead: r.is_read,
          isFromCoach: r.is_from_coach,
          channel: r.channel,
          deliveryStatus: r.delivery_status,
        })));
      }
    };

    const loadInvoices = async () => {
      const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (data) {
        setAllInvoices(data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: allClients.find(c => c.id === r.client_id)?.name ?? '',
          amount: r.amount,
          status: r.status,
          dueDate: r.due_date ?? '',
          paidDate: r.paid_date ?? null,
          period: r.period ?? '',
          plan: r.plan,
        })));
      }
    };

    const loadCheckIns = async () => {
      const { data } = await supabase.from('check_ins').select('*').order('date', { ascending: false });
      if (data) {
        setAllCheckIns(data.map(r => ({
          id: r.id,
          clientId: r.client_id,
          clientName: allClients.find(c => c.id === r.client_id)?.name ?? '',
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
          followUpNotes: [],
        })));
      }
    };

    const loadPrograms = async () => {
      const { data } = await supabase
        .from('workout_programs')
        .select(`*, workout_days(*, exercises(*))`)
        .order('created_at');
      if (data) {
        setAllPrograms(data.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          durationWeeks: p.duration_weeks,
          clientIds: [],
          isTemplate: p.is_template,
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

    loadClients().then(() => {
      loadMessages();
      loadInvoices();
      loadCheckIns();
      loadPrograms();
    });
  }, [isLoggedIn]);

  // @ts-ignore — scaffolded for schedule features
  const todayKey = new Date().toISOString().split('T')[0];
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, { time: string; client: string; type: string; status: 'completed' | 'upcoming' | 'current'; duration: number }[]>>({});

  // Settings state
  const [profileName, setProfileName] = useState('Coach Kamil');
  const [profileEmail, setProfileEmail] = useState('kamil@fitcore.io');
  const [notifications, setNotifications] = useState({
    messages: true,
    checkins: true,
    payments: true,
    weekly: false,
  });

  // App notifications (bell icon)
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(() => {
    const now = Date.now();
    return [
      { id: 'n1', type: 'message', title: 'New message from Marcus Johnson', description: 'Hey coach, I hit a new PR on bench today! 225lbs!', timestamp: new Date(now - 5 * 60000).toISOString(), isRead: false, clientId: 'c1', targetPage: 'messages' as const },
      { id: 'n2', type: 'checkin', title: 'Sarah Chen submitted a check-in', description: 'Weekly check-in completed — all metrics updated', timestamp: new Date(now - 35 * 60000).toISOString(), isRead: false, clientId: 'c2', targetPage: 'check-ins' as const },
      { id: 'n3', type: 'payment', title: 'Payment received — $150', description: 'David Park paid invoice #INV-2024-012', timestamp: new Date(now - 2 * 3600000).toISOString(), isRead: false, clientId: 'c3', targetPage: 'payments' as const },
      { id: 'n4', type: 'program', title: "Alex Rivera's program starts tomorrow", description: 'Hypertrophy Phase 2 — 4 days/week begins Monday', timestamp: new Date(now - 4 * 3600000).toISOString(), isRead: false, clientId: 'c4', targetPage: 'programs' as const },
      { id: 'n5', type: 'message', title: 'New message from Emma Wilson', description: "Can we reschedule Thursday's session?", timestamp: new Date(now - 8 * 3600000).toISOString(), isRead: true, clientId: 'c5', targetPage: 'messages' as const },
      { id: 'n6', type: 'checkin', title: 'Lisa Thompson missed check-in', description: 'Weekly check-in was due yesterday — no submission', timestamp: new Date(now - 24 * 3600000).toISOString(), isRead: true, clientId: 'c6', targetPage: 'check-ins' as const },
      { id: 'n7', type: 'payment', title: 'Payment overdue — $200', description: 'Mike Chen invoice #INV-2024-009 is 5 days overdue', timestamp: new Date(now - 48 * 3600000).toISOString(), isRead: true, clientId: 'c7', targetPage: 'payments' as const },
      { id: 'n8', type: 'client', title: 'Welcome to FitCore!', description: 'Your dashboard is set up and ready to go', timestamp: new Date(now - 72 * 3600000).toISOString(), isRead: true, targetPage: 'overview' as const },
    ];
  });

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
          title: `New message from ${client?.name || 'Client'}`,
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
          title: `${ci.clientName} submitted a check-in`,
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
          title: `New invoice — $${inv.amount}`,
          description: `${inv.clientName} — ${inv.period}`,
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
  }, [allMessages, allCheckIns, allInvoices, allClients]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-theme', theme);
  }, [theme]);

  // Close sidebar on navigation (mobile)
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const PAGE_LABELS: Record<Page, string> = {
    'overview': 'Overview',
    'clients': 'Clients',
    'client-detail': 'Clients',
    'add-client': 'Clients',
    'messages': 'Messages',
    'analytics': 'Analytics',
    'schedule': 'Schedule',
    'settings': 'Settings',
    'programs': 'Programs',
    'program-builder': 'Programs',
    'payments': 'Payments',
    'check-ins': 'Check-Ins',
  };

  const handleViewClient = (id: string) => {
    setPreviousPage(currentPage);
    setSelectedClientId(id);
    setCurrentPage('client-detail');
  };

  const handleBackFromClient = () => {
    setCurrentPage(previousPage);
    setSelectedClientId('');
  };

  const handleAddClient = () => {
    setCurrentPage('add-client');
  };

  const handleSaveNewClient = async (client: Client): Promise<{ tempPassword?: string; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // 1. Insert client row
    const { error: insertError } = await supabase.from('clients').insert({
      id: client.id,
      coach_id: user.id,
      name: client.name,
      email: client.email,
      plan: client.plan,
      status: client.status,
      start_date: client.startDate || null,
      next_check_in: client.nextCheckIn || null,
      monthly_rate: client.monthlyRate,
      progress: client.progress,
      height: client.height,
      streak: client.streak,
      goals: client.goals,
      notes: client.notes,
    });

    if (insertError) return { error: insertError.message };
    setAllClients(prev => [...prev, client]);

    // 2. Call Edge Function to create auth user for client
    if (client.email) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-client`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                clientId: client.id,
                email: client.email,
                name: client.name,
              }),
            }
          );
          const result = await res.json();
          if (result.success) {
            return { tempPassword: result.tempPassword };
          }
          // Edge Function error — client is saved but no auth account
          return { error: result.error || 'Failed to create login credentials' };
        } catch {
          return { error: 'Failed to connect to invitation service' };
        }
      }
    }

    return {};
  };

  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    setAllClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
    if (updates.nextCheckIn !== undefined) dbUpdates.next_check_in = updates.nextCheckIn || null;
    if (updates.monthlyRate !== undefined) dbUpdates.monthly_rate = updates.monthlyRate;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.height !== undefined) dbUpdates.height = updates.height;
    if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
    if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updated_at = new Date().toISOString();
      await supabase.from('clients').update(dbUpdates).eq('id', id);
    }
  };

  const handleDeleteClient = async (id: string) => {
    setAllClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('clients').delete().eq('id', id);
  };

  const handleSendMessage = async (msg: Message) => {
    setAllMessages(prev => [...prev, msg]);
    await supabase.from('messages').insert({
      id: msg.id,
      client_id: msg.clientId,
      text: msg.text,
      timestamp: msg.timestamp,
      is_read: msg.isRead,
      is_from_coach: msg.isFromCoach,
      channel: msg.channel,
      delivery_status: msg.deliveryStatus,
    });
  };

  // ── Program helpers ──
  const saveProgramToDb = async (program: WorkoutProgram, coachId: string) => {
    await supabase.from('workout_programs').upsert({
      id: program.id,
      coach_id: coachId,
      name: program.name,
      status: program.status,
      duration_weeks: program.durationWeeks,
      is_template: program.isTemplate,
      updated_at: new Date().toISOString(),
    });
    // Delete old days and re-insert (simplest approach for nested data)
    await supabase.from('workout_days').delete().eq('program_id', program.id);
    for (let di = 0; di < program.days.length; di++) {
      const day = program.days[di];
      await supabase.from('workout_days').insert({ id: day.id, program_id: program.id, name: day.name, day_order: di });
      for (let ei = 0; ei < day.exercises.length; ei++) {
        const ex = day.exercises[ei];
        await supabase.from('exercises').insert({
          id: ex.id, day_id: day.id, name: ex.name, sets: ex.sets, reps: ex.reps,
          weight: ex.weight, rpe: ex.rpe, tempo: ex.tempo, rest_seconds: ex.restSeconds,
          notes: ex.notes, exercise_order: ei,
        });
      }
    }
  };

  // ── Program handlers ──
  const handleAddProgram = async (program: WorkoutProgram) => {
    setAllPrograms(prev => [...prev, program]);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgramToDb(program, user.id);
  };

  const handleUpdateProgram = async (id: string, updates: Partial<WorkoutProgram>) => {
    setAllPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const updated = { ...allPrograms.find(p => p.id === id)!, ...updates };
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgramToDb(updated, user.id);
  };

  const handleDeleteProgram = async (id: string) => {
    setAllPrograms(prev => prev.filter(p => p.id !== id));
    await supabase.from('workout_programs').delete().eq('id', id);
  };

  const handleDuplicateProgram = async (id: string) => {
    const source = allPrograms.find(p => p.id === id);
    if (!source) return;
    const now = new Date().toISOString().split('T')[0];
    const newProgram: WorkoutProgram = {
      ...source,
      id: `wp${Date.now()}`,
      name: `${source.name} (Copy)`,
      status: 'draft',
      clientIds: [],
      createdAt: now,
      updatedAt: now,
      days: source.days.map(d => ({
        ...d,
        id: `wd${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exercises: d.exercises.map(e => ({
          ...e,
          id: `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      })),
    };
    setAllPrograms(prev => [...prev, newProgram]);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgramToDb(newProgram, user.id);
  };

  // ── Invoice handlers ──
  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paidDate !== undefined) dbUpdates.paid_date = updates.paidDate;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('invoices').update(dbUpdates).eq('id', id);
    }
  };

  const handleAddInvoice = async (invoice: Invoice) => {
    setAllInvoices(prev => [...prev, invoice]);
    await supabase.from('invoices').insert({
      id: invoice.id,
      client_id: invoice.clientId,
      amount: invoice.amount,
      status: invoice.status,
      due_date: invoice.dueDate || null,
      paid_date: invoice.paidDate || null,
      period: invoice.period,
      plan: invoice.plan,
    });
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
      await supabase.from('check_ins').update(dbUpdates).eq('id', id);
    }
  };

  const handleAddCheckIn = async (checkIn: CheckIn) => {
    setAllCheckIns(prev => [...prev, checkIn]);
    await supabase.from('check_ins').insert({
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
  };

  const handleViewProgram = (id: string) => {
    setPreviousPage(currentPage);
    setSelectedProgramId(id);
    setCurrentPage('program-builder');
  };

  const handleBackFromProgram = () => {
    setCurrentPage(previousPage);
    setSelectedProgramId('');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage clients={allClients} messages={allMessages} programs={allPrograms} onViewClient={handleViewClient} onNavigate={handleNavigate} />;
      case 'clients':
        return (
          <ClientsPage
            clients={allClients}
            programs={allPrograms}
            onViewClient={handleViewClient}
            onAddClient={handleAddClient}
            onNavigate={handleNavigate}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        );
      case 'add-client':
        return <AddClientPage onBack={() => setCurrentPage('clients')} onSave={handleSaveNewClient} />;
      case 'client-detail':
        return (
          <ClientDetailPage
            clientId={selectedClientId}
            clients={allClients}
            programs={allPrograms}
            workoutLogs={workoutLogs}
            checkIns={allCheckIns}
            onBack={handleBackFromClient}
            backLabel={`Back to ${PAGE_LABELS[previousPage]}`}
            onUpdateClient={handleUpdateClient}
            onSendMessage={handleSendMessage}
            onUpdateProgram={handleUpdateProgram}
            onUpdateCheckIn={handleUpdateCheckIn}
            onAddCheckIn={handleAddCheckIn}
          />
        );
      case 'messages':
        return <MessagesPage isMobile={isMobile} clients={allClients} messages={allMessages} onSendMessage={handleSendMessage} />;
      case 'analytics':
        return <AnalyticsPage clients={allClients} invoices={allInvoices} workoutLogs={workoutLogs} checkIns={allCheckIns} onViewClient={handleViewClient} />;
      case 'programs':
        return (
          <WorkoutProgramsPage
            programs={allPrograms}
            clients={allClients}
            onViewProgram={handleViewProgram}
            onAddProgram={() => { setSelectedProgramId(''); setCurrentPage('program-builder'); }}
            onDeleteProgram={handleDeleteProgram}
            onDuplicateProgram={handleDuplicateProgram}
            onUpdateProgram={handleUpdateProgram}
          />
        );
      case 'program-builder':
        return (
          <ProgramBuilderPage
            program={selectedProgramId ? allPrograms.find(p => p.id === selectedProgramId) || null : null}
            clients={allClients}
            exerciseLibrary={exerciseLibrary}
            onSave={(program: WorkoutProgram) => {
              if (allPrograms.find(p => p.id === program.id)) {
                handleUpdateProgram(program.id, program);
              } else {
                handleAddProgram(program);
              }
              setCurrentPage(previousPage);
              setSelectedProgramId('');
            }}
            onBack={handleBackFromProgram}
            backLabel={`Back to ${PAGE_LABELS[previousPage]}`}
          />
        );
      case 'payments':
        return (
          <PaymentsPage
            clients={allClients}
            invoices={allInvoices}
            onUpdateInvoice={handleUpdateInvoice}
            onAddInvoice={handleAddInvoice}
            onViewClient={handleViewClient}
          />
        );
      case 'check-ins':
        return (
          <CheckInsPage
            clients={allClients}
            checkIns={allCheckIns}
            onUpdateCheckIn={handleUpdateCheckIn}
            onViewClient={handleViewClient}
            onNavigate={handleNavigate}
          />
        );
      case 'schedule':
        return <SchedulePage clients={allClients} programs={allPrograms} sessionsByDate={sessionsByDate} onSessionsChange={setSessionsByDate} onViewClient={handleViewClient} />;
      case 'settings':
        return (
          <SettingsPage
            theme={theme}
            onThemeChange={setTheme}
            profileName={profileName}
            profileEmail={profileEmail}
            onProfileChange={(name, email) => { setProfileName(name); setProfileEmail(email); }}
            notifications={notifications}
            onNotificationsChange={setNotifications}
          />
        );
      default:
        return <OverviewPage clients={allClients} messages={allMessages} programs={allPrograms} onViewClient={handleViewClient} onNavigate={handleNavigate} />;
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
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — always rendered, slide on mobile */}
      <div style={{
        ...styles.sidebarWrap,
        ...(isMobile ? {
          position: 'fixed',
          left: sidebarOpen ? 0 : '-280px',
          top: 0,
          bottom: 0,
          width: '280px',
          zIndex: 50,
          transition: 'left 0.25s ease',
        } : {}),
      }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          profileName={profileName}
          onLogout={handleLogout}
        />
      </div>

      <div style={styles.main}>
        <Header
          currentPage={currentPage}
          isMobile={isMobile}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          notifications={appNotifications}
          onMarkRead={(id) => setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
          onMarkAllRead={() => setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
          onNotificationClick={(notif) => {
            setAppNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            if (notif.targetPage) handleNavigate(notif.targetPage);
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + selectedClientId + selectedProgramId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={styles.content}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>
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
  sidebarWrap: {},
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
};

export default App;
