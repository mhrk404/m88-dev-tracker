import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

export const list = async (req, res) => {
  try {
    const { data, error } = await supabase.from('sample_types').select('*').order('name');
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('sample_types list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list sample types' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = await supabase.from('sample_types').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Sample type not found' });
    return res.json(data);
  } catch (err) {
    console.error('sample_types getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample type' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, group = null, description, is_active = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const { data, error } = await supabase.from('sample_types').insert({
      name: name.trim(),
      group: group?.trim() || null,
      description: description?.trim() || null,
      is_active: !!is_active,
    }).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Sample type with this name already exists' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'sample_type', resourceId: String(data?.id), details: { name: data?.name }, ip, userAgent });
    return res.status(201).json(data);
  } catch (err) {
    console.error('sample_types create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create sample type' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, group, description, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (group !== undefined) updates.group = group.trim();
    if (description !== undefined) updates.description = description.trim();
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('sample_types').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Sample type with this name already exists' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Sample type not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'sample_type', resourceId: String(id), ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('sample_types update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update sample type' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { error } = await supabase.from('sample_types').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'Sample type is in use and cannot be deleted' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'sample_type', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('sample_types remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete sample type' });
  }
};
