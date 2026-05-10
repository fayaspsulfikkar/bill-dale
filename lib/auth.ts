import { supabase } from '@/lib/supabase';

export const ADMIN_PERMISSIONS = [
  'can_view_dashboard',
  'can_manage_inventory',
  'can_view_reports',
  'can_manage_staff',
  'can_manage_settings',
  'can_process_billing',
  'can_view_activity_logs',
  'can_manage_branches',
];

export const STAFF_PERMISSIONS = ['can_process_billing'];

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getBusinessMembership(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('business_members')
    .select('*, businesses(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}
