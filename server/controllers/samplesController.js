import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';
import { STAGE_TABLES, getStagesForRole } from '../middleware/rbac.js';
import { SAMPLE_ROLE_KEYS, getSampleRoleOwners, setSampleRoleOwner } from '../services/sampleRoleOwnersService.js';
import {
  upsertSamplePresence,
  releaseSamplePresence,
  listActiveSamplePresence,
  findConflictingSampleLock,
  normalizeContext,
  normalizeLockType,
} from '../services/samplePresenceService.js';

/** sample_request with style and team_assignment. */
const SAMPLE_REQUEST_SELECT = `
  *,
  styles:styles!style_id(
    style_id, brand_id, season_id, style_number, style_name, division, product_category, color, qty, coo,
    brands:brands!brand_id(name),
    seasons:seasons!season_id(code, year)
  ),
  team_assignment:team_assignment!sample_id(
    assignment_id,
    pbd_user_id,
    td_user_id,
    fty_user_id,
    fty_md2_user_id,
    md_user_id,
    costing_user_id,
    pbd:pbd_user_id(full_name),
    td:td_user_id(full_name),
    fty_md2:fty_md2_user_id(full_name),
    md:md_user_id(full_name),
    costing:costing_user_id(full_name)
  )
`;

/** Helper to flatten nested styles and lookup fields for frontend compatibility. */
function flattenSample(s) {
  if (!s) return s;
  const { styles, ...rest } = s;
  const brandSub = styles?.brands;
  const seasonSub = styles?.seasons;

  return {
    ...rest,
    id: rest.sample_id,
    // style fields flattened
    style_id: styles?.style_id ?? rest.style_id,
    brand_id: styles?.brand_id ?? rest.brand_id,
    season_id: styles?.season_id ?? rest.season_id,
    style_number: styles?.style_number ?? null,
    style_name: styles?.style_name ?? null,
    division: styles?.division ?? null,
    product_category: styles?.product_category ?? null,
    color: styles?.color ?? null,
    qty: styles?.qty ?? null,
    coo: styles?.coo ?? null,
    // Add lookup objects for convenience
    brands: brandSub ? { name: brandSub.name } : null,
    seasons: seasonSub ? { name: seasonSub.code, year: seasonSub.year } : null,
    // Keep raw styles for nesting enthusiasts
    styles: styles
  };
}

const flattenList = (list) => (list || []).map(flattenSample);

async function getPresenceUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name')
    .eq('id', Number(userId))
    .maybeSingle();
  if (error) throw error;
  return data;
}

function assignmentRoleOwnerUpdates(sampleId, assignment, fallbackPbdUserId = null) {
  return [
    {
      sampleId,
      roleKey: SAMPLE_ROLE_KEYS.PBD_SAMPLE_CREATION,
      userId: assignment?.pbd_user_id ?? fallbackPbdUserId ?? null,
    },
    {
      sampleId,
      roleKey: SAMPLE_ROLE_KEYS.TD_PSI_INTAKE,
      userId: assignment?.td_user_id ?? null,
    },
    {
      sampleId,
      roleKey: SAMPLE_ROLE_KEYS.FTY_MD_DEVELOPMENT,
      userId: assignment?.fty_md2_user_id ?? assignment?.fty_user_id ?? null,
    },
    {
      sampleId,
      roleKey: SAMPLE_ROLE_KEYS.MD_M88_DECISION,
      userId: assignment?.md_user_id ?? null,
    },
    {
      sampleId,
      roleKey: SAMPLE_ROLE_KEYS.COSTING_TEAM_COST_SHEET,
      userId: assignment?.costing_user_id ?? null,
    },
    {
      sampleId,
      roleKey: SAMPLE_ROLE_KEYS.PBD_BRAND_TRACKING,
      userId: assignment?.pbd_user_id ?? fallbackPbdUserId ?? null,
    },
  ];
}

function roleOwnerMapByKey(roleOwners) {
  const map = {};
  for (const row of roleOwners || []) {
    map[row.role_key] = row;
  }
  return map;
}

