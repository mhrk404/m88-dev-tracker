import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';
import { STAGE_TABLES, getStagesForRole } from '../middleware/rbac.js';

const SAMPLE_SELECT = `
  id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id,
  coo, current_status, current_stage, created_at, updated_at, created_by,
  seasons(name, year),
  brands(name),
  divisions(name),
  product_categories(name),
  sample_types(name, "group")
`;

/** Write a field-level change to sample_history. Non-blocking on error. */
async function recordHistory(sampleId, tableName, fieldName, oldValue, newValue, changedBy, notes = null) {
  try {
    await supabase.from('sample_history').insert({
      sample_id: sampleId,
      table_name: tableName,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      changed_by: changedBy,
      change_notes: notes,
    });
  } catch (err) {
    console.error('recordHistory failed:', err);
  }
}

/** Write a status/stage transition. Non-blocking on error. */
async function recordTransition(sampleId, fromStatus, toStatus, stage, transitionedBy, notes = null) {
  try {
    await supabase.from('status_transitions').insert({
      sample_id: sampleId,
      from_status: fromStatus,
      to_status: toStatus,
      stage: stage,
      transitioned_by: transitionedBy,
      notes: notes,
    });
  } catch (err) {
    console.error('recordTransition failed:', err);
  }
}

export const list = async (req, res) => {
  try {
    let q = supabase
      .from('samples')
      .select(SAMPLE_SELECT)
      .order('created_at', { ascending: false });
    const { season_id, brand_id, division_id, category_id, sample_type_id } = req.query;
    if (season_id) q = q.eq('season_id', season_id);
    if (brand_id) q = q.eq('brand_id', brand_id);
    if (division_id) q = q.eq('division_id', division_id);
    if (category_id) q = q.eq('category_id', category_id);
    if (sample_type_id) q = q.eq('sample_type_id', sample_type_id);
    const { data, error } = await q;
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('samples list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list samples' });
  }
};

export const getOne = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { data, error } = await supabase.from('samples').select(SAMPLE_SELECT).eq('id', sampleId).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Sample not found' });
    return res.json(data);
  } catch (err) {
    console.error('samples getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample' });
  }
};

export const getFull = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { data: sample, error: sampleError } = await supabase.from('samples').select(SAMPLE_SELECT).eq('id', sampleId).maybeSingle();
    if (sampleError) throw sampleError;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    const allowedStages = getStagesForRole(req.user?.roleCode);
    const fetchAllStages = allowedStages == null;

    const stageTablesToFetch = fetchAllStages ? STAGE_TABLES : allowedStages;
    const stagePromises = stageTablesToFetch.map((table) =>
      supabase.from(table).select('*').eq('sample_id', sampleId).maybeSingle()
    );
    const shippingPromise = supabase.from('shipping_tracking').select('*').eq('sample_id', sampleId).order('created_at', { ascending: false });
    const historyPromise = fetchAllStages
      ? supabase.from('sample_history').select('*').eq('sample_id', sampleId).order('changed_at', { ascending: false })
      : Promise.resolve({ data: [] });
    const transitionsPromise = fetchAllStages
      ? supabase.from('status_transitions').select('*').eq('sample_id', sampleId).order('transitioned_at', { ascending: false })
      : Promise.resolve({ data: [] });

    const [stageResults, shipping, history, transitions] = await Promise.all([
      Promise.all(stagePromises),
      shippingPromise,
      historyPromise,
      transitionsPromise,
    ]);

    const stages = {
      product_business_dev: null,
      technical_design: null,
      factory_execution: null,
      merchandising_review: null,
      costing_analysis: null,
    };
    stageTablesToFetch.forEach((table, i) => {
      stages[table] = stageResults[i]?.data ?? null;
    });

    return res.json({
      ...sample,
      stages,
      shipping: shipping.data ?? [],
      history: history.data ?? [],
      status_transitions: transitions.data ?? [],
    });
  } catch (err) {
    console.error('samples getFull:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample' });
  }
};

