import db from '@/offline/db';
import { supabase } from '@/lib/supabase';

export async function logActivity(
  businessId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    const log = {
      id: crypto.randomUUID(),
      business_id: businessId,
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString(),
      synced: false,
    };

    await db.activity_logs.add(log);

    if (supabase) {
      const { error } = await supabase.from('activity_logs').insert({
        id: log.id,
        business_id: log.business_id,
        user_id: log.user_id,
        action: log.action,
        details: log.details,
        created_at: log.created_at,
      });
      if (!error) {
        await db.activity_logs.update(log.id, { synced: true });
      }
    }
  } catch (err) {
    // Non-critical — never throw from logger
    console.warn('[ActivityLogger] Failed to log:', err);
  }
}
