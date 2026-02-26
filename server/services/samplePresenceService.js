import { supabase } from '../config/supabase.js';

const PRESENCE_TTL_SECONDS = 25;
const ACTIVE_LOCK_TYPES = ['sample_edit', 'stage_edit'];

function isoAfterSeconds(seconds) {
  return new Date(Date.now() + (seconds * 1000)).toISOString();
}

export function normalizeLockType(lockType) {
  const value = String(lockType || '').trim().toLowerCase();
  if (!value) return null;
  if (ACTIVE_LOCK_TYPES.includes(value)) return value;
  return null;
}

export function normalizeContext(context) {
  const value = String(context || '').trim().toLowerCase();
  if (!value) return 'view';
  if (value === 'sample_list' || value === 'sample_edit' || value === 'stage_edit' || value === 'view') {
    return value;
  }
  return 'view';
}

export async function upsertSamplePresence({
  sampleId,
  userId,
  username,
  fullName,
  roleCode,
  context,
  lockType,
}) {
  const normalizedLockType = normalizeLockType(lockType);
  const normalizedContext = normalizeContext(context);
  const expiresAt = isoAfterSeconds(PRESENCE_TTL_SECONDS);

  const { error } = await supabase
    .from('sample_presence')
    .upsert(
      {
        sample_id: String(sampleId),
        user_id: Number(userId),
        username: username ? String(username).trim() : null,
        full_name: fullName ? String(fullName).trim() : null,
        role_code: roleCode ? String(roleCode).trim().toUpperCase() : null,
        context: normalizedContext,
        lock_type: normalizedLockType,
        last_seen_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'sample_id,user_id,context' }
    );

  if (error) throw error;
  return { expires_at: expiresAt };
}

export async function releaseSamplePresence({ sampleId, userId, context = null }) {
  let query = supabase
    .from('sample_presence')
    .delete()
    .eq('sample_id', String(sampleId))
    .eq('user_id', Number(userId));

  if (context) {
    query = query.eq('context', normalizeContext(context));
  }

  const { error } = await query;
  if (error) throw error;
}

export async function listActiveSamplePresence(sampleIds) {
  const normalizedIds = Array.from(new Set((sampleIds || []).map((id) => String(id).trim()).filter(Boolean)));
  if (normalizedIds.length === 0) return {};

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('sample_presence')
    .select('sample_id,user_id,username,full_name,role_code,context,lock_type,last_seen_at,expires_at')
    .in('sample_id', normalizedIds)
    .gt('expires_at', nowIso)
    .order('last_seen_at', { ascending: false });

  if (error) throw error;

  const grouped = {};
  for (const row of data || []) {
    if (!grouped[row.sample_id]) grouped[row.sample_id] = [];
    grouped[row.sample_id].push({
      user_id: row.user_id,
      username: row.username,
      full_name: row.full_name,
      role_code: row.role_code,
      context: row.context,
      lock_type: row.lock_type,
      last_seen_at: row.last_seen_at,
    });
  }
  return grouped;
}

export async function findConflictingSampleLock({ sampleId, userId }) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('sample_presence')
    .select('user_id,username,full_name,role_code,context,lock_type,last_seen_at,expires_at')
    .eq('sample_id', String(sampleId))
    .neq('user_id', Number(userId))
    .in('lock_type', ACTIVE_LOCK_TYPES)
    .gt('expires_at', nowIso)
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}
