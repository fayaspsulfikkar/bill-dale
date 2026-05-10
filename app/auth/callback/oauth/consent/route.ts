import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * OAuth 2.1 PKCE consent callback — Supabase routes Google OAuth through
 * /auth/callback/oauth/consent when using the publishable key flow.
 * This handler exchanges the authorization code for a session, then
 * redirects to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Successfully authenticated — redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Auth failed — redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // No code present — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
