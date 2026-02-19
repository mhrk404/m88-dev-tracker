import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

const STYLE_SELECT = `
  style_id, brand_id, season_id, style_number, style_name, division, product_category, color, qty, coo,
  created_at, updated_at,
  brands(name),
  seasons(name, year, code)
`;

export const list = async (req, res) => {
  try {
    let q = supabase.from('styles').select(STYLE_SELECT).order('created_at', { ascending: false });
    const { brand_id, season_id } = req.query;
    if (brand_id) q = q.eq('brand_id', brand_id);
    if (season_id) q = q.eq('season_id', season_id);
    const { data, error } = await q;
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('styles list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list styles' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid style_id' });
    const { data, error } = await supabase.from('styles').select(STYLE_SELECT).eq('style_id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Style not found' });
    return res.json(data);
  } catch (err) {
    console.error('styles getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get style' });
  }
};

export const create = async (req, res) => {
  try {
    const { brand_id, season_id, style_number, style_name, division, product_category, color, qty, coo } = req.body;
    if (!style_number?.trim() || !brand_id || !season_id) {
      return res.status(400).json({ error: 'style_number, brand_id, and season_id are required' });
    }
    const payload = {
      brand_id: Number(brand_id),
      season_id: Number(season_id),
      style_number: style_number.trim(),
      style_name: style_name?.trim() || null,
      division: division?.trim() || null,
      product_category: product_category?.trim() || null,
      color: color?.trim() || null,
      qty: qty != null ? Number(qty) : null,
      coo: coo?.trim() || null,
    };
    const { data, error } = await supabase.from('styles').insert(payload).select(STYLE_SELECT).single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Style with this style_number, color and season already exists' });
      if (error.code === '23503') return res.status(400).json({ error: 'Invalid brand_id or season_id' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'style', resourceId: String(data?.style_id), details: { style_number: data?.style_number }, ip, userAgent });
    return res.status(201).json(data);
  } catch (err) {
    console.error('styles create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create style' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid style_id' });
    const allowed = ['style_name', 'division', 'product_category', 'color', 'qty', 'coo'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (key === 'qty') {
        updates[key] = req.body[key] != null ? Number(req.body[key]) : null;
      } else {
        updates[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('styles').update(updates).eq('style_id', id).select(STYLE_SELECT).maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Duplicate style_number, color, season' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Style not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'style', resourceId: String(id), details: { keys: Object.keys(updates) }, ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('styles update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update style' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid style_id' });
    const { error } = await supabase.from('styles').delete().eq('style_id', id);
    if (error) throw error;
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'style', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('styles remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete style' });
  }
};
