// Stub supabase client for demo - no real backend
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: { id: 'demo-user' } }, error: null }),
    updateUser: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ data: null, error: null }) }),
    delete: () => ({ eq: () => ({ data: null, error: null }) }),
    upsert: async () => ({ data: null, error: null }),
  }),
  functions: {
    invoke: async () => ({ data: null, error: null }),
  },
};
