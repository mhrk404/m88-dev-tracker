import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

const USER_SELECT = 'id, supabase_user_id, username, email, full_name, department, role_id, is_active, created_at, updated_at';

export const list = async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select(`${USER_SELECT}, roles(code, name)`).order('username');
    if (error) throw error;
    const list = (data ?? []).map((u) => ({ ...u, roleCode: u.roles?.code, roleName: u.roles?.name, roles: undefined }));
    return res.json(list);
  } catch (err) {
    console.error('users list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list users' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { data, error } = await supabase.from('users').select(`${USER_SELECT}, roles(code, name)`).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    const u = { ...data, roleCode: data.roles?.code, roleName: data.roles?.name };
    delete u.roles;
    return res.json(u);
  } catch (err) {
    console.error('users getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get user' });
  }
};

export const create = async (req, res) => {
  try {
    const { username, email, full_name, department, role_id, is_active = true } = req.body;
    if (!username?.trim()) return res.status(400).json({ error: 'username is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'email is required' });
    const payload = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || null,
      department: department?.trim() || null,
      role_id: role_id ?? null,
      is_active: !!is_active,
    };
    const { data, error } = await supabase.from('users').insert(payload).select(USER_SELECT).single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
      if (error.code === '23503') return res.status(400).json({ error: 'Invalid role_id' });
      throw error;
    }
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'user', resourceId: String(data?.id), details: { username: data?.username }, ip, userAgent });
    return res.status(201).json(data);
  } catch (err) {
    console.error('users create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create user' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { username, email, full_name, department, role_id, is_active } = req.body;
    const updates = {};
    if (username !== undefined) updates.username = username.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
    if (department !== undefined) updates.department = department?.trim() || null;
    if (role_id !== undefined) updates.role_id = role_id;
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select(USER_SELECT).maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'User not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'user', resourceId: String(id), details: { keys: Object.keys(updates) }, ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('users update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update user' });
  }
};

/**
 * Pick a replacement user ID for NOT NULL FKs when deleting a user.
 * Prefer the current requester if not deleting self; otherwise any other user.
 */
async function getReplacementUserId(deletedUserId) {
  const currentId = Number(deletedUserId);
  const { data: others } = await supabase.from('users').select('id').neq('id', currentId).limit(1);
  return others?.[0]?.id ?? null;
}

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const replacementId = await getReplacementUserId(id);
    if (!replacementId) {
      return res.status(409).json({ error: 'Cannot delete the only user. Create another user first.' });
    }

    const tablesWithNotNullUserFk = [
      { table: 'samples', column: 'created_by' },
      { table: 'sample_history', column: 'changed_by' },
      { table: 'status_transitions', column: 'transitioned_by' },
    ];
    const tablesWithNullableUserFk = [
      { table: 'product_business_dev', column: 'owner_id' },
      { table: 'technical_design', column: 'owner_id' },
      { table: 'factory_execution', column: 'owner_id' },
      { table: 'factory_execution', column: 'fty_md2' },
      { table: 'merchandising_review', column: 'owner_id' },
      { table: 'costing_analysis', column: 'analyst_id' },
      { table: 'costing_analysis', column: 'brand_communication_owner_id' },
      { table: 'audit_log', column: 'user_id' },
    ];

    for (const { table, column } of tablesWithNotNullUserFk) {
      const { error } = await supabase.from(table).update({ [column]: replacementId }).eq(column, id);
      if (error) throw error;
    }
    for (const { table, column } of tablesWithNullableUserFk) {
      const { error } = await supabase.from(table).update({ [column]: null }).eq(column, id);
      if (error) throw error;
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        return res.status(409).json({ error: 'User is still referenced; reassignment failed or another table references users.' });
      }
      throw error;
    }

    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'user', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('users remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete user' });
  }
};