function normalizeStage(stage) {
  return typeof stage === 'string' ? stage.trim().toLowerCase() : null;
}

function toAuditStage(stageLike) {
  const normalized = normalizeStage(stageLike);
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

function isCanceledLike(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'cancel' || normalized === 'canceled' || normalized === 'cancelled' || normalized === 'dropped';
}

function visibleStagesForRole(roleCode) {
  const role = String(roleCode || '').toUpperCase();
  switch (role) {
    case 'FTY':
      return ['sample_development'];
    case 'TD':
      return ['psi'];
    case 'MD':
      return ['pc_review'];
    case 'COSTING':
      return ['costing'];
    case 'PBD':
      return ['psi', 'shipment_to_brand', 'delivered_confirmation'];
    default:
      return null;
  }
}

function canViewSampleForRole(roleCode, currentStage) {
  const allowedStages = visibleStagesForRole(roleCode);
  if (!allowedStages) return true;
  const stage = normalizeStage(currentStage);
  if (!stage) return false;
  return allowedStages.includes(stage);
}

const FULL_HISTORY_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'PBD']);

const ROLE_HISTORY_SCOPE = {
  TD: ['psi'],
  FTY: ['sample_development'],
  MD: ['pc_review'],
  COSTING: ['costing'],
  BRAND: ['shipment_to_brand', 'delivered_confirmation'],
};

function normalizeHistoryStage(value) {
  if (value == null) return null;
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function canSeeFullHistory(roleCode) {
  return FULL_HISTORY_ROLES.has(String(roleCode || '').toUpperCase());
}

function isHistoryRowVisibleForRole(row, roleCode) {
  const role = String(roleCode || '').toUpperCase();
  if (canSeeFullHistory(role)) return true;

  const allowedStages = ROLE_HISTORY_SCOPE[role] ?? [];
  if (allowedStages.length === 0) return false;

  const field = String(row?.field_changed || '').toLowerCase();
  const candidates = [normalizeHistoryStage(row?.stage)];
  if (field === 'current_stage') {
    candidates.push(normalizeHistoryStage(row?.old_value));
    candidates.push(normalizeHistoryStage(row?.new_value));
  }

  return candidates.some((stage) => !!stage && allowedStages.includes(stage));
}

/** Write a field-level change to stage_audit_log. Non-blocking. */
async function recordHistory(sampleId, tableName, fieldName, oldValue, newValue, changedBy, notes = null) {
  try {
    await supabase.from('stage_audit_log').insert({
      sample_id: sampleId,
      user_id: changedBy,
      stage: toAuditStage(tableName),
      action: 'UPDATE',
      field_changed: fieldName,
      old_value: oldValue,
      new_value: newValue,
    });
  } catch (err) {
    console.error('recordHistory failed:', err);
  }
}

/** Write a status/stage transition to stage_audit_log. Non-blocking. */
async function recordTransition(sampleId, fromStatus, toStatus, stage, transitionedBy, notes = null) {
  try {
    await supabase.from('stage_audit_log').insert({
      sample_id: sampleId,
      user_id: transitionedBy,
      stage: toAuditStage(stage),
      action: 'UPDATE',
      field_changed: 'status',
      old_value: fromStatus,
      new_value: toStatus,
    });
  } catch (err) {
    console.error('recordTransition failed:', err);
  }
}

export const list = async (req, res) => {
  try {
    const { season_id, brand_id, division, product_category, sample_type, sample_status } = req.query;
    let styleIds = null;
    const styleFilterActive = season_id || brand_id || division || product_category;

    if (styleFilterActive) {
      let sq = supabase.from('styles').select('style_id');
      if (season_id) sq = sq.eq('season_id', season_id);
      if (brand_id) sq = sq.eq('brand_id', brand_id);
      if (division) sq = sq.eq('division', division);
      if (product_category) sq = sq.eq('product_category', product_category);

      const { data: styleRows, error: styleErr } = await sq;
      if (styleErr) throw styleErr;

      if (styleRows?.length) {
        styleIds = styleRows.map((r) => r.style_id);
      } else {
        return res.json([]);
      }
    }
    let q = supabase.from('sample_request').select(SAMPLE_REQUEST_SELECT).order('created_at', { ascending: false });
    if (styleIds && styleIds.length) q = q.in('style_id', styleIds);
    if (sample_type) q = q.eq('sample_type', sample_type);
    if (sample_status) q = q.eq('sample_status', sample_status);
    const { data, error } = await q;
    if (error) throw error;

    const flat = flattenList(data);
    const filtered = flat.filter((sample) => canViewSampleForRole(req.user?.roleCode, sample.current_stage));
    return res.json(filtered);
  } catch (err) {
    console.error('samples list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list samples' });
  }
};

