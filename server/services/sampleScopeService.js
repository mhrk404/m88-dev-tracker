import { supabase } from '../config/supabase.js';

/**
 * For specific roles (FTY, Brand, etc.): return sample IDs where the user is tagged in team_assignment
 * or is the creator.
 * ADMIN role returns null (sees everything).
 */
export async function getAllowedSampleIds(userId, roleCode) {
  const code = (roleCode || '').toUpperCase();
  if (code === 'ADMIN') return null;

  // 1. Get samples where user is the creator
  const { data: created, error: err1 } = await supabase
    .from('sample_request')
    .select('sample_id')
    .eq('created_by', userId);

  if (err1) throw err1;
  const ids = new Set((created || []).map(r => r.sample_id));

  // 2. Get samples where user is assigned in team_assignment
  const assignmentQuery = `
    pbd_user_id.eq.${userId},
    td_user_id.eq.${userId},
    fty_user_id.eq.${userId},
    fty_md2_user_id.eq.${userId},
    md_user_id.eq.${userId},
    costing_user_id.eq.${userId}
  `;

  const { data: assigned, error: err2 } = await supabase
    .from('team_assignment')
    .select('sample_id')
    .or(assignmentQuery.replace(/\n/g, '').trim());

  if (err2) throw err2;
  (assigned || []).forEach(r => ids.add(r.sample_id));

  return [...ids];
}

/**
 * Check if user can access this specific sample.
 */
export async function canAccessSample(userId, roleCode, sampleId) {
  if ((roleCode || '').toUpperCase() === 'ADMIN') return true;
  const allowed = await getAllowedSampleIds(userId, roleCode);
  return allowed === null || allowed.includes(sampleId);
}

