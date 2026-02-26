import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';
import { STAGE_TABLES, getStagesForRole } from '../middleware/rbac.js';
import { SAMPLE_ROLE_KEYS, setSampleRoleOwner } from '../services/sampleRoleOwnersService.js';
import { findConflictingSampleLock } from '../services/samplePresenceService.js';

const STAGE_FLOW = [...STAGE_TABLES, 'delivered_confirmation'];

const STAGE_ALLOWED_FIELDS = {
  psi: ['tp_handoff_td', 'sent_date', 'is_checked', 'p3_remake_reason'],
  sample_development: [
    'fty_md_user_id',
    'fty_machine',
    'target_xfty',
    'sample_proceeded',
    'fty_remark',
    'fty_psi_btp_discrepancy',
    'actual_send',
    'awb',
    'target_1pc_review_date',
    'actual_cbd_submitted_date',
    'is_checked',
  ],
  pc_review: ['confirm_date', 'reject_by_md', 'review_comp', 'md_int_review', 'scf_shared_date'],
  costing: ['team_member_user_id', 'sent_status', 'cost_sheet_date'],
  shipment_to_brand: ['awb_number', 'pkg_eta_denver', 'is_checked'],
  delivered_confirmation: ['sent_date'],
};

function resolveStageContext(stage) {
  const requestedStage = String(stage || '').trim().toLowerCase();
  if (!requestedStage) return null;

  if (STAGE_TABLES.includes(requestedStage)) {
    return {
      requestedStage,
      permissionStage: requestedStage,
      table: requestedStage,
    };
  }

  if (requestedStage === 'delivered_confirmation') {
    return {
      requestedStage,
      permissionStage: 'shipment_to_brand',
      table: 'shipment_to_brand',
    };
  }

  return null;
}

function toAuditStage(stageLike) {
  const normalized = String(stageLike || '').trim().toLowerCase();
  switch (normalized) {
    case 'psi':
      return 'PSI';
    case 'sample_development':
      return 'SAMPLE_DEVELOPMENT';
    case 'pc_review':
      return 'PC_REVIEW';
    case 'costing':
      return 'COSTING';
    case 'scf':
      return 'SCF';
    case 'shipment_to_brand':
    case 'delivered_confirmation':
      return 'SHIPMENT_TO_BRAND';
    default:
      return 'PSI';
  }
}

function sanitizeStagePayload(stage, payload) {
  const allowed = STAGE_ALLOWED_FIELDS[stage] ?? [];
  const filtered = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (allowed.includes(key)) filtered[key] = value;
  }
  return filtered;
}

function getNextStage(currentStage) {
  const idx = STAGE_FLOW.indexOf(currentStage);
  if (idx === -1 || idx >= STAGE_FLOW.length - 1) return null;
  return STAGE_FLOW[idx + 1] ?? null;
}

function isCanceledLike(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'cancel' || normalized === 'canceled' || normalized === 'cancelled' || normalized === 'dropped';
}

