import { supabase } from '../config/supabase.js';

const STAGE_TABLES = ['product_business_dev', 'technical_design', 'factory_execution', 'merchandising_review', 'costing_analysis'];

/**
 * For USER role: return sample IDs the user is allowed to see (created by them or owner in any stage).
 * For other roles returns null (no filter = see all).
 * @param {number} userId
 * @returns {Promise<string[]|null>} Array of sample UUIDs or null if no filter
 */
export async function getAllowedSampleIds(userId) {
  const created = await supabase.from('samples').select('id').eq('created_by', userId);
  if (created.error) throw created.error;
  const fromCreated = (created.data ?? []).map((r) => r.id);

  const fromStages = new Set();
  for (const table of STAGE_TABLES) {
    if (table === 'costing_analysis') {
      const { data } = await supabase.from(table).select('sample_id').or(`analyst_id.eq.${userId},brand_communication_owner_id.eq.${userId}`);
      if (data) data.forEach((r) => fromStages.add(r.sample_id));
    } else {
      const { data } = await supabase.from(table).select('sample_id').eq('owner_id', userId);
      if (data) data.forEach((r) => fromStages.add(r.sample_id));
    }
  }

  const merged = [...new Set([...fromCreated, ...fromStages])];
  return merged.length ? merged : [];
}

/**
 * Check if user can access this sample. For USER role, must be in allowed list; for others, true.
 */
export async function canAccessSample(userId, roleCode, sampleId) {
  if ((roleCode || '').toUpperCase() !== 'USER') return true;
  const allowed = await getAllowedSampleIds(userId);
  return allowed.includes(sampleId);
}
