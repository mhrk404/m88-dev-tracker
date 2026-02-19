import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';
import { STAGE_TABLES, getStagesForRole } from '../middleware/rbac.js';

/** sample_request with style and team_assignment. */
const SAMPLE_REQUEST_SELECT = `
  *,
  styles:styles!style_id(
    style_id, brand_id, season_id, style_number, style_name, division, product_category, color, qty, coo,
    brands:brands!brand_id(name),
    seasons:seasons!season_id(code, year)
  ),
  team_assignment:team_assignment!sample_id(
    assignment_id, pbd_user_id, td_user_id, fty_user_id, fty_md2_user_id, md_user_id, costing_user_id
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

/** Write a field-level change to stage_audit_log. Non-blocking. */
async function recordHistory(sampleId, tableName, fieldName, oldValue, newValue, changedBy, notes = null) {
  try {
    await supabase.from('stage_audit_log').insert({
      sample_id: sampleId,
      user_id: changedBy,
      stage: tableName,
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
      stage: stage || 'sample_request',
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
    return res.json(flattenList(data));
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
    return res.json(flattenSample(data));
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

    const allowedStages = getStagesForRole(req.user?.roleCode);
    const stageTablesToFetch = allowedStages == null ? STAGE_TABLES : allowedStages;

    const stagePromises = STAGE_TABLES.map((table) =>
      supabase.from(table).select('*').eq('sample_id', sampleId).maybeSingle()
    );

    const auditPromise = supabase.from('stage_audit_log').select('*').eq('sample_id', sampleId).order('timestamp', { ascending: false });

    const [stageResults, audit] = await Promise.all([
      Promise.all(stagePromises),
      auditPromise,
    ]);

    const stages = {};
    STAGE_TABLES.forEach((table, i) => {
      stages[table] = stageTablesToFetch.includes(table) ? (stageResults[i]?.data ?? null) : null;
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
      status: shipment.stage_status,
      created_at: shipment.created_at,
      updated_at: shipment.updated_at
    }] : [];

    // Map audit log to history format
    const auditData = audit.data ?? [];
    const history = auditData.map(a => ({
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

    const status_transitions = auditData
      .filter(a => a.field_changed === 'status' || a.field_changed === 'current_status' || a.field_changed === 'current_stage')
      .map(a => ({
        id: a.log_id,
        sample_id: a.sample_id,
        from_status: a.field_changed === 'status' ? a.old_value : null,
        to_status: a.new_value,
        stage: a.stage,
        transitioned_by: a.user_id,
        transitioned_at: a.timestamp,
        notes: null
      }));

    return res.json({
      ...flat,
      stages,
      shipping,
      history,
      status_transitions
    });
  } catch (err) {
    console.error('samples getFull:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample' });
  }
};

export const create = async (req, res) => {
  try {
    const {
      style_id,
      style,
      unfree_status,
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
      unfree_status: unfree_status?.trim() || null,
      sample_type: sample_type?.trim() || null,
      sample_type_group: sample_type_group?.trim() || null,
      sample_status: sample_status?.trim() || null,
      kickoff_date: kickoff_date || null,
      sample_due_denver: sample_due_denver || null,
      requested_lead_time: (computedLead != null) ? Number(computedLead) : (requested_lead_time != null ? Number(requested_lead_time) : null),
      lead_time_type: (computedLead != null) ? classifyLeadTime(Number(computedLead)) : (requested_lead_time != null ? classifyLeadTime(Number(requested_lead_time)) : (lead_time_type ? lead_time_type.trim() : null)),
      ref_from_m88: ref_from_m88?.trim() || null,
      ref_sample_to_fty: ref_sample_to_fty?.trim() || null,
      additional_notes: additional_notes?.trim() || null,
      key_date: key_date || null,
      current_stage: 'PSI',
      current_status: 'INITIATED',
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
      pbd_user_id: assignment?.pbd_user_id != null ? Number(assignment.pbd_user_id) : null,
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

    const { data: dataFull, error: fetchErr } = await supabase
      .from('sample_request')
      .select(SAMPLE_REQUEST_SELECT)
      .eq('sample_id', sampleId)
      .single();
    if (fetchErr) throw fetchErr;

    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'sample', resourceId: sampleId, details: { sample_id: sampleId }, ip, userAgent });
    await recordHistory(sampleId, 'sample_request', 'create', null, sample_status || '', createdBy, 'Sample created');

    return res.status(201).json(flattenSample(dataFull));
  } catch (err) {
    console.error('samples create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create sample' });
  }
};

export const update = async (req, res) => {
  try {
    const { sampleId } = req.params;
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

    // Heuristic: if status is DELIVERED, advance stage to shipment_to_brand if not already passed
    if (updates.current_status?.toUpperCase() === 'DELIVERED' && (!updates.current_stage || updates.current_stage === 'psi')) {
      updates.current_stage = 'shipment_to_brand';
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
        if (Object.keys(assignUpdates).length) await supabase.from('team_assignment').update(assignUpdates).eq('sample_id', sampleId);
      }
    }

    if (Object.keys(updates).length === 0 && req.body.assignment === undefined) return res.status(400).json({ error: 'No fields to update' });

    const { data: oldRow } = await supabase.from('sample_request').select('*').eq('sample_id', sampleId).maybeSingle();
    if (!oldRow) return res.status(404).json({ error: 'Sample not found' });

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

      for (const key of Object.keys(updates)) {
        const oldVal = oldRow[key] != null ? String(oldRow[key]) : null;
        const newVal = updates[key] != null ? String(updates[key]) : null;
        if (oldVal !== newVal) {
          if (key === 'current_stage' || key === 'current_status') {
            await recordTransition(sampleId, oldRow.current_status, updates.current_status ?? oldRow.current_status, updates.current_stage ?? oldRow.current_stage, userId);
          } else {
            recordHistory(sampleId, 'sample_request', key, oldVal, newVal, userId);
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