function isAdminRole(roleCode) {
  const role = String(roleCode || '').trim().toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

async function getSampleAssignment(sampleId) {
  const { data, error } = await supabase
    .from('team_assignment')
    .select('pbd_user_id, td_user_id, fty_user_id, fty_md2_user_id, md_user_id, costing_user_id')
    .eq('sample_id', sampleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function resolveRoleOwnerForStage(stage, payload, user, assignment) {
  const roleCode = String(user?.roleCode || '').toUpperCase();

  if (stage === 'psi') {
    return {
      roleKey: SAMPLE_ROLE_KEYS.TD_PSI_INTAKE,
      userId: roleCode === 'TD' ? user?.id : (assignment?.td_user_id ?? null),
    };
  }

  if (stage === 'sample_development') {
    return {
      roleKey: SAMPLE_ROLE_KEYS.FTY_MD_DEVELOPMENT,
      userId: payload?.fty_md_user_id ?? (roleCode === 'FTY' ? user?.id : (assignment?.fty_md2_user_id ?? assignment?.fty_user_id ?? null)),
    };
  }

  if (stage === 'pc_review') {
    return {
      roleKey: SAMPLE_ROLE_KEYS.MD_M88_DECISION,
      userId: roleCode === 'MD' ? user?.id : (assignment?.md_user_id ?? null),
    };
  }

  if (stage === 'costing') {
    return {
      roleKey: SAMPLE_ROLE_KEYS.COSTING_TEAM_COST_SHEET,
      userId: payload?.team_member_user_id ?? (roleCode === 'COSTING' ? user?.id : (assignment?.costing_user_id ?? null)),
    };
  }

  if (stage === 'shipment_to_brand' || stage === 'delivered_confirmation') {
    return {
      roleKey: SAMPLE_ROLE_KEYS.PBD_BRAND_TRACKING,
      userId: roleCode === 'PBD' ? user?.id : (assignment?.pbd_user_id ?? null),
    };
  }

  return null;
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

    const conflictingLock = await findConflictingSampleLock({ sampleId, userId: req.user?.id });
    if (conflictingLock) {
      const blockerName = conflictingLock.full_name || conflictingLock.username || `User #${conflictingLock.user_id}`;
      return res.status(409).json({
        error: `Sample is currently being edited by ${blockerName}. Try again in a few seconds.`,
        conflict: conflictingLock,
      });
    }

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
    
    const stageContext = resolveStageContext(stage);
    if (!stageContext) {
      return res.status(400).json({ error: 'body.stage is required and must be one of: ' + [...STAGE_TABLES, 'delivered_confirmation'].join(', ') });
    }

    const requestedStage = stageContext.requestedStage;
    const permissionStage = stageContext.permissionStage;
    const table = stageContext.table;
    const safePayload = sanitizeStagePayload(requestedStage, payload);

    const allowedStages = getStagesForRole(req.user?.roleCode);
    if (allowedStages != null && !allowedStages.includes(permissionStage)) {
      return res.status(403).json({ error: 'You can only update your own stage: ' + (allowedStages.join(' or ')) });
    }

    const { data: existing } = await supabase
      .from(table)
      .select('sample_id')
      .eq('sample_id', sampleId)
      .maybeSingle();

    let data;
    if (existing) {
      console.log('[DEBUG] Updating existing record with payload:', JSON.stringify(safePayload, null, 2));
      const { data: updated, error } = await supabase.from(table).update(safePayload).eq('sample_id', sampleId).select('*').single();
      if (error) throw error;
      data = updated;
      console.log('[DEBUG] Updated record:', JSON.stringify(updated, null, 2));
    } else {
      console.log('[DEBUG] Inserting new record with payload:', JSON.stringify({ sample_id: sampleId, ...safePayload }, null, 2));
      const { data: inserted, error } = await supabase.from(table).insert({ sample_id: sampleId, ...safePayload }).select('*').single();
      if (error) throw error;
      data = inserted;
      console.log('[DEBUG] Inserted record:', JSON.stringify(inserted, null, 2));
    }

    const assignment = isAdminRole(req.user?.roleCode) ? await getSampleAssignment(sampleId) : null;
    const roleOwner = resolveRoleOwnerForStage(requestedStage, safePayload, req.user, assignment);
    if (roleOwner?.roleKey && roleOwner.userId != null && !Number.isNaN(Number(roleOwner.userId))) {
      await setSampleRoleOwner({
        sampleId,
        roleKey: roleOwner.roleKey,
        userId: roleOwner.userId,
        enteredBy: req.user?.id ?? null,
      });
    }

    if (advance_to_stage) {
      const requestedNext = String(advance_to_stage).trim().toLowerCase();
      const expectedNext = getNextStage(requestedStage);
      if (!expectedNext || requestedNext !== expectedNext) {
        return res.status(400).json({ error: `Invalid stage transition. Allowed next stage from ${requestedStage} is ${expectedNext ?? 'none'}.` });
      }

      const { error: stageErr } = await supabase
        .from('sample_request')
        .update({ current_stage: requestedNext })
        .eq('sample_id', sampleId);
      if (stageErr) throw stageErr;

      try {
        await supabase.from('stage_audit_log').insert({
          sample_id: sampleId,
          user_id: req.user.id,
          stage: toAuditStage(requestedNext),
          action: 'UPDATE',
          field_changed: 'current_stage',
          old_value: requestedStage,
          new_value: requestedNext,
        });
      } catch (e) {
        console.error('stage_audit_log stage transition insert failed:', e);
      }
    }

    const canceledInPayload = isCanceledLike(safePayload.current_status)
      || isCanceledLike(safePayload.sample_status)
      || isCanceledLike(safePayload.status);

    const hasDeliveredSentDate = requestedStage === 'delivered_confirmation'
      && String(safePayload.sent_date || '').trim() !== '';

    let mappedCurrentStatus = 'Processing';
    let mappedSampleStatus = 'Processing';
    if (canceledInPayload) {
      mappedCurrentStatus = 'Dropped';
      mappedSampleStatus = 'Dropped';
    } else if (requestedStage === 'delivered_confirmation') {
      if (!hasDeliveredSentDate) {
        return res.status(400).json({ error: 'sent_date is required to mark sample as delivered.' });
      }
      mappedCurrentStatus = 'Delivered';
      mappedSampleStatus = 'Completed';
    }

    // Apply stage/sample mapping whenever a stage is touched
    const { error: statusErr } = await supabase
      .from('sample_request')
      .update({ current_status: mappedCurrentStatus, sample_status: mappedSampleStatus })
      .eq('sample_id', sampleId);
    if (statusErr) console.error('Failed to apply sample/stage status mapping:', statusErr);

    try {
      await supabase.from('stage_audit_log').insert({
        sample_id: sampleId,
        user_id: req.user.id,
        stage: toAuditStage(table),
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