export const getOne = async (req, res) => {
  try {
    const { sampleId } = req.params;
    if (!sampleId || sampleId === 'undefined') {
      return res.status(400).json({ error: 'Valid sample_id is required' });
    }
    const { data, error } = await supabase
      .from('sample_request')
      .select(SAMPLE_REQUEST_SELECT)
      .eq('sample_id', sampleId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Sample not found' });

    const flat = flattenSample(data);
    if (!canViewSampleForRole(req.user?.roleCode, flat.current_stage)) {
      return res.status(403).json({ error: 'You can only access samples that are at your stage.' });
    }
    return res.json(flat);
  } catch (err) {
    console.error('samples getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample' });
  }
};

export const getFull = async (req, res) => {
  try {
    const { sampleId } = req.params;
    if (!sampleId || sampleId === 'undefined') {
      return res.status(400).json({ error: 'Valid sample_id is required' });
    }
    const { data: sample, error: sampleError } = await supabase
      .from('sample_request')
      .select(SAMPLE_REQUEST_SELECT)
      .eq('sample_id', sampleId)
      .maybeSingle();
    if (sampleError) throw sampleError;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    if (!canViewSampleForRole(req.user?.roleCode, sample.current_stage)) {
      return res.status(403).json({ error: 'You can only access samples that are at your stage.' });
    }

    // For full view, fetch ALL stage data regardless of role (read-only display)
    const stagePromises = STAGE_TABLES.map((table) =>
      supabase.from(table).select('*').eq('sample_id', sampleId).maybeSingle()
    );

    const auditPromise = supabase.from('stage_audit_log').select('*').eq('sample_id', sampleId).order('timestamp', { ascending: false });

    const [stageResults, audit, roleOwners] = await Promise.all([
      Promise.all(stagePromises),
      auditPromise,
      getSampleRoleOwners(sampleId),
    ]);

    // Return all stage data for full view (used by detail page Additional Info)
    const stages = {};
    STAGE_TABLES.forEach((table, i) => {
      stages[table] = stageResults[i]?.data ?? null;
    });

    const flat = flattenSample(sample);
    // Compatibility: Map shipment_to_brand to shipping array for frontend
    const shipment = stages.shipment_to_brand;
    const shipping = shipment ? [{
      id: shipment.shipment_id,
      sample_id: shipment.sample_id,
      awb: shipment.awb_number,
      origin: 'Factory',
      destination: 'Brand',
      estimated_arrival: null,
      actual_arrival: shipment.sent_date,
      status: shipment.sent_date ? 'Sent' : 'Pending',
      created_at: shipment.created_at,
      updated_at: shipment.updated_at
    }] : [];

    // Map audit log to history format
    const auditData = audit.data ?? [];
    const visibleAuditData = auditData.filter((row) => isHistoryRowVisibleForRole(row, req.user?.roleCode));
    const history = visibleAuditData.map(a => ({
      id: a.log_id,
      sample_id: a.sample_id,
      table_name: a.stage,
      field_name: a.field_changed,
      old_value: a.old_value,
      new_value: a.new_value,
      changed_by: a.user_id,
      changed_at: a.timestamp,
      change_notes: null
    }));

    const status_transitions = visibleAuditData
      .filter(a => {
        const field = String(a.field_changed || '').toLowerCase();
        return field === 'status' || field === 'current_status' || field === 'sample_status' || field === 'current_stage';
      })
      .map(a => ({
        id: a.log_id,
        sample_id: a.sample_id,
        from_status: String(a.field_changed || '').toLowerCase() === 'current_stage' ? null : a.old_value,
        to_status: String(a.field_changed || '').toLowerCase() === 'current_stage' ? null : a.new_value,
        from_stage: String(a.field_changed || '').toLowerCase() === 'current_stage' ? a.old_value : null,
        to_stage: String(a.field_changed || '').toLowerCase() === 'current_stage' ? a.new_value : a.stage,
        stage: String(a.field_changed || '').toLowerCase() === 'current_stage' ? (a.new_value || a.stage) : a.stage,
        transitioned_by: a.user_id,
        transitioned_at: a.timestamp,
        notes: null
      }));

    return res.json({
      ...flat,
      stages,
      sample_role_owners: roleOwners,
      sample_role_owners_map: roleOwnerMapByKey(roleOwners),
      shipping,
      history,
      status_transitions
    });
  } catch (err) {
    console.error('samples getFull:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample' });
  }
};

