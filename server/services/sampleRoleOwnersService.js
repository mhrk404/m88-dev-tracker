import { supabase } from '../config/supabase.js';

export const SAMPLE_ROLE_KEYS = {
  PBD_SAMPLE_CREATION: 'PBD_SAMPLE_CREATION',
  TD_PSI_INTAKE: 'TD_PSI_INTAKE',
  FTY_MD_DEVELOPMENT: 'FTY_MD_DEVELOPMENT',
  MD_M88_DECISION: 'MD_M88_DECISION',
  COSTING_TEAM_COST_SHEET: 'COSTING_TEAM_COST_SHEET',
  PBD_BRAND_TRACKING: 'PBD_BRAND_TRACKING',
};

export async function setSampleRoleOwner({ sampleId, roleKey, userId, enteredBy }) {
  if (!sampleId || !roleKey) return;

  const numericUserId = userId != null ? Number(userId) : null;
  const numericEnteredBy = enteredBy != null ? Number(enteredBy) : null;

  if (numericUserId == null || Number.isNaN(numericUserId)) {
    await supabase.from('sample_role_owner').delete().eq('sample_id', sampleId).eq('role_key', roleKey);
    return;
  }

  const { error } = await supabase
    .from('sample_role_owner')
    .upsert(
      {
        sample_id: sampleId,
        role_key: roleKey,
        user_id: numericUserId,
        entered_by: Number.isNaN(numericEnteredBy) ? null : numericEnteredBy,
        entered_at: new Date().toISOString(),
      },
      { onConflict: 'sample_id,role_key' }
    );

  if (error) throw error;
}

export async function getSampleRoleOwners(sampleId) {
  if (!sampleId) return [];

  const { data, error } = await supabase
    .from('sample_role_owner')
    .select(`
      sample_role_owner_id,
      sample_id,
      role_key,
      user_id,
      entered_by,
      entered_at,
      created_at,
      updated_at,
      user:user_id(id, username, full_name, role_id, region)
    `)
    .eq('sample_id', sampleId);

  if (error) throw error;
  return data ?? [];
}
