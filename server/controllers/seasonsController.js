import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

export const list = async (req, res) => {
  try {
    const { data, error } = await supabase.from('seasons').select('*').order('year', { ascending: false }).order('name');
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('seasons list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list seasons' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Season not found' });
    return res.json(data);
  } catch (err) {
    console.error('seasons getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get season' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, year, start_date, end_date, is_active = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (year == null) return res.status(400).json({ error: 'year is required' });
    const { data, error } = await supabase
      .from('seasons')
      .insert({ name: name.trim(), year: Number(year), start_date: start_date || null, end_date: end_date || null, is_active: !!is_active })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Season with this name and year already exists' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'season', resourceId: String(data?.id), ip, userAgent });
    return res.status(201).json(data);
  } catch (err) {
    console.error('seasons create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create season' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, year, start_date, end_date, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (year !== undefined) updates.year = Number(year);
    if (start_date !== undefined) updates.start_date = start_date || null;
    if (end_date !== undefined) updates.end_date = end_date || null;
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('seasons').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Season with this name and year already exists' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Season not found' });
    return res.json(data);
  } catch (err) {
    console.error('seasons update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update season' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'Season is in use and cannot be deleted' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'season', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('seasons remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete season' });
  }
};
