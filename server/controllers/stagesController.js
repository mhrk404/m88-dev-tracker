import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';
import { STAGE_TABLES, getStagesForRole } from '../middleware/rbac.js';

const STAGE_FLOW = [...STAGE_TABLES, 'delivered_confirmation'];

function getNextStage(currentStage) {
  const idx = STAGE_FLOW.indexOf(currentStage);
  if (idx === -1 || idx >= STAGE_FLOW.length - 1) return null;
  return STAGE_FLOW[idx + 1] ?? null;
}

/** Ensure sample exists; return 404 if not. Stages are always scoped to a sample. */
async function ensureSampleExists(sampleId) {
  const { data, error } = await supabase.from('sample_request').select('sample_id').eq('sample_id', sampleId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export const getStages = async (req, res) => {
  try {
    const { sampleId } = req.params;
    if (!sampleId) return res.status(400).json({ error: 'sampleId is required' });
    const sampleExists = await ensureSampleExists(sampleId);
    if (!sampleExists) return res.status(404).json({ error: 'Sample not found' });

    const allowedStages = getStagesForRole(req.user?.roleCode);
    const tablesToFetch = allowedStages ?? STAGE_TABLES;

    const results = {};
    for (const table of STAGE_TABLES) {
      if (!tablesToFetch.includes(table)) {
        results[table] = null;
        continue;
      }
      const { data, error } = await supabase.from(table).select('*').eq('sample_id', sampleId).maybeSingle();
      if (error) throw error;
      results[table] = data ?? null;
    }
    return res.json({ sample_id: sampleId, stages: results });
  } catch (err) {
    console.error('stages getStages:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get stages' });
  }
};

export const updateStage = async (req, res) => {
  try {
    const { sampleId } = req.params;
    if (!sampleId) return res.status(400).json({ error: 'sampleId is required' });
    const sampleExists = await ensureSampleExists(sampleId);
    if (!sampleExists) return res.status(404).json({ error: 'Sample not found' });

    const {
      stage,
      sample_id: _bodySampleId,
      advance_to_stage,
      ...payload
    } = req.body;
    console.log('[DEBUG] updateStage - stage:', stage);
    console.log('[DEBUG] updateStage - payload:', JSON.stringify(payload, null, 2));
    
    if (!stage || !STAGE_TABLES.includes(stage)) {
      return res.status(400).json({ error: 'body.stage is required and must be one of: ' + STAGE_TABLES.join(', ') });
    }

    const allowedStages = getStagesForRole(req.user?.roleCode);
    if (allowedStages != null && !allowedStages.includes(stage)) {
      return res.status(403).json({ error: 'You can only update your own stage: ' + (allowedStages.join(' or ')) });
    }

    const table = stage;
    const { data: existing } = await supabase
      .from(table)
      .select('sample_id')
      .eq('sample_id', sampleId)
      .maybeSingle();

    let data;
    if (existing) {
      console.log('[DEBUG] Updating existing record with payload:', JSON.stringify(payload, null, 2));
      const { data: updated, error } = await supabase.from(table).update(payload).eq('sample_id', sampleId).select('*').single();
      if (error) throw error;
      data = updated;
      console.log('[DEBUG] Updated record:', JSON.stringify(updated, null, 2));
    } else {
      console.log('[DEBUG] Inserting new record with payload:', JSON.stringify({ sample_id: sampleId, ...payload }, null, 2));
      const { data: inserted, error } = await supabase.from(table).insert({ sample_id: sampleId, ...payload }).select('*').single();
      if (error) throw error;
      data = inserted;
      console.log('[DEBUG] Inserted record:', JSON.stringify(inserted, null, 2));
    }

    if (advance_to_stage) {
      const requestedNext = String(advance_to_stage).trim().toLowerCase();
      const expectedNext = getNextStage(stage);
      if (!expectedNext || requestedNext !== expectedNext) {
        return res.status(400).json({ error: `Invalid stage transition. Allowed next stage from ${stage} is ${expectedNext ?? 'none'}.` });
      }

      const { error: stageErr } = await supabase
        .from('sample_request')
        .update({ current_stage: requestedNext })
        .eq('sample_id', sampleId);
      if (stageErr) throw stageErr;
    }

    // Update sample_request current_status to PROCESSING when a stage is touched
    const { error: statusErr } = await supabase
      .from('sample_request')
      .update({ current_status: 'PROCESSING' })
      .eq('sample_id', sampleId)
      .eq('current_status', 'PENDING'); // Only update if still PENDING
    if (statusErr) console.error('Failed to update sample status to PROCESSING:', statusErr);

    try {
      await supabase.from('stage_audit_log').insert({
        sample_id: sampleId,
        user_id: req.user.id,
        stage: table,
        action: existing ? 'UPDATE' : 'CREATE',
        field_changed: null,
        old_value: null,
        new_value: null,
      });
    } catch (e) {
      console.error('stage_audit_log insert failed:', e);
    }

    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'stage', resourceId: sampleId, details: { stage: table }, ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('stages updateStage:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update stage' });
  }
};
