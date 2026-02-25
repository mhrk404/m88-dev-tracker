import { supabase } from '../config/supabase.js';

export const getAudit = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { data, error } = await supabase
      .from('stage_audit_log')
      .select('*')
      .eq('sample_id', sampleId)
      .order('created_at', { ascending: false });

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

    const { data: auditRows, error: auditError, count: auditCount } = await supabase
      .from('stage_audit_log')
      .select('*', { count: 'exact' })
      .eq('sample_id', sampleId)
      .order('timestamp', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (auditError) throw auditError;

    const rows = auditRows ?? [];
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
      users: null,
    }));

    const transitions = rows
      .filter((row) => row.field_changed === 'status' || row.field_changed === 'current_status' || row.field_changed === 'current_stage')
      .map((row) => ({
        id: row.log_id,
        sample_id: row.sample_id,
        from_status: row.field_changed === 'status' ? row.old_value : null,
        to_status: row.new_value,
        stage: row.stage,
        transitioned_by: row.user_id,
        transitioned_at: row.timestamp,
        notes: null,
        users: null,
      }));

    return res.json({
      sample_history: history ?? [],
      status_transitions: transitions ?? [],
      total: auditCount ?? 0,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err) {
    console.error('audit getSampleHistory:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get sample history' });
  }
};

