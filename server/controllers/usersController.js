import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';
import { canAccessRegion, isSuperAdmin, normalizeRegion, isValidRegion } from '../utils/regionScope.js';

const USER_SELECT = 'id, username, email, full_name, department, region, role_id, is_active, created_at, updated_at';

function requesterRegion(req) {
  return normalizeRegion(req.user?.region);
}

async function getUserById(id) {
  const { data, error } = await supabase.from('users').select(`${USER_SELECT}, roles(code, name)`).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureRegionAccess(req, userId) {
  if (isSuperAdmin(req)) return null;
  const row = await getUserById(userId);
  if (!row) return null;
  if (!canAccessRegion(req, row.region)) {
    const err = new Error('You can only access users within your region');
    err.statusCode = 403;
    throw err;
  }
  return row;
}

async function getRoleCodeById(roleId) {
  if (roleId == null) return null;
  const numericRoleId = Number(roleId);
  if (Number.isNaN(numericRoleId)) return null;
  const { data, error } = await supabase.from('roles').select('code').eq('id', numericRoleId).maybeSingle();
  if (error) throw error;
  return (data?.code || '').toUpperCase() || null;
}

function canAssignRole(req, assignedRoleCode) {
  if (!assignedRoleCode) return true;
  if (assignedRoleCode === 'SUPER_ADMIN') return isSuperAdmin(req);
  if (assignedRoleCode === 'ADMIN') return isSuperAdmin(req);
  return true;
}

export const list = async (req, res) => {
  try {
    let query = supabase.from('users').select(`${USER_SELECT}, roles(code, name)`).order('username');
    if (!isSuperAdmin(req)) {
      const actorRegion = requesterRegion(req);
      if (!actorRegion) {
        return res.status(403).json({ error: 'Your account has no region scope. Please re-login or contact super admin.' });
      }
      query = query.eq('region', actorRegion);
    }
    const { data, error } = await query;
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
    const data = await ensureRegionAccess(req, id) || await getUserById(id);
    if (!data) return res.status(404).json({ error: 'User not found' });
    const u = { ...data, roleCode: data.roles?.code, roleName: data.roles?.name };
    delete u.roles;
    return res.json(u);
  } catch (err) {
    console.error('users getOne:', err);
    return res.status(err.statusCode || 500).json({ error: err.message ?? 'Failed to get user' });
  }
};

export const create = async (req, res) => {
  try {
    const { username, email, full_name, department, role_id, region, is_active = true, password } = req.body;
    if (!username?.trim()) return res.status(400).json({ error: 'username is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

    const actorRegion = requesterRegion(req);
    if (!isSuperAdmin(req) && !actorRegion) {
      return res.status(403).json({ error: 'Your account has no region scope. Please re-login or contact super admin.' });
    }

    const normalizedRegion = isSuperAdmin(req)
      ? (normalizeRegion(region) || actorRegion || 'US')
      : actorRegion;

    if (!isValidRegion(normalizedRegion)) {
      return res.status(400).json({ error: 'region must be one of: US, PH, INDONESIA' });
    }

    let assignedRoleCode = null;
    if (role_id !== undefined && role_id !== null) {
      assignedRoleCode = await getRoleCodeById(role_id);
      if (!assignedRoleCode) return res.status(400).json({ error: 'Invalid role_id' });
      if (!canAssignRole(req, assignedRoleCode)) {
        return res.status(403).json({ error: `Only super admin can assign ${assignedRoleCode} role` });
      }
      if (assignedRoleCode === 'ADMIN' && !normalizeRegion(region)) {
        return res.status(400).json({ error: 'region is required when creating an ADMIN account' });
      }
    }

    let payload = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || null,
      department: department?.trim() || null,
      region: normalizedRegion,
      role_id: role_id ?? null,
      is_active: !!is_active,
    };
    
    // Hash password if provided
    if (password) {
      const bcrypt = (await import('bcryptjs')).default;
      const SALT_ROUNDS = 12;
      payload.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    }
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
    const existing = await ensureRegionAccess(req, id) || await getUserById(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const actorRegion = requesterRegion(req);
    if (!isSuperAdmin(req) && !actorRegion) {
      return res.status(403).json({ error: 'Your account has no region scope. Please re-login or contact super admin.' });
    }

    const { username, email, full_name, department, role_id, region, is_active } = req.body;
    const updates = {};
    if (username !== undefined) updates.username = username.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
    if (department !== undefined) updates.department = department?.trim() || null;
    if (region !== undefined) {
      const normalizedRegion = normalizeRegion(region);
      if (!normalizedRegion || !isValidRegion(normalizedRegion)) {
        return res.status(400).json({ error: 'region must be one of: US, PH, INDONESIA' });
      }
      if (!isSuperAdmin(req) && normalizedRegion !== actorRegion) {
        return res.status(403).json({ error: 'You can only move users within your region' });
      }
      updates.region = normalizedRegion;
    }
    if (role_id !== undefined) updates.role_id = role_id;
    if (role_id !== undefined && role_id !== null) {
      const assignedRoleCode = await getRoleCodeById(role_id);
      if (!assignedRoleCode) return res.status(400).json({ error: 'Invalid role_id' });
      if (!canAssignRole(req, assignedRoleCode)) {
        return res.status(403).json({ error: `Only super admin can assign ${assignedRoleCode} role` });
      }

      const targetRegion = normalizeRegion(updates.region ?? existing.region);
      if (assignedRoleCode === 'ADMIN') {
        if (!targetRegion || !isValidRegion(targetRegion)) {
          return res.status(400).json({ error: 'ADMIN account must have a valid region: US, PH, INDONESIA' });
        }
        updates.region = targetRegion;
      }
    }
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
    return res.status(err.statusCode || 500).json({ error: err.message ?? 'Failed to update user' });
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
    const existing = await ensureRegionAccess(req, id) || await getUserById(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const replacementId = await getReplacementUserId(id);
    if (!replacementId) {
      return res.status(409).json({ error: 'Cannot delete the only user. Create another user first.' });
    }

    // New schema tables
    const tablesWithNotNullUserFk = [
      { table: 'sample_request', column: 'created_by' },
    ];
    const tablesWithNullableUserFk = [
      { table: 'team_assignment', column: 'pbd_user_id' },
      { table: 'team_assignment', column: 'td_user_id' },
      { table: 'team_assignment', column: 'fty_user_id' },
      { table: 'team_assignment', column: 'fty_md2_user_id' },
      { table: 'team_assignment', column: 'md_user_id' },
      { table: 'team_assignment', column: 'costing_user_id' },
      { table: 'sample_role_owner', column: 'user_id' },
      { table: 'sample_role_owner', column: 'entered_by' },
      { table: 'stage_audit_log', column: 'user_id' },
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
    if (error) throw error;

    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'user', resourceId: String(id), ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('users remove:', err);
    return res.status(err.statusCode || 500).json({ error: err.message ?? 'Failed to delete user' });
  }
};