export const getShipment = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const trackingInput = String(req.query.awb || '').trim().toLowerCase();

    if (!sampleId || sampleId === 'undefined') {
      return res.status(400).json({ error: 'Valid sample_id is required' });
    }

    const { data: sample, error: sampleErr } = await supabase
      .from('sample_request')
      .select('sample_id,current_stage,current_status')
      .eq('sample_id', sampleId)
      .maybeSingle();
    if (sampleErr) throw sampleErr;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });
    if (!canViewSampleForRole(req.user?.roleCode, sample.current_stage)) {
      return res.status(403).json({ error: 'You can only access samples that are at your stage.' });
    }

    const { data: shipment, error: shipErr } = await supabase
      .from('shipment_to_brand')
      .select('*')
      .eq('sample_id', sampleId)
      .maybeSingle();
    if (shipErr) throw shipErr;
    if (!shipment) return res.status(404).json({ error: 'No shipment data found for this sample' });

    if (trackingInput) {
      const awb = String(shipment.awb_number || '').toLowerCase();
      const awbToBrand = String(shipment.awb_to_brand || '').toLowerCase();
      const isMatch = awb.includes(trackingInput) || awbToBrand.includes(trackingInput);
      if (!isMatch) {
        return res.status(404).json({ error: 'No shipment matched the provided tracking input' });
      }
    }

    return res.json({
      id: shipment.shipment_id,
      sample_id: shipment.sample_id,
      awb: shipment.awb_number ?? null,
      status: sample.current_status ?? null,
      sent_date: shipment.sent_date ?? null,
      data: shipment,
    });
  } catch (err) {
    console.error('samples getShipment:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to fetch shipment data' });
  }
};

export const heartbeatPresence = async (req, res) => {
  try {
    const { sampleId } = req.params;
    if (!sampleId || sampleId === 'undefined') {
      return res.status(400).json({ error: 'Valid sample_id is required' });
    }

    const { data: sample, error: sampleErr } = await supabase
      .from('sample_request')
      .select('sample_id,current_stage')
      .eq('sample_id', sampleId)
      .maybeSingle();
    if (sampleErr) throw sampleErr;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });
    if (!canViewSampleForRole(req.user?.roleCode, sample.current_stage)) {
      return res.status(403).json({ error: 'You can only access samples that are at your stage.' });
    }

    const profile = await getPresenceUserProfile(req.user?.id);
    const context = normalizeContext(req.body?.context);
    const lockType = normalizeLockType(req.body?.lock_type);

    const conflict = lockType
      ? await findConflictingSampleLock({ sampleId, userId: req.user?.id })
      : null;

    if (conflict) {
      const blockerName = conflict.full_name || conflict.username || `User #${conflict.user_id}`;
      return res.status(409).json({
        error: `Locked by ${blockerName}. Please wait until they finish editing.`,
        conflict,
      });
    }

    const result = await upsertSamplePresence({
      sampleId,
      userId: req.user?.id,
      username: profile?.username ?? req.user?.username ?? null,
      fullName: profile?.full_name ?? null,
      roleCode: req.user?.roleCode ?? null,
      context,
      lockType,
    });

    return res.json({ ok: true, sample_id: String(sampleId), expires_at: result.expires_at });
  } catch (err) {
    console.error('samples heartbeatPresence:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update presence' });
  }
};

