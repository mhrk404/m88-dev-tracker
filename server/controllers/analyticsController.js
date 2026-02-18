import { supabase } from '../config/supabase.js';
import { classifyOnTime, inMonthYear } from '../utils/date.js';

/**
 * On-time submission performance.
 * Uses product_business_dev: sample_due_denver (due) vs sample_sent_brand_date (actual).
 * Query params: brandId (optional), month (1-12), year.
 */
export const submissionPerformance = async (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;

    const { data: rows, error } = await supabase
      .from('product_business_dev')
      .select('sample_id, sample_due_denver, sample_sent_brand_date, samples(brand_id, brands(id, name))');

    if (error) throw error;

    let list = (rows || []).map((r) => ({
      sample_id: r.sample_id,
      due: r.sample_due_denver,
      actual: r.sample_sent_brand_date,
      brand_id: r.samples?.brand_id ?? null,
      brand_name: r.samples?.brands?.name ?? null,
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

    const totalCount = list.length;
    const completed = totals.early + totals.on_time + totals.delay;
    const pct = (n) => (completed ? Math.round((n / completed) * 1000) / 10 : 0);

    return res.json({
      filters: { brandId: brandId ?? undefined, month: month ?? undefined, year: year ?? undefined },
      summary: {
        total: totalCount,
        early: totals.early,
        on_time: totals.on_time,
        delay: totals.delay,
        pending: totals.pending,
        percentage: {
          early: pct(totals.early),
          on_time: pct(totals.on_time),
          delay: pct(totals.delay),
        },
      },
      byBrand: Object.values(byBrand),
    });
  } catch (err) {
    console.error('submissionPerformance error:', err);
    return res.status(500).json({ error: 'Failed to compute submission performance' });
  }
};

/**
 * On-time delivery performance (per brand).
 * Uses shipping_tracking: estimated_arrival (due) vs actual_arrival (actual).
 * Query params: brandId (optional), month (1-12), year.
 */
export const deliveryPerformance = async (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;

    const { data: rows, error } = await supabase
      .from('shipping_tracking')
      .select('sample_id, estimated_arrival, actual_arrival, samples(brand_id, brands(id, name))');

    if (error) throw error;

    let list = (rows || []).map((r) => ({
      sample_id: r.sample_id,
      due: r.estimated_arrival,
      actual: r.actual_arrival,
      brand_id: r.samples?.brand_id ?? null,
      brand_name: r.samples?.brands?.name ?? null,
    }));

    if (brandId != null) list = list.filter((x) => x.brand_id === brandId);
    if (month != null || year != null) {
      list = list.filter((x) => inMonthYear(x.due ?? x.actual, month, year));
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

    const totalCount = list.length;
    const completed = totals.early + totals.on_time + totals.delay;
    const pct = (n) => (completed ? Math.round((n / completed) * 1000) / 10 : 0);

    return res.json({
      filters: { brandId: brandId ?? undefined, month: month ?? undefined, year: year ?? undefined },
      summary: {
        total: totalCount,
        early: totals.early,
        on_time: totals.on_time,
        delay: totals.delay,
        pending: totals.pending,
        percentage: {
          early: pct(totals.early),
          on_time: pct(totals.on_time),
          delay: pct(totals.delay),
        },
      },
      byBrand: Object.values(byBrand).map((b) => {
        const c = b.early + b.on_time + b.delay;
        const p = (n) => (c ? Math.round((n / c) * 1000) / 10 : 0);
        return {
          ...b,
          total: b.early + b.on_time + b.delay + b.pending,
          percentage: {
            early: p(b.early),
            on_time: p(b.on_time),
            delay: p(b.delay),
          },
        };
      }),
    });
  } catch (err) {
    console.error('deliveryPerformance error:', err);
    return res.status(500).json({ error: 'Failed to compute delivery performance' });
  }
};

/**
 * SSE stream: submission performance. Sends JSON on connect and every intervalMs (default 60s).
 * Query params: brandId, month, year, intervalMs (optional).
 */
export const submissionPerformanceStream = async (req, res) => {
  const brandId = req.query.brandId ? Number(req.query.brandId) : null;
  const month = req.query.month ? Number(req.query.month) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const intervalMs = Math.max(5000, Number(req.query.intervalMs) || 60000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('product_business_dev')
        .select('sample_id, sample_due_denver, sample_sent_brand_date, samples(brand_id, brands(id, name))');
      if (error) throw error;

      let list = (rows || []).map((r) => ({
        sample_id: r.sample_id,
        due: r.sample_due_denver,
        actual: r.sample_sent_brand_date,
        brand_id: r.samples?.brand_id ?? null,
        brand_name: r.samples?.brands?.name ?? null,
      }));
      if (brandId != null) list = list.filter((x) => x.brand_id === brandId);
      if (month != null || year != null) list = list.filter((x) => inMonthYear(x.due, month, year));

      const totals = { early: 0, on_time: 0, delay: 0, pending: 0 };
      const byBrand = {};
      for (const row of list) {
        const bucket = classifyOnTime(row.due, row.actual);
        totals[bucket] = (totals[bucket] || 0) + 1;
        const bid = row.brand_id ?? 'unknown';
        if (!byBrand[bid]) byBrand[bid] = { brand_id: bid, brand_name: row.brand_name ?? 'Unknown', early: 0, on_time: 0, delay: 0, pending: 0 };
        byBrand[bid][bucket]++;
      }
      const completed = totals.early + totals.on_time + totals.delay;
      const pct = (n) => (completed ? Math.round((n / completed) * 1000) / 10 : 0);
      const payload = {
        filters: { brandId: brandId ?? undefined, month: month ?? undefined, year: year ?? undefined },
        summary: {
          total: list.length,
          early: totals.early,
          on_time: totals.on_time,
          delay: totals.delay,
          pending: totals.pending,
          percentage: { early: pct(totals.early), on_time: pct(totals.on_time), delay: pct(totals.delay) },
        },
        byBrand: Object.values(byBrand),
        at: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: String(e?.message ?? e) })}\n\n`);
    }
  };

  await send();
  const t = setInterval(send, intervalMs);
  req.on('close', () => clearInterval(t));
};

/**
 * SSE stream: delivery performance. Same pattern as submission stream.
 */
export const deliveryPerformanceStream = async (req, res) => {
  const brandId = req.query.brandId ? Number(req.query.brandId) : null;
  const month = req.query.month ? Number(req.query.month) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const intervalMs = Math.max(5000, Number(req.query.intervalMs) || 60000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('shipping_tracking')
        .select('sample_id, estimated_arrival, actual_arrival, samples(brand_id, brands(id, name))');
      if (error) throw error;

      let list = (rows || []).map((r) => ({
        sample_id: r.sample_id,
        due: r.estimated_arrival,
        actual: r.actual_arrival,
        brand_id: r.samples?.brand_id ?? null,
        brand_name: r.samples?.brands?.name ?? null,
      }));
      if (brandId != null) list = list.filter((x) => x.brand_id === brandId);
      if (month != null || year != null) list = list.filter((x) => inMonthYear(x.due ?? x.actual, month, year));

      const totals = { early: 0, on_time: 0, delay: 0, pending: 0 };
      const byBrand = {};
      for (const row of list) {
        const bucket = classifyOnTime(row.due, row.actual);
        totals[bucket] = (totals[bucket] || 0) + 1;
        const bid = row.brand_id ?? 'unknown';
        if (!byBrand[bid]) byBrand[bid] = { brand_id: bid, brand_name: row.brand_name ?? 'Unknown', early: 0, on_time: 0, delay: 0, pending: 0 };
        byBrand[bid][bucket]++;
      }
      const completed = totals.early + totals.on_time + totals.delay;
      const pct = (n) => (completed ? Math.round((n / completed) * 1000) / 10 : 0);
      const byBrandList = Object.values(byBrand).map((b) => {
        const c = b.early + b.on_time + b.delay;
        const p = (n) => (c ? Math.round((n / c) * 1000) / 10 : 0);
        return { ...b, total: b.early + b.on_time + b.delay + b.pending, percentage: { early: p(b.early), on_time: p(b.on_time), delay: p(b.delay) } };
      });
      const payload = {
        filters: { brandId: brandId ?? undefined, month: month ?? undefined, year: year ?? undefined },
        summary: {
          total: list.length,
          early: totals.early,
          on_time: totals.on_time,
          delay: totals.delay,
          pending: totals.pending,
          percentage: { early: pct(totals.early), on_time: pct(totals.on_time), delay: pct(totals.delay) },
        },
        byBrand: byBrandList,
        at: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: String(e?.message ?? e) })}\n\n`);
    }
  };

  await send();
  const t = setInterval(send, intervalMs);
  req.on('close', () => clearInterval(t));
};

