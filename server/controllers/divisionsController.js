import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

export const list = async (req, res) => {
  try {
    const { data, error } = await supabase.from('divisions').select('*').order('name');
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('divisions list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list divisions' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = await supabase.from('divisions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Division not found' });
    return res.json(data);
  } catch (err) {
    console.error('divisions getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get division' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, is_active = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const { data, error } = await supabase.from('divisions').insert({ name: name.trim(), is_active: !!is_active }).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Division with this name already exists' });
      throw error;
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('divisions create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create division' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('divisions').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Division with this name already exists' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Division not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'division', resourceId: String(id), ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('divisions update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update division' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { error } = await supabase.from('divisions').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'Division is in use and cannot be deleted' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'division', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('divisions remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete division' });
  }
};
