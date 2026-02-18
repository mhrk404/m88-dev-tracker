import { supabase } from '../config/supabase.js';

export const getAudit = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const [history, transitions] = await Promise.all([
      supabase.from('sample_history').select('*').eq('sample_id', sampleId).order('changed_at', { ascending: false }),
      supabase.from('status_transitions').select('*').eq('sample_id', sampleId).order('transitioned_at', { ascending: false }),
    ]);
    if (history.error) throw history.error;
    if (transitions.error) throw transitions.error;
    return res.json({
      history: history.data ?? [],
      status_transitions: transitions.data ?? [],
    });
  } catch (err) {
    console.error('audit getAudit:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get audit' });
  }
};
