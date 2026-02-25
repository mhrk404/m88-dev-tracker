import { supabase } from '../config/supabase.js';
import { classifyOnTime, getMonthYear, inDateRange, inMonthYear } from '../utils/date.js';

const escapeCsv = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const isDeliveredStatus = (status) => {
  const s = String(status || '').trim().toLowerCase();
  return s.includes('deliver');
};

const buildPerformanceData = async ({ brandId, seasonId, productCategory, month, year, startDate, endDate, deliveredOnly = false }) => {
  const { data: rows, error } = await supabase
    .from('sample_request')
    .select(`
      sample_id,
      current_status,
      sample_due_denver,
      styles(style_id, brand_id, season_id, product_category, brands(id, name)),
      shipment_to_brand(sent_date)
    `);

  if (error) throw error;

  let list = (rows || []).map((r) => ({
    sample_id: r.sample_id,
    current_status: r.current_status,
    style_id: r.styles?.style_id ?? null,
    due: r.sample_due_denver,
    actual: r.shipment_to_brand?.[0]?.sent_date ?? null,
    brand_id: r.styles?.brand_id ?? null,
    season_id: r.styles?.season_id ?? null,
    brand_name: r.styles?.brands?.name ?? null,
    product: r.styles?.product_category ?? 'Uncategorized',
  }));

  if (deliveredOnly) {
    list = list.filter((x) => isDeliveredStatus(x.current_status));
  }

  if (brandId != null) list = list.filter((x) => x.brand_id === brandId);
  if (seasonId != null) list = list.filter((x) => x.season_id === seasonId);
  if (productCategory != null) list = list.filter((x) => x.product === productCategory);
  if (month != null || year != null) {
    list = list.filter((x) => inMonthYear(x.due, month, year));
  }
  if (startDate != null || endDate != null) {
    list = list.filter((x) => inDateRange(x.due, startDate, endDate));
  }

  const totals = { early: 0, on_time: 0, delay: 0, pending: 0 };
  const byBrand = {};
  const byProduct = {};
  const byTime = {};
  const styleCountsByBrand = {};

  for (const row of list) {
    const bucket = classifyOnTime(row.due, row.actual);
    totals[bucket] = (totals[bucket] || 0) + 1;

    const bid = row.brand_id ?? 'unknown';
    if (!byBrand[bid]) {
      byBrand[bid] = { brand_id: bid, brand_name: row.brand_name ?? 'Unknown', early: 0, on_time: 0, delay: 0, pending: 0 };
      styleCountsByBrand[bid] = new Set();
    }
    byBrand[bid][bucket]++;
    if (row.style_id) {
      styleCountsByBrand[bid].add(row.style_id);
    }

    const product = row.product || 'Uncategorized';
    if (!byProduct[product]) {
      byProduct[product] = { product, early: 0, on_time: 0, delay: 0, pending: 0 };
    }
    byProduct[product][bucket]++;

    const monthYear = getMonthYear(row.due);
    if (monthYear) {
      const key = `${monthYear.year}-${String(monthYear.month).padStart(2, '0')}`;
      if (!byTime[key]) {
        byTime[key] = {
          label: key,
          year: monthYear.year,
          month: monthYear.month,
          early: 0,
          on_time: 0,
          delay: 0,
          pending: 0,
          total: 0,
        };
      }
      byTime[key][bucket]++;
      byTime[key].total++;
    }
  }

  const completed = totals.early + totals.on_time + totals.delay;
  const pct = (n) => (completed ? Math.round((n / completed) * 1000) / 10 : 0);

  const byBrandList = Object.values(byBrand).map((row) => {
    const total = row.early + row.on_time + row.delay + row.pending;
    const styleCount = styleCountsByBrand[row.brand_id]?.size ?? 0;
    return { ...row, total, style_count: styleCount };
  });

  return {
    summary: {
      total: list.length,
      early: totals.early,
      on_time: totals.on_time,
      delay: totals.delay,
      pending: totals.pending,
      percentage: { early: pct(totals.early), on_time: pct(totals.on_time), delay: pct(totals.delay) },
    },
    byBrand: byBrandList,
    byProduct: Object.values(byProduct),
    trend: Object.values(byTime).sort((a, b) => (a.year - b.year) || (a.month - b.month)),
  };
};

/**
 * On-time submission performance.
 * Uses sample_request: sample_due_denver (due) vs shipment_to_brand: sent_date (actual).
 */
export const submissionPerformance = async (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    const productCategory = req.query.productCategory ?? null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const startDate = req.query.startDate ?? null;
    const endDate = req.query.endDate ?? null;
    const data = await buildPerformanceData({ brandId, seasonId, productCategory, month, year, startDate, endDate });
    return res.json(data);
  } catch (err) {
    console.error('submissionPerformance error:', err);
    return res.status(500).json({ error: 'Failed' });
  }
};

export const deliveryPerformance = async (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    const productCategory = req.query.productCategory ?? null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const startDate = req.query.startDate ?? null;
    const endDate = req.query.endDate ?? null;

    const data = await buildPerformanceData({ brandId, seasonId, productCategory, month, year, startDate, endDate, deliveredOnly: true });
    return res.json(data);
  } catch (err) {
    console.error('deliveryPerformance error:', err);
    return res.status(500).json({ error: 'Failed' });
  }
};

export const deliveryPerformanceExport = async (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    const productCategory = req.query.productCategory ?? null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const startDate = req.query.startDate ?? null;
    const endDate = req.query.endDate ?? null;
    const status = req.query.status ?? 'all';
    const threshold = req.query.threshold ?? 'all';

    const data = await buildPerformanceData({ brandId, seasonId, productCategory, month, year, startDate, endDate, deliveredOnly: true });
    let rows = data.byBrand || [];

    if (status !== 'all') {
      rows = rows.filter((row) => row[status] > 0);
    }
    if (threshold !== 'all') {
      const maxValue = Number(threshold);
      rows = rows.filter((row) => {
        const completed = row.early + row.on_time + row.delay;
        const onTimePct = completed ? Math.round((row.on_time / completed) * 1000) / 10 : 0;
        return onTimePct <= maxValue;
      });
    }

    const header = [
      'Brand',
      'Early',
      'On-Time',
      'Delayed',
      'Pending',
      'Total Deliveries',
      'Total Styles',
      'On-Time %'
    ];

    const lines = rows.map((row) => {
      const total = row.total ?? (row.early + row.on_time + row.delay + row.pending);
      const completed = row.early + row.on_time + row.delay;
      const onTimePct = completed ? Math.round((row.on_time / completed) * 1000) / 10 : 0;
      return [
        row.brand_name,
        row.early,
        row.on_time,
        row.delay,
        row.pending,
        total,
        row.style_count ?? 0,
        `${onTimePct}%`,
      ].map(escapeCsv).join(',');
    });

    const csv = [header.map(escapeCsv).join(','), ...lines].join('\n');
    const suffix = [
      brandId != null ? `brand-${brandId}` : 'all-brands',
      month != null ? `month-${month}` : null,
      year != null ? `year-${year}` : null,
    ].filter(Boolean).join('_');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="delivery-table_${suffix || 'all'}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('deliveryPerformanceExport error:', err);
    return res.status(500).json({ error: 'Failed' });
  }
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