export const create = async (req, res) => {
  try {
    const {
      style_number,
      style_name,
      color,
      qty,
      season_id,
      brand_id,
      division_id,
      category_id,
      sample_type_id,
      coo,
      current_status,
      current_stage,
      created_by,
    } = req.body;
    if (!style_number?.trim()) return res.status(400).json({ error: 'style_number is required' });
    if (!season_id || !brand_id || !division_id || !category_id || !sample_type_id || !created_by) {
      return res.status(400).json({ error: 'season_id, brand_id, division_id, category_id, sample_type_id, created_by are required' });
    }
    const payload = {
      style_number: style_number.trim(),
      style_name: style_name?.trim() || null,
      color: color?.trim() || null,
      qty: qty != null ? Number(qty) : null,
      season_id: Number(season_id),
      brand_id: Number(brand_id),
      division_id: Number(division_id),
      category_id: Number(category_id),
      sample_type_id: Number(sample_type_id),
      coo: coo?.trim() || null,
      current_status: current_status?.trim() || null,
      current_stage: current_stage?.trim() || null,
      created_by: Number(created_by),
    };
    const { data, error } = await supabase.from('samples').insert(payload).select(SAMPLE_SELECT).single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Sample with this style_number, color and season already exists' });
      if (error.code === '23503') return res.status(400).json({ error: 'Invalid foreign key (season, brand, division, category, sample_type, or user)' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'sample', resourceId: data?.id, details: { style_number: data?.style_number }, ip, userAgent });

    const userId = req.user?.id;
    await recordHistory(data.id, 'samples', 'current_stage', null, payload.current_stage, userId, 'Sample created');
    if (payload.current_status || payload.current_stage) {
      await recordTransition(data.id, null, payload.current_status, payload.current_stage, userId, 'Sample created');
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('samples create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create sample' });
  }
};

export const update = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const allowed = [
      'style_name', 'color', 'qty', 'coo', 'current_status', 'current_stage',
      'season_id', 'brand_id', 'division_id', 'category_id', 'sample_type_id',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (['season_id', 'brand_id', 'division_id', 'category_id', 'sample_type_id'].includes(key)) {
        updates[key] = Number(req.body[key]);
      } else if (key === 'qty') {
        updates[key] = req.body[key] != null ? Number(req.body[key]) : null;
      } else {
        updates[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

    const { data: oldRow } = await supabase
      .from('samples')
      .select('style_name, color, qty, coo, current_status, current_stage, season_id, brand_id, division_id, category_id, sample_type_id')
      .eq('id', sampleId)
      .maybeSingle();
    if (!oldRow) return res.status(404).json({ error: 'Sample not found' });

    const { data, error } = await supabase.from('samples').update(updates).eq('id', sampleId).select(SAMPLE_SELECT).maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Duplicate style_number, color, season' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Sample not found' });

    const userId = req.user?.id;
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId, action: 'update', resource: 'sample', resourceId: sampleId, details: { keys: Object.keys(updates) }, ip, userAgent });

    const historyPromises = [];
    for (const key of Object.keys(updates)) {
      const oldVal = oldRow[key] != null ? String(oldRow[key]) : null;
      const newVal = updates[key] != null ? String(updates[key]) : null;
      if (oldVal !== newVal) {
        historyPromises.push(recordHistory(sampleId, 'samples', key, oldVal, newVal, userId));
      }
    }
    await Promise.all(historyPromises);

    if (
      (updates.current_status !== undefined && String(updates.current_status) !== String(oldRow.current_status)) ||
      (updates.current_stage !== undefined && String(updates.current_stage) !== String(oldRow.current_stage))
    ) {
      await recordTransition(
        sampleId,
        oldRow.current_status,
        updates.current_status ?? oldRow.current_status,
        updates.current_stage ?? oldRow.current_stage,
        userId,
      );
    }

    return res.json(data);
  } catch (err) {
    console.error('samples update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update sample' });
  }
};

export const remove = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { error } = await supabase.from('samples').delete().eq('id', sampleId);
    if (error) throw error;
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'sample', resourceId: sampleId, ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('samples remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete sample' });
  }
};