// Legacy stubs (keep route compatibility)
export const pipeline = async (req, res) => res.json({ message: 'Use /analytics/submission-performance or /delivery-performance' });
export const bySeason = async (req, res) => res.json({ message: 'Use /analytics/submission-performance or /delivery-performance with year' });
export const byBrand = async (req, res) => res.json({ message: 'Use /analytics/submission-performance or /delivery-performance with brandId' });
export const byDivision = async (req, res) => res.json({ message: 'Use /analytics/submission-performance or /delivery-performance' });
export const delays = async (req, res) => res.json({ message: 'Use /analytics/submission-performance (delay count) or /delivery-performance' });
export const dashboard = async (req, res) => {
  try {
    const [sub, deliv] = await Promise.all([
      supabase.from('product_business_dev').select('sample_id, sample_due_denver, sample_sent_brand_date, samples(brand_id)').limit(500),
      supabase.from('shipping_tracking').select('sample_id, estimated_arrival, actual_arrival, samples(brand_id)').limit(500),
    ]);
    const submissionRows = sub.data || [];
    const deliveryRows = deliv.data || [];
    let subEarly = 0, subOn = 0, subDelay = 0, subPending = 0;
    for (const r of submissionRows) {
      const b = classifyOnTime(r.sample_due_denver, r.sample_sent_brand_date);
      if (b === 'early') subEarly++; else if (b === 'on_time') subOn++; else if (b === 'delay') subDelay++; else subPending++;
    }
    let delEarly = 0, delOn = 0, delDelay = 0, delPending = 0;
    for (const r of deliveryRows) {
      const b = classifyOnTime(r.estimated_arrival, r.actual_arrival);
      if (b === 'early') delEarly++; else if (b === 'on_time') delOn++; else if (b === 'delay') delDelay++; else delPending++;
    }
    return res.json({
      submission: { total: submissionRows.length, early: subEarly, on_time: subOn, delay: subDelay, pending: subPending },
      delivery: { total: deliveryRows.length, early: delEarly, on_time: delOn, delay: delDelay, pending: delPending },
    });
  } catch (e) {
    return res.status(500).json({ error: 'Dashboard failed' });
  }
};
