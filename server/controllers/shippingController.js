import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

export const list = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { data, error } = await supabase
      .from('shipping_tracking')
      .select('*')
      .eq('sample_id', sampleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('shipping list:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to list shipping' });
  }
};

export const getOne = async (req, res) => {
  try {
    const { sampleId, id } = req.params;
    const { data, error } = await supabase
      .from('shipping_tracking')
      .select('*')
      .eq('sample_id', sampleId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Shipping record not found' });
    return res.json(data);
  } catch (err) {
    console.error('shipping getOne:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get shipping' });
  }
};

export const create = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { awb, origin, destination, estimated_arrival, actual_arrival, status } = req.body;
    const payload = {
      sample_id: sampleId,
      awb: awb?.trim() || null,
      origin: origin?.trim() || null,
      destination: destination?.trim() || null,
      estimated_arrival: estimated_arrival || null,
      actual_arrival: actual_arrival || null,
      status: status?.trim() || null,
    };
    const { data, error } = await supabase.from('shipping_tracking').insert(payload).select('*').single();
    if (error) throw error;
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'create', resource: 'shipping', resourceId: data?.id, details: { sample_id: sampleId }, ip, userAgent });
    return res.status(201).json(data);
  } catch (err) {
    console.error('shipping create:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to create shipping record' });
  }
};

export const update = async (req, res) => {
  try {
    const { sampleId, id } = req.params;
    const { awb, origin, destination, estimated_arrival, actual_arrival, status } = req.body;
    const updates = {};
    if (awb !== undefined) updates.awb = awb?.trim() || null;
    if (origin !== undefined) updates.origin = origin?.trim() || null;
    if (destination !== undefined) updates.destination = destination?.trim() || null;
    if (estimated_arrival !== undefined) updates.estimated_arrival = estimated_arrival || null;
    if (actual_arrival !== undefined) updates.actual_arrival = actual_arrival || null;
    if (status !== undefined) updates.status = status?.trim() || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { data, error } = await supabase
      .from('shipping_tracking')
      .update(updates)
      .eq('sample_id', sampleId)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Shipping record not found' });
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'update', resource: 'shipping', resourceId: id, details: { sample_id: sampleId }, ip, userAgent });
    return res.json(data);
  } catch (err) {
    console.error('shipping update:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to update shipping' });
  }
};

export const remove = async (req, res) => {
  try {
    const { sampleId, id } = req.params;
    const { error } = await supabase.from('shipping_tracking').delete().eq('sample_id', sampleId).eq('id', id);
    if (error) throw error;
    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: req.user?.id, action: 'delete', resource: 'shipping', resourceId: id, details: { sample_id: sampleId }, ip, userAgent });
    return res.status(204).send();
  } catch (err) {
    console.error('shipping remove:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to delete shipping record' });
  }
};
