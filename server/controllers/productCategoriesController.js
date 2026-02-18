import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

export const list = async (req, res) => {
  try {
    const { data, error } = await supabase.from('product_categories').select('*').order('name');
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('product_categories list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list product categories' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = await supabase.from('product_categories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product category not found' });
    return res.json(data);
  } catch (err) {
    console.error('product_categories getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get product category' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, parent_id, is_active = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ name: name.trim(), parent_id: parent_id ?? null, is_active: !!is_active })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Product category with this name already exists' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'product_category', resourceId: String(data?.id), ip, userAgent });
    return res.status(201).json(data);
  } catch (err) {
    console.error('product_categories create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create product category' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, parent_id, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (parent_id !== undefined) updates.parent_id = parent_id ?? null;
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('product_categories').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Product category with this name already exists' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Product category not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'product_category', resourceId: String(id), ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('product_categories update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update product category' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { error } = await supabase.from('product_categories').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'Product category is in use or has children' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'product_category', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('product_categories remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete product category' });
  }
};