export const releasePresence = async (req, res) => {
  try {
    const { sampleId } = req.params;
    if (!sampleId || sampleId === 'undefined') {
      return res.status(400).json({ error: 'Valid sample_id is required' });
    }

    await releaseSamplePresence({
      sampleId,
      userId: req.user?.id,
      context: req.body?.context ? normalizeContext(req.body.context) : null,
    });

    return res.json({ ok: true, sample_id: String(sampleId) });
  } catch (err) {
    console.error('samples releasePresence:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to release presence' });
  }
};

export const listPresence = async (req, res) => {
  try {
    const rawIds = String(req.query.sample_ids || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (rawIds.length === 0) {
      return res.json({ by_sample: {} });
    }

    const grouped = await listActiveSamplePresence(rawIds);
    return res.json({ by_sample: grouped });
  } catch (err) {
    console.error('samples listPresence:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list presence' });
  }
};

export const create = async (req, res) => {
  try {
    const {
      style_id,
      style,
      sample_type,
      sample_type_group,
      sample_status,
      kickoff_date,
      sample_due_denver,
      requested_lead_time,
      lead_time_type,
      ref_from_m88,
      ref_sample_to_fty,
      additional_notes,
      key_date,
      assignment,
    } = req.body;
    const createdBy = req.user?.id;
    const creatorUserId = createdBy != null ? Number(createdBy) : null;
    const creatorPbdUserId = creatorUserId;
    let resolvedStyleId = style_id;

    // Compute requested lead time (weeks) from dates if possible
    function computeLeadTimeWeeks(kickoff, due) {
      if (!kickoff || !due) return null
      const kd = Date.parse(kickoff)
      const dd = Date.parse(due)
      if (!Number.isFinite(kd) || !Number.isFinite(dd)) return null
      const days = Math.ceil((dd - kd) / (1000 * 60 * 60 * 24))
      const weeks = Math.ceil(days / 7)
      return weeks > 0 ? weeks : 0
    }

    function classifyLeadTime(weeks) {
      if (weeks == null) return null
      if (weeks === 0) return null
      if (weeks > 17) return 'STND'
      if (weeks >= 1 && weeks <= 17) return 'RUSH'
      return null
    }

    if (!resolvedStyleId && style) {
      const { brand_id, season_id, style_number, style_name, division, product_category, color, qty, coo } = style;
      if (!style_number?.trim() || !brand_id || !season_id) {
        return res.status(400).json({ error: 'style_number, brand_id, season_id are required when creating style inline' });
      }
      const { data: newStyle, error: styleErr } = await supabase
        .from('styles')
        .insert({
          brand_id: Number(brand_id),
          season_id: Number(season_id),
          style_number: style_number.trim(),
          style_name: style_name?.trim() || null,
          division: division?.trim() || null,
          product_category: product_category?.trim() || null,
          color: color?.trim() || null,
          qty: qty != null ? Number(qty) : null,
          coo: coo?.trim() || null,
        })
        .select('style_id')
        .single();
      if (styleErr) {
        if (styleErr.code === '23505') return res.status(409).json({ error: 'Style with this style_number, color and season already exists' });
        throw styleErr;
      }
      resolvedStyleId = newStyle.style_id;
    }

    if (!resolvedStyleId) return res.status(400).json({ error: 'style_id or style object is required' });

    const computedLead = computeLeadTimeWeeks(kickoff_date, sample_due_denver)
    const samplePayload = {
      style_id: Number(resolvedStyleId),
      sample_type: sample_type?.trim() || null,
      sample_type_group: sample_type_group?.trim() || null,
      sample_status: 'Active',
      kickoff_date: kickoff_date || null,
      sample_due_denver: sample_due_denver || null,
      requested_lead_time: (computedLead != null) ? Number(computedLead) : (requested_lead_time != null ? Number(requested_lead_time) : null),
      lead_time_type: (computedLead != null) ? classifyLeadTime(Number(computedLead)) : (requested_lead_time != null ? classifyLeadTime(Number(requested_lead_time)) : (lead_time_type ? lead_time_type.trim() : null)),
      ref_from_m88: ref_from_m88?.trim() || null,
      ref_sample_to_fty: ref_sample_to_fty?.trim() || null,
      additional_notes: additional_notes?.trim() || null,
      key_date: key_date || null,
      current_stage: 'PSI',
      current_status: 'Pending',
      created_by: createdBy,
    };

    const { data: sampleRow, error: sampleErr } = await supabase
      .from('sample_request')
      .insert(samplePayload)
      .select('sample_id')
      .single();
    if (sampleErr) throw sampleErr;

    const sampleId = sampleRow.sample_id;
    const assignPayload = {
      sample_id: sampleId,
      pbd_user_id: assignment?.pbd_user_id != null ? Number(assignment.pbd_user_id) : creatorPbdUserId,
      td_user_id: assignment?.td_user_id != null ? Number(assignment.td_user_id) : null,
      fty_user_id: assignment?.fty_user_id != null ? Number(assignment.fty_user_id) : null,
      fty_md2_user_id: assignment?.fty_md2_user_id != null ? Number(assignment.fty_md2_user_id) : null,
      md_user_id: assignment?.md_user_id != null ? Number(assignment.md_user_id) : null,
      costing_user_id: assignment?.costing_user_id != null ? Number(assignment.costing_user_id) : null,
    };

    const { data: assignRow, error: assignErr } = await supabase
      .from('team_assignment')
      .insert(assignPayload)
      .select('assignment_id')
      .single();
    if (assignErr) throw assignErr;

    await supabase.from('sample_request').update({ assignment_id: assignRow.assignment_id }).eq('sample_id', sampleId);

    const roleOwnerUpdates = assignmentRoleOwnerUpdates(sampleId, assignPayload, creatorPbdUserId);
    await Promise.all(roleOwnerUpdates.map((item) => setSampleRoleOwner({ ...item, enteredBy: createdBy })));

    const { data: dataFull, error: fetchErr } = await supabase
      .from('sample_request')
      .select(SAMPLE_REQUEST_SELECT)
      .eq('sample_id', sampleId)
      .single();
    if (fetchErr) throw fetchErr;

    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'sample', resourceId: sampleId, details: { sample_id: sampleId }, ip, userAgent });
    await recordHistory(sampleId, samplePayload.current_stage, 'create', null, 'Active', createdBy, 'Sample created');

    return res.status(201).json(flattenSample(dataFull));
  } catch (err) {
    console.error('samples create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create sample' });
  }
};

