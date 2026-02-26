import { supabase } from '../config/supabase.js';

const FULL_HISTORY_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'PBD']);

const ROLE_STAGE_SCOPE = {
  TD: ['psi'],
  FTY: ['sample_development'],
  MD: ['pc_review'],
  COSTING: ['costing'],
  BRAND: ['shipment_to_brand', 'delivered_confirmation'],
};

function normalizeStage(value) {
  if (value == null) return null;
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function canSeeFullHistory(roleCode) {
  return FULL_HISTORY_ROLES.has(String(roleCode || '').toUpperCase());
}

function isRowVisibleForRole(row, roleCode) {
  const role = String(roleCode || '').toUpperCase();
  if (canSeeFullHistory(role)) return true;

  const allowedStages = ROLE_STAGE_SCOPE[role] ?? [];
  if (allowedStages.length === 0) return false;

  const field = String(row?.field_changed || '').toLowerCase();
  const candidates = [normalizeStage(row?.stage)];
  if (field === 'current_stage') {
    candidates.push(normalizeStage(row?.old_value));
    candidates.push(normalizeStage(row?.new_value));
  }

  return candidates.some((stage) => !!stage && allowedStages.includes(stage));
}

async function getUsersMap(userIds) {
  if (!userIds.length) return new Map();

  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name')
    .in('id', userIds);

  if (error) throw error;

  return new Map((data ?? []).map((user) => [user.id, user]));
}

export const getAudit = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { data, error } = await supabase
      .from('stage_audit_log')
      .select('*')
      .eq('sample_id', sampleId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return res.json({
      history: data ?? [],
      status_transitions: [],
    });
  } catch (err) {
    console.error('audit getAudit:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get audit' });
  }
};

export const getAllActivityLogs = async (req, res) => {
  try {
    const {
      limit = 500,
      offset = 0,
      action,
      resource,
      user_id,
      start,
      end,
      sortBy = 'timestamp',
      sortDir = 'desc',
    } = req.query;
    const limitNum = Math.min(parseInt(limit) || 500, 1000);
    const offsetNum = parseInt(offset) || 0;

    let query = supabase.from('audit_log').select('*', { count: 'exact' });
    // Filtering
    if (action) query = query.ilike('action', `%${action}%`);
    if (resource) query = query.ilike('resource', `%${resource}%`);
    if (user_id) query = query.eq('user_id', user_id);
    if (start) query = query.gte('timestamp', start);
    if (end) query = query.lte('timestamp', end);

    // Sorting
    const validSortCols = ['timestamp', 'action', 'resource', 'user_id'];
    const sortCol = validSortCols.includes(sortBy) ? sortBy : 'timestamp';
    const ascending = sortDir === 'asc';
    query = query.order(sortCol, { ascending });

    // Pagination
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      logs: data ?? [],
      total: count ?? 0,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err) {
    console.error('audit getAllActivityLogs:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get activity logs' });
  }
};

export const getSampleHistory = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 100, 500);
    const offsetNum = parseInt(offset) || 0;
    const roleCode = req.user?.roleCode;

    const { data: auditRows, error: auditError } = await supabase
      .from('stage_audit_log')
      .select('*')
      .eq('sample_id', sampleId)
      .order('timestamp', { ascending: false });

    if (auditError) throw auditError;

    const allRows = auditRows ?? [];
    const visibleRows = allRows.filter((row) => isRowVisibleForRole(row, roleCode));
    const rows = visibleRows.slice(offsetNum, offsetNum + limitNum);

    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
    const usersMap = await getUsersMap(userIds);

    const history = rows.map((row) => ({
      id: row.log_id,
      sample_id: row.sample_id,
      table_name: row.stage,
      field_name: row.field_changed,
      old_value: row.old_value,
      new_value: row.new_value,
      changed_by: row.user_id,
      changed_at: row.timestamp,
      change_notes: null,
      users: row.user_id ? usersMap.get(row.user_id) ?? null : null,
    }));

    const transitions = rows
      .filter((row) => {
        const field = String(row.field_changed || '').toLowerCase();
        return field === 'status' || field === 'current_status' || field === 'sample_status' || field === 'current_stage';
      })
      .map((row) => ({
        id: row.log_id,
        sample_id: row.sample_id,
        from_status: String(row.field_changed || '').toLowerCase() === 'current_stage' ? null : row.old_value,
        to_status: String(row.field_changed || '').toLowerCase() === 'current_stage' ? null : row.new_value,
        from_stage: String(row.field_changed || '').toLowerCase() === 'current_stage' ? row.old_value : null,
        to_stage: String(row.field_changed || '').toLowerCase() === 'current_stage'
          ? row.new_value
          : row.stage,
        transitioned_by: row.user_id,
        transitioned_at: row.timestamp,
        notes: null,
        users: row.user_id ? usersMap.get(row.user_id) ?? null : null,
      }));

    return res.json({
      sample_history: history ?? [],
      status_transitions: transitions ?? [],
      total: visibleRows.length,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err) {
    console.error('audit getSampleHistory:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample history' });
  }
};

