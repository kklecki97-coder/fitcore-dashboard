// Stub supabase client for demo - no real backend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noop = (..._args: any[]): any => ({
  data: null, error: null,
  eq: noop, select: noop, single: noop, order: noop,
  then: (fn: any) => Promise.resolve(fn({ data: null, error: null })),
});

export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: { id: 'demo-user' } }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    updateUser: async (..._args: any[]) => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async (..._args: any[]) => ({ data: null, error: null }),
  },
  from: (..._args: any[]) => ({
    select: noop,
    update: noop,
    insert: noop,
    delete: noop,
    upsert: noop,
  }),
  functions: {
    invoke: async (..._args: any[]) => ({ data: null, error: null }),
  },
  storage: {
    from: (..._args: any[]) => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
      list: async () => ({ data: [], error: null }),
    }),
  },
  removeChannel: () => {},
} as any;
