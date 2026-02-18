import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

export const list = async (req, res) => {
  try {
    const { data, error } = await supabase.from('roles').select('*').order('name');
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('roles list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list roles' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Role not found' });
    return res.json(data);
  } catch (err) {
    console.error('roles getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get role' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, code, is_active = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });
    const { data, error } = await supabase
      .from('roles')
      .insert({ name: name.trim(), code: code.trim().toUpperCase(), is_active: !!is_active })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Role with this name or code already exists' });
      throw error;
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('roles create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create role' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, code, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('roles').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Role with this name or code already exists' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Role not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'role', resourceId: String(id), ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('roles update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update role' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'Role is in use and cannot be deleted' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'role', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('roles remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete role' });
  }
};
