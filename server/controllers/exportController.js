import { supabase } from '../config/supabase.js';

function escapeCsvCell(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const samples = async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    let q = supabase
      .from('samples')
      .select('id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_at, created_by, seasons(name, year), brands(name), divisions(name), product_categories(name), sample_types(name)')
      .order('created_at', { ascending: false });
    const { season_id, brand_id } = req.query;
    if (season_id) q = q.eq('season_id', season_id);
    if (brand_id) q = q.eq('brand_id', brand_id);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];

    if (format === 'csv') {
      const headers = ['id', 'style_number', 'style_name', 'color', 'qty', 'season', 'brand', 'division', 'category', 'sample_type', 'coo', 'current_status', 'current_stage', 'created_at'];
      const lines = [headers.map(escapeCsvCell).join(',')];
      for (const r of rows) {
        lines.push([
          r.id,
          r.style_number,
          r.style_name ?? '',
          r.color ?? '',
          r.qty ?? '',
          (r.seasons?.name ?? '') + (r.seasons?.year ? ` ${r.seasons.year}` : ''),
          r.brands?.name ?? '',
          r.divisions?.name ?? '',
          r.product_categories?.name ?? '',
          r.sample_types?.name ?? '',
          r.coo ?? '',
          r.current_status ?? '',
          r.current_stage ?? '',
          r.created_at ?? '',
        ].map(escapeCsvCell).join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="samples.csv"');
      return res.send(lines.join('\n'));
    }
    return res.json(rows);
  } catch (err) {
    console.error('export samples:', err);
    return res.status(500).json({ error: err.message ?? 'Export failed' });
  }
};

export const pipeline = async (req, res) => {
  try {
    const { data, error } = await supabase.from('samples').select('id, style_number, current_stage, current_status').order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error('export pipeline:', err);
    return res.status(500).json({ error: err.message ?? 'Export failed' });
  }
};

export const analytics = async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    const { data: sub } = await supabase.from('product_business_dev').select('sample_id, sample_due_denver, sample_sent_brand_date, samples(brands(name))');
    const { data: ship } = await supabase.from('shipping_tracking').select('sample_id, estimated_arrival, actual_arrival, status, samples(brands(name))');
    const payload = { submission: sub ?? [], delivery: ship ?? [], exported_at: new Date().toISOString() };
    if (format === 'csv') {
      const lines = ['type,sample_id,brand,due,actual,status'];
      for (const r of sub ?? []) {
        lines.push(['submission', r.sample_id, r.samples?.brands?.name ?? '', r.sample_due_denver ?? '', r.sample_sent_brand_date ?? '', ''].map(escapeCsvCell).join(','));
      }
      for (const r of ship ?? []) {
        lines.push(['delivery', r.sample_id, r.samples?.brands?.name ?? '', r.estimated_arrival ?? '', r.actual_arrival ?? '', r.status ?? ''].map(escapeCsvCell).join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      return res.send(lines.join('\n'));
    }
    return res.json(payload);
  } catch (err) {
    console.error('export analytics:', err);
    return res.status(500).json({ error: err.message ?? 'Export failed' });
  }
};
