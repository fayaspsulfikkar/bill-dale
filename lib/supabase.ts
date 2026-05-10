// Singleton browser client — only used in Client Components.
// For Server Components and Route Handlers, import from utils/supabase/server.ts instead.
'use client';

let _client: ReturnType<typeof import('@/utils/supabase/client').createClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') return null;
  if (!_client) {
    const { createClient } = require('@/utils/supabase/client');
    _client = createClient();
  }
  return _client;
}

// Legacy compat export — use getSupabaseClient() in new code
export const supabase = typeof window !== 'undefined'
  ? (() => {
      const { createClient } = require('@/utils/supabase/client');
      return createClient();
    })()
  : null;
