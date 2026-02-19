import { supabase } from '../config/supabase.js';
import { classifyOnTime, inMonthYear } from '../utils/date.js';

/**
 * On-time submission performance.
 * Uses sample_request: sample_due_denver (due) vs shipment_to_brand: sent_date (actual).
 */
export const submissionPerformance = async (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;

    // We join sample_request (for due dates) with shipment_to_brand (for actual dates)
    const { data: rows, error } = await supabase
      .from('sample_request')
      .select(`
        sample_id, 
        sample_due_denver, 
        styles(brand_id, brands(id, name)),
        shipment_to_brand(sent_date)
      `);

    if (error) throw error;

    let list = (rows || []).map((r) => ({
      sample_id: r.sample_id,
      due: r.sample_due_denver,
      actual: r.shipment_to_brand?.[0]?.sent_date ?? null,
      brand_id: r.styles?.brand_id ?? null,
      brand_name: r.styles?.brands?.name ?? null,
    }));

    if (brandId != null) list = list.filter((x) => x.brand_id === brandId);
    if (month != null || year != null) {
      list = list.filter((x) => inMonthYear(x.due, month, year));
    }

    const totals = { early: 0, on_time: 0, delay: 0, pending: 0 };
    const byBrand = {};

    for (const row of list) {
      const bucket = classifyOnTime(row.due, row.actual);
      totals[bucket] = (totals[bucket] || 0) + 1;

      const bid = row.brand_id ?? 'unknown';
      if (!byBrand[bid]) {
        byBrand[bid] = { brand_id: bid, brand_name: row.brand_name ?? 'Unknown', early: 0, on_time: 0, delay: 0, pending: 0 };
      }
      byBrand[bid][bucket]++;
    }

    const completed = totals.early + totals.on_time + totals.delay;
    const pct = (n) => (completed ? Math.round((n / completed) * 1000) / 10 : 0);

    return res.json({
      summary: {
        total: list.length,
        early: totals.early,
        on_time: totals.on_time,
        delay: totals.delay,
        pending: totals.pending,
        percentage: { early: pct(totals.early), on_time: pct(totals.on_time), delay: pct(totals.delay) },
      },
      byBrand: Object.values(byBrand),
    });
  } catch (err) {
    console.error('submissionPerformance error:', err);
    return res.status(500).json({ error: 'Failed' });
  }
};

export const deliveryPerformance = async (req, res) => {
  // Similar logic to submissionPerformance, potentially using arrival dates if added to schema later.
  // For now, we reuse the submission logic as a proxy for delivery to brand.
  return submissionPerformance(req, res);
};

export const dashboard = async (req, res) => {
  try {
    const { data: rows } = await supabase
      .from('sample_request')
      .select('sample_id, sample_due_denver, shipment_to_brand(sent_date)');

    let early = 0, onTime = 0, delay = 0, pending = 0;
    for (const r of (rows || [])) {
      const actual = r.shipment_to_brand?.[0]?.sent_date ?? null;
      const b = classifyOnTime(r.sample_due_denver, actual);
      if (b === 'early') early++; else if (b === 'on_time') onTime++; else if (b === 'delay') delay++; else pending++;
    }

    const stats = { total: rows?.length || 0, early, on_time: onTime, delay, pending };
    return res.json({
      submission: stats,
      delivery: stats
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    return res.status(500).json({ error: 'Dashboard failed' });
  }
};

export const submissionPerformanceStream = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('data: {"message": "Stream updated to new schema"}\n\n');
  res.end();
};

export const deliveryPerformanceStream = async (req, res) => {
  return submissionPerformanceStream(req, res);
};

export const pipeline = async (req, res) => res.json({ message: 'Legacy' });
export const bySeason = async (req, res) => res.json({ message: 'Legacy' });
export const byBrand = async (req, res) => res.json({ message: 'Legacy' });
export const byDivision = async (req, res) => res.json({ message: 'Legacy' });
export const delays = async (req, res) => res.json({ message: 'Legacy' });
