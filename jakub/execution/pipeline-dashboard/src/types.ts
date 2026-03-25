import {
  Search, Heart, MessageCircle, Phone, CheckCircle, XCircle, MessageSquare,
} from 'lucide-react'

// ─── Supabase Config ───
export const SUPABASE_URL = 'https://vawghpnaoimtplfimjrw.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_kexh4iFbuoEYrtHgNJbI3Q_Z19AMEwo'

// ─── Constants ───
export const DAILY_ENGAGE_LIMIT = 15

export type Account = 'jakub' | 'kamil'
export const ACCOUNTS: { key: Account; label: string; color: string }[] = [
  { key: 'jakub', label: 'Jakub', color: '#6366f1' },
  { key: 'kamil', label: 'Kamil', color: '#f59e0b' },
]

// ─── Types ───
export interface Lead {
  id: number
  instagram_handle: string
  full_name: string | null
  bio: string | null
  follower_count: number | null
  following_count: number | null
  post_count: number | null
  website: string | null
  is_business_account: boolean
  business_category: string | null
  is_verified: boolean
  likely_us: boolean
  score: number
  status: string
  followed_at: string | null
  engaged_at: string | null
  dmed_at: string | null
  follow_up_at: string | null
  notes: string | null
  dm_draft: string | null
  scraped_at: string | null
  created_at: string | null
  account: string | null
  engaged_by: string | null
  dmed_by: string | null
  touch_count: number
  touch1_at: string | null
  touch2_at: string | null
  touch3_at: string | null
  last_touch_at: string | null
}

export type PipelineStage = 'new' | 'warming' | 'warm' | 'dmed' | 'replied' | 'call_booked' | 'closed' | 'dead'
export type ViewMode = 'tasks' | 'pipeline'

export const STAGES: { key: PipelineStage; label: string; color: string; icon: typeof Search }[] = [
  { key: 'new', label: 'New Leads', color: '#8b92a5', icon: Search },
  { key: 'warming', label: 'Warming Up', color: '#6366f1', icon: Heart },
  { key: 'warm', label: 'Ready to DM', color: '#f59e0b', icon: MessageSquare },
  { key: 'dmed', label: 'DM Sent', color: '#fb923c', icon: MessageCircle },
  { key: 'replied', label: 'Replied', color: '#00e5c8', icon: MessageCircle },
  { key: 'call_booked', label: 'Call Booked', color: '#22c55e', icon: Phone },
  { key: 'closed', label: 'Closed', color: '#10b981', icon: CheckCircle },
  { key: 'dead', label: 'Dead', color: '#ef4444', icon: XCircle },
]

// ─── Supabase Helper ───
export async function supabaseFetch(endpoint: string, options?: RequestInit) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options?.headers || {}),
    },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Supabase ${resp.status}: ${text}`)
  }
  const text = await resp.text()
  return text ? JSON.parse(text) : null
}
