import { supabase } from '../config/supabase.js';

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
      status_transitions: [], // Keeping structure for frontend compatibility
    });
  } catch (err) {
    console.error('audit getAudit:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get audit' });
  }
};

