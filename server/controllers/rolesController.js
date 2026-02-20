import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

const ROLE_PERMISSION_STAGES = [
  'PSI',
  'SAMPLE_DEVELOPMENT',
  'PC_REVIEW',
  'COSTING',
  'SCF',
  'SHIPMENT_TO_BRAND',
];

const ROLE_PERMISSION_FEATURES = [
  'USERS',
  'ROLES',
  'BRANDS',
  'SEASONS',
  'DIVISIONS',
  'PRODUCT_CATEGORIES',
  'SAMPLE_TYPES',
  'ANALYTICS',
  'EXPORT',
];

const ROLE_PERMISSION_KEYS = [...ROLE_PERMISSION_STAGES, ...ROLE_PERMISSION_FEATURES];

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
    const { code, name, is_active = true } = req.body;
    if (!code?.trim() || !name?.trim()) return res.status(400).json({ error: 'code and name are required' });
    const { data, error } = await supabase.from('roles').insert({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      is_active: !!is_active,
    }).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Role with this code already exists' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'role', resourceId: String(data?.id), details: { code: data?.code }, ip, userAgent });
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
    const { code, name, is_active } = req.body;
    const updates = {};
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (name !== undefined) updates.name = name.trim();
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('roles').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Role with this code already exists' });
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

export const listPermissions = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { data: role, error: roleErr } = await supabase
      .from('roles')
      .select('id, code, name')
      .eq('id', id)
      .maybeSingle();
    if (roleErr) throw roleErr;
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const { data: stageData, error: stageError } = await supabase
      .from('role_permission')
      .select('role, stage, can_read, can_write, can_approve')
      .eq('role', role.code)
      .order('stage');
    if (stageError) throw stageError;

    const { data: featureData, error: featureError } = await supabase
      .from('role_feature_permission')
      .select('role, feature, can_read, can_write, can_approve')
      .eq('role', role.code)
      .order('feature');

    if (featureError && featureError.code !== '42P01') throw featureError;

    const stageMap = new Map((stageData || []).map((row) => [row.stage, row]));
    const featureMap = new Map((featureData || []).map((row) => [row.feature, row]));
    const permissions = ROLE_PERMISSION_KEYS.map((key) => {
      const row = ROLE_PERMISSION_STAGES.includes(key) ? stageMap.get(key) : featureMap.get(key);
      return {
        role: role.code,
        stage: key,
        can_read: !!row?.can_read,
        can_write: !!row?.can_write,
        can_approve: !!row?.can_approve,
      };
    });

    return res.json({ role, permissions });
  } catch (err) {
    console.error('roles listPermissions:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list role permissions' });
  }
};

export const updatePermissions = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { data: role, error: roleErr } = await supabase
      .from('roles')
      .select('id, code, name')
      .eq('id', id)
      .maybeSingle();
    if (roleErr) throw roleErr;
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : null;
    if (!permissions) return res.status(400).json({ error: 'permissions array is required' });

    const stageUpserts = [];
    const featureUpserts = [];
    for (const p of permissions) {
      const stage = String(p?.stage || '').trim().toUpperCase();
      if (!ROLE_PERMISSION_KEYS.includes(stage)) {
        return res.status(400).json({ error: `Invalid stage: ${stage || '(empty)'}` });
      }
      if (ROLE_PERMISSION_STAGES.includes(stage)) {
        stageUpserts.push({
          role: role.code,
          stage,
          can_read: !!p?.can_read,
          can_write: !!p?.can_write,
          can_approve: !!p?.can_approve,
        });
      } else {
        featureUpserts.push({
          role: role.code,
          feature: stage,
          can_read: !!p?.can_read,
          can_write: !!p?.can_write,
          can_approve: !!p?.can_approve,
        });
      }
    }

    if (stageUpserts.length === 0 && featureUpserts.length === 0) {
      return res.status(400).json({ error: 'At least one permission row is required' });
    }

    if (stageUpserts.length > 0) {
      const { error } = await supabase
        .from('role_permission')
        .upsert(stageUpserts, { onConflict: 'role,stage' });
      if (error) throw error;
    }

    if (featureUpserts.length > 0) {
      const { error } = await supabase
        .from('role_feature_permission')
        .upsert(featureUpserts, { onConflict: 'role,feature' });
      if (error) throw error;
    }

    const { ip, userAgent } = auditMeta(req);
    await logAudit({
      userId: req.user?.id,
      action: 'update',
      resource: 'role_permission',
      resourceId: String(role.id),
      details: {
        code: role.code,
        stages: stageUpserts.map((u) => u.stage),
        features: featureUpserts.map((u) => u.feature),
      },
      ip,
      userAgent,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('roles updatePermissions:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update role permissions' });
  }
};