export const update = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const conflictingLock = await findConflictingSampleLock({ sampleId, userId: req.user?.id });
    if (conflictingLock) {
      const blockerName = conflictingLock.full_name || conflictingLock.username || `User #${conflictingLock.user_id}`;
      return res.status(409).json({
        error: `Sample is currently being edited by ${blockerName}. Try again in a few seconds.`,
        conflict: conflictingLock,
      });
    }

    const allowed = [
      'unfree_status', 'sample_type', 'sample_type_group', 'sample_status', 'kickoff_date', 'sample_due_denver',
      'requested_lead_time', 'lead_time_type', 'ref_from_m88', 'ref_sample_to_fty', 'additional_notes', 'key_date',
      'current_stage', 'current_status'
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (key === 'requested_lead_time') {
        updates[key] = req.body[key] != null ? Number(req.body[key]) : null;
      } else if (typeof req.body[key] === 'string') {
        updates[key] = req.body[key].trim();
      } else {
        updates[key] = req.body[key];
      }
    }

    const styleFields = ['brand_id', 'season_id', 'style_number', 'style_name', 'division', 'product_category', 'color', 'qty', 'coo'];
    const styleUpdates = {};
    for (const f of styleFields) {
      if (req.body[f] !== undefined) {
        styleUpdates[f] = (f === 'brand_id' || f === 'season_id' || f === 'qty') ? (req.body[f] != null ? Number(req.body[f]) : null) : req.body[f];
      }
    }

    if (Object.keys(styleUpdates).length > 0) {
      const { data: currentSample } = await supabase.from('sample_request').select('style_id').eq('sample_id', sampleId).single();
      if (currentSample?.style_id) {
        await supabase.from('styles').update(styleUpdates).eq('style_id', currentSample.style_id);
      }
    }

    if (req.body.assignment !== undefined) {
      const a = req.body.assignment;
      const { data: assignRow } = await supabase.from('team_assignment').select('assignment_id').eq('sample_id', sampleId).maybeSingle();
      if (assignRow) {
        const assignUpdates = {};
        if (a.pbd_user_id !== undefined) assignUpdates.pbd_user_id = a.pbd_user_id != null ? Number(a.pbd_user_id) : null;
        if (a.td_user_id !== undefined) assignUpdates.td_user_id = a.td_user_id != null ? Number(a.td_user_id) : null;
        if (a.fty_user_id !== undefined) assignUpdates.fty_user_id = a.fty_user_id != null ? Number(a.fty_user_id) : null;
        if (a.fty_md2_user_id !== undefined) assignUpdates.fty_md2_user_id = a.fty_md2_user_id != null ? Number(a.fty_md2_user_id) : null;
        if (a.md_user_id !== undefined) assignUpdates.md_user_id = a.md_user_id != null ? Number(a.md_user_id) : null;
        if (a.costing_user_id !== undefined) assignUpdates.costing_user_id = a.costing_user_id != null ? Number(a.costing_user_id) : null;
        if (Object.keys(assignUpdates).length) {
          await supabase.from('team_assignment').update(assignUpdates).eq('sample_id', sampleId);

          const { data: latestAssignment } = await supabase
            .from('team_assignment')
            .select('pbd_user_id, td_user_id, fty_user_id, fty_md2_user_id, md_user_id, costing_user_id')
            .eq('sample_id', sampleId)
            .maybeSingle();

          const roleOwnerUpdates = assignmentRoleOwnerUpdates(sampleId, latestAssignment, req.user?.id ?? null);
          await Promise.all(roleOwnerUpdates.map((item) => setSampleRoleOwner({ ...item, enteredBy: req.user?.id ?? null })));
        }
      }
    }

    if (Object.keys(updates).length === 0 && req.body.assignment === undefined) return res.status(400).json({ error: 'No fields to update' });

    const { data: oldRow } = await supabase.from('sample_request').select('*').eq('sample_id', sampleId).maybeSingle();
    if (!oldRow) return res.status(404).json({ error: 'Sample not found' });

    const oldStage = typeof oldRow.current_stage === 'string'
      ? oldRow.current_stage.trim().toLowerCase()
      : oldRow.current_stage;
    const nextStage = typeof updates.current_stage === 'string'
      ? updates.current_stage.trim().toLowerCase()
      : updates.current_stage;

    const canceledInRequest = isCanceledLike(updates.current_status)
      || isCanceledLike(updates.sample_status);

    if (canceledInRequest) {
      updates.current_status = 'Dropped';
      updates.sample_status = 'Dropped';
    } else if (nextStage && nextStage !== oldStage) {
      if (nextStage === 'shipment_to_brand' || nextStage === 'delivered_confirmation') {
        updates.current_status = 'Delivered';
        updates.sample_status = 'Completed';
      } else {
        updates.current_status = 'Processing';
        updates.sample_status = 'Processing';
      }
    }

    // If kickoff_date/sample_due_denver are present (either in updates or existing), compute requested_lead_time on server
    function computeLeadTimeWeeks(kickoff, due) {
      if (!kickoff || !due) return null
      const kd = Date.parse(kickoff)
      const dd = Date.parse(due)
      if (!Number.isFinite(kd) || !Number.isFinite(dd)) return null
      const days = Math.ceil((dd - kd) / (1000 * 60 * 60 * 24))
      const weeks = Math.ceil(days / 7)
      return weeks > 0 ? weeks : 0
    }

    const newKickoff = updates.kickoff_date !== undefined ? updates.kickoff_date : oldRow.kickoff_date
    const newDue = updates.sample_due_denver !== undefined ? updates.sample_due_denver : oldRow.sample_due_denver
    const computed = computeLeadTimeWeeks(newKickoff, newDue)
    if (computed !== null) {
      updates.requested_lead_time = Number(computed)
      // classify as STND / RUSH / null
      function classifyLeadTime(weeks) {
        if (weeks == null) return null
        if (weeks === 0) return null
        if (weeks > 17) return 'STND'
        if (weeks >= 1 && weeks <= 17) return 'RUSH'
        return null
      }
      updates.lead_time_type = classifyLeadTime(Number(computed))
    } else if (updates.requested_lead_time !== undefined && updates.requested_lead_time !== null) {
      function classifyLeadTime(weeks) {
        if (weeks == null) return null
        if (weeks === 0) return null
        if (weeks > 17) return 'STND'
        if (weeks >= 1 && weeks <= 17) return 'RUSH'
        return null
      }
      updates.lead_time_type = classifyLeadTime(Number(updates.requested_lead_time))
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase.from('sample_request').update(updates).eq('sample_id', sampleId).select(SAMPLE_REQUEST_SELECT).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Sample not found' });

      const userId = req.user?.id;
      const { ip, userAgent } = auditMeta(req);
      await logAudit({ userId, action: 'update', resource: 'sample', resourceId: sampleId, details: { keys: Object.keys(updates) }, ip, userAgent });

      const resolvedNewStage = updates.current_stage ?? oldRow.current_stage;
      const resolvedNewStatus = updates.current_status ?? oldRow.current_status;
      const stageChanged = String(oldRow.current_stage ?? '') !== String(resolvedNewStage ?? '');
      const statusChanged = String(oldRow.current_status ?? '') !== String(resolvedNewStatus ?? '');

      if (stageChanged) {
        await recordHistory(
          sampleId,
          String(resolvedNewStage || oldRow.current_stage || 'sample_request').toUpperCase(),
          'current_stage',
          oldRow.current_stage != null ? String(oldRow.current_stage) : null,
          resolvedNewStage != null ? String(resolvedNewStage) : null,
          userId,
        );
      }

      if (statusChanged) {
        await recordTransition(
          sampleId,
          oldRow.current_status,
          resolvedNewStatus,
          String(resolvedNewStage || oldRow.current_stage || 'sample_request').toUpperCase(),
          userId,
        );
      }

      for (const key of Object.keys(updates)) {
        const oldVal = oldRow[key] != null ? String(oldRow[key]) : null;
        const newVal = updates[key] != null ? String(updates[key]) : null;
        if (oldVal !== newVal) {
          if (key !== 'current_stage' && key !== 'current_status') {
            recordHistory(sampleId, resolvedNewStage ?? oldRow.current_stage, key, oldVal, newVal, userId);
          }
        }
      }

      const { data: dataFull } = await supabase.from('sample_request').select(SAMPLE_REQUEST_SELECT).eq('sample_id', sampleId).single();
      return res.json(flattenSample(dataFull ?? data));
    }

    const { data: dataFull } = await supabase.from('sample_request').select(SAMPLE_REQUEST_SELECT).eq('sample_id', sampleId).single();
    return res.json(flattenSample(dataFull));
  } catch (err) {
    console.error('samples update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update sample' });
  }
};

export const remove = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { error } = await supabase.from('sample_request').delete().eq('sample_id', sampleId);
    if (error) throw error;
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'sample', resourceId: sampleId, ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('samples remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete sample' });
  }
};
