export interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  plan: 'Basic' | 'Premium' | 'Elite';
  status: 'active' | 'paused' | 'new';
  startDate: string;
  nextCheckIn: string;
  monthlyRate: number;
  progress: number;
  metrics: {
    weight: number[];
    bodyFat: number[];
    benchPress: number[];
    squat: number[];
    deadlift: number[];
  };
  goals: string[];
  notes: string;
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

export type Page = 'overview' | 'clients' | 'client-detail' | 'add-client' | 'messages' | 'analytics' | 'schedule' | 'settings';

export type Theme = 'dark' | 'light';
