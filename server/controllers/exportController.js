import { supabase } from '../config/supabase.js';
import { dayDiff, parseDateUTC, toISODate } from '../utils/date.js';
import * as XLSX from 'xlsx';

function escapeCsvCell(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function getSingleRelation(value) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function monthShort(value) {
  const d = parseDateUTC(value);
  if (!d) return '';
  return d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

function yearNum(value) {
  const d = parseDateUTC(value);
  if (!d) return '';
  return d.getUTCFullYear();
}

function addDays(value, days) {
  const d = parseDateUTC(value);
  if (!d || !Number.isFinite(Number(days))) return null;
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + Number(days));
  return toISODate(next);
}

function subtractDays(value, days) {
  const d = parseDateUTC(value);
  if (!d || !Number.isFinite(Number(days))) return null;
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() - Number(days));
  return toISODate(next);
}

function toWeekRange(value) {
  const d = parseDateUTC(value);
  if (!d) return '';
  const weekday = d.getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);

  const fmt = (x) => `${String(x.getUTCMonth() + 1).padStart(2, '0')}/${String(x.getUTCDate()).padStart(2, '0')}`;
  return `${fmt(monday)} - ${fmt(friday)}`;
}

function weekNum(value) {
  const d = parseDateUTC(value);
  if (!d) return '';
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((d - yearStart) / (1000 * 60 * 60 * 24)) + 1;
  const jan1Weekday = yearStart.getUTCDay();
  return Math.floor((dayOfYear + jan1Weekday - 1) / 7) + 1;
}

function classifyByDue(dueDate, actualDate) {
  const due = parseDateUTC(dueDate);
  const actual = parseDateUTC(actualDate);
  if (!due || !actual) return 'Pending';
  const diff = dayDiff(dueDate, actualDate);
  if (diff < 0) return 'Early';
  if (diff === 0) return 'On Time';
  return 'Late';
}

function normalizeRejectFlag(value) {
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  if (!s) return false;
  return !['0', 'false', 'no', 'none', 'n/a'].includes(s);
}

function mapSampleTypeGroup(sampleType, sampleTypeGroup) {
  if (sampleTypeGroup && String(sampleTypeGroup).trim()) return sampleTypeGroup;
  const type = String(sampleType ?? '').trim().toUpperCase();
  if (!type) return '';
  if (type.includes('PROTO')) return 'PROTO';
  if (type.includes('TOP')) return 'TOP';
  if (type.includes('SMS')) return 'SMS';
  if (type.includes('P1') || type.includes('P2') || type.includes('P3')) return 'SAMPLE';
  return type;
}

function bucketRequestedLeadTimeToDen(days, leadType) {
  if (leadType && String(leadType).trim()) return String(leadType).trim().toUpperCase();
  const n = Number(days);
  if (!Number.isFinite(n)) return '';
  if (n <= 7) return '1 Week or Less';
  if (n <= 14) return '2 Weeks';
  if (n <= 21) return '3 Weeks';
  return '4+ Weeks';
}

function protoEfficiency(sampleType, hasReject, storedValue) {
  if (storedValue && String(storedValue).trim()) return storedValue;
  const t = String(sampleType ?? '').toUpperCase();
  if (!t.includes('PROTO')) return 'Exempt';
  return hasReject ? 'Round 2+' : 'Round 1';
}

const CSV_HEADERS = [
  'PBD', 'TD', 'FTY MD2', 'MD M88', 'Costing Team',
  'Season/Brand', 'Style#/Name', 'Sample Type Group',
  'Requested Lead Time', 'REQUESTED LEAD TIME to DEN',
  'PSI Creation Work Week', 'PSI Turn Time (Days)', 'PSI Month', 'PSI Year', 'PSI Sent Status', 'PSI Discrepancy Status',
  '1st PC Reject Status MD', 'TD to MD Comment Compare',
  'SCF Month', 'SCF Year', 'SCF Performance',
  'Target Xfactory Week', 'Estimate FTY Costing Due Date', 'FTY Costing Due Date', 'FTY Costing Due Week',
  'CBD Month', 'CBD Year', 'FTY Costing Submit Performance',
  'Estimate Xfactory for Sample due in Denver', 'Sample Due in Denver Status', 'AWB# Status',
  'Sample Week Num', 'Sample Arrival WEEK', 'Sample Arrival Month', 'Sample Arrival Year',
  'Factory Lead Time', 'FTY Sample Delivery Performance', 'Proto Efficiency',
  'Costing Lead Time from FTY', 'Costing sent to brand status', 'Sample Sent to Brand Status',
  'Sample to Brand Lead Time', 'KEY DATE'
];

function buildWorkbookBuffer(headers, rows) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Samples');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

export const samples = async (req, res) => {
  try {
    const { format, brand_id, season_id } = req.query;
    const exportFormat = String(format || 'csv').toLowerCase();
    let styleIds = null;

    const baseSelect = `
      *,
      styles(*, brands(*), seasons(*)),
      team_assignment!team_assignment_sample_id_fkey(
        pbd:pbd_user_id(full_name),
        td:td_user_id(full_name),
        fty_md2:fty_md2_user_id(full_name),
        md:md_user_id(full_name),
        costing:costing_user_id(full_name)
      ),
      psi(*),
      sample_development(*),
      pc_review(*),
      costing(*),
      shipment_to_brand(*)
    `;

    const withScfSelect = `
      ${baseSelect},
      scf(*)
    `;

    if (brand_id || season_id) {
      let stylesQuery = supabase.from('styles').select('style_id');
      if (brand_id) stylesQuery = stylesQuery.eq('brand_id', Number(brand_id));
      if (season_id) stylesQuery = stylesQuery.eq('season_id', Number(season_id));

      const { data: styleRows, error: styleErr } = await stylesQuery;
      if (styleErr) throw styleErr;
      if (!styleRows?.length) {
        if (exportFormat === 'xlsx') {
          const file = buildWorkbookBuffer(CSV_HEADERS, []);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=samples.xlsx');
          return res.send(file);
        }
        if (exportFormat === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=samples.csv');
          return res.send(CSV_HEADERS.map(escapeCsvCell).join(','));
        }
        return res.json([]);
      }
      styleIds = styleRows.map((row) => row.style_id);
    }

    const buildQuery = (selectString) => {
      let q = supabase.from('sample_request').select(selectString);
      if (styleIds?.length) q = q.in('style_id', styleIds);
      return q;
    };

    let { data, error } = await buildQuery(withScfSelect);
    if (error && (error.code === 'PGRST200' || error.code === 'PGRST201') && String(error.message || '').toLowerCase().includes('scf')) {
      const retry = await buildQuery(baseSelect);
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;

    const rows = data.map(r => {
        const team = getSingleRelation(r.team_assignment) || {};
        const style = r.styles || {};
        const psi = getSingleRelation(r.psi) || {};
        const sampleDevelopment = getSingleRelation(r.sample_development) || {};
        const pcReview = getSingleRelation(r.pc_review) || {};
        const costing = getSingleRelation(r.costing) || {};
        const scf = getSingleRelation(r.scf) || {};
        const shipment = getSingleRelation(r.shipment_to_brand) || {};

        const requestedLeadTime = Number.isFinite(Number(r.requested_lead_time))
          ? Number(r.requested_lead_time)
          : (r.kickoff_date && r.sample_due_denver ? dayDiff(r.kickoff_date, r.sample_due_denver) : '');

        const psiSentDate = psi.sent_date ?? null;
        const actualShipDate = sampleDevelopment.actual_send ?? null;
        const targetXfactoryDate = sampleDevelopment.target_xfty ?? null;
        const costSheetDate = costing.cost_sheet_date ?? null;
        const dueDateCosting = addDays(actualShipDate, 1);
        const estimateCostingDueDate = addDays(actualShipDate, 2);
        const sampleDueDenverDate = r.sample_due_denver ?? null;

        const psiTurnTime = psiSentDate ? dayDiff(r.kickoff_date, psiSentDate) : 0;
        const psiSentStatus = Boolean(psiSentDate);
        const psiDiscrepancyStatus = psi.disc_status && String(psi.disc_status).trim() ? 'Has Discrepancy' : 'No Discrepancy';

        const hasReject = normalizeRejectFlag(pcReview.reject_status) || normalizeRejectFlag(pcReview.reject_by_md);
        const firstPcRejectStatus = hasReject ? 'Rejected' : 'Not Rejected';
        const tdToMdCompare = pcReview.td_md_compare != null && String(pcReview.td_md_compare).trim() !== ''
          ? pcReview.td_md_compare
          : String(pcReview.review_comp ?? '').trim() === String(pcReview.md_int_review ?? '').trim();

        const scfDate = scf.shared_date ?? null;
        const scfPerformance = scf.performance ?? classifyByDue(sampleDueDenverDate, scfDate);

        const ftyCostingSubmitPerformance = costSheetDate
          ? classifyByDue(dueDateCosting, costSheetDate)
          : 'Pending';

        const estimateXfactoryForDenver = subtractDays(sampleDueDenverDate, requestedLeadTime);
        const sampleDueDenverStatus = classifyByDue(sampleDueDenverDate, actualShipDate);
        const awbValue = shipment.awb_number ?? sampleDevelopment.awb ?? '';
        const awbStatus = awbValue && String(awbValue).trim() ? 'Populated' : 'Blank';

        const factoryLeadTime = psiSentDate && actualShipDate ? dayDiff(psiSentDate, actualShipDate) : '';
        const ftySampleDeliveryPerf = sampleDevelopment.delivery_perf ?? classifyByDue(targetXfactoryDate, actualShipDate);
        const protoEff = protoEfficiency(r.sample_type, hasReject, sampleDevelopment.proto_eff);
        const costingLeadTimeFromFty = (costSheetDate && actualShipDate) ? dayDiff(actualShipDate, costSheetDate) : 'NA';
        const costingSentToBrandStatus = costing.sent_status ? String(costing.sent_status).toLowerCase() : '';
        const sampleSentToBrandStatus = shipment.sent_date
          ? 'sent'
          : (awbValue && String(awbValue).trim() ? 'awb created' : 'pending');
        const sampleToBrandLeadTime = psiSentDate && shipment.sent_date ? dayDiff(psiSentDate, shipment.sent_date) : '';

        return [
          team.pbd?.full_name ?? '',
          team.td?.full_name ?? '',
          team.fty_md2?.full_name ?? '',
          team.md?.full_name ?? '',
          team.costing?.full_name ?? '',
          `${style.seasons?.code ?? ''} ${style.brands?.name ?? ''}`.trim(),
          `${style.style_number ?? ''} ${style.style_name ?? ''}`.trim(),
          mapSampleTypeGroup(r.sample_type, r.sample_type_group),
          requestedLeadTime,
          bucketRequestedLeadTimeToDen(requestedLeadTime, r.lead_time_type),
          psi.work_week ?? toWeekRange(psiSentDate),
          psiTurnTime,
          psi.month ?? monthShort(psiSentDate),
          psi.year ?? yearNum(psiSentDate),
          psi.sent_status ?? psiSentStatus,
          psiDiscrepancyStatus,
          firstPcRejectStatus,
          tdToMdCompare,
          monthShort(scfDate),
          yearNum(scfDate),
          scfPerformance,
          sampleDevelopment.target_xfty_wk ?? toWeekRange(targetXfactoryDate),
          estimateCostingDueDate ?? '',
          dueDateCosting ?? '',
          toWeekRange(dueDateCosting),
          monthShort(costSheetDate),
          yearNum(costSheetDate),
          ftyCostingSubmitPerformance,
          estimateXfactoryForDenver ?? '',
          sampleDueDenverStatus,
          awbStatus,
          shipment.week_num ?? weekNum(actualShipDate),
          shipment.arrival_week ?? toWeekRange(actualShipDate),
          shipment.arrival_month ?? monthShort(actualShipDate),
          shipment.arrival_year ?? yearNum(actualShipDate),
          factoryLeadTime,
          ftySampleDeliveryPerf,
          protoEff,
          costingLeadTimeFromFty,
          costingSentToBrandStatus,
          sampleSentToBrandStatus,
          sampleToBrandLeadTime,
          toISODate(r.key_date) ?? ''
        ];
      });

    if (exportFormat === 'xlsx') {
      const file = buildWorkbookBuffer(CSV_HEADERS, rows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=samples.xlsx');
      return res.send(file);
    }

    if (exportFormat === 'csv') {
      const csvRows = rows.map((row) => row.map(escapeCsvCell).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=samples.csv');
      return res.send([CSV_HEADERS.map(escapeCsvCell).join(','), ...csvRows].join('\n'));
    }

    return res.json(data);
  } catch (err) {
    console.error('export samples:', err);
    return res.status(500).json({ error: err.message ?? 'Export failed' });
  }
};

export const pipeline = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sample_request')
      .select('sample_id, kickoff_date, sample_due_denver, current_stage, current_status')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('export pipeline:', err);
    return res.status(500).json({ error: 'Pipeline export failed' });
  }
};

export const analytics = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sample_request')
      .select(`
        sample_id, kickoff_date, sample_due_denver,
        shipment:shipment_to_brand(sent_date, arrival_month, arrival_year)
      `);

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('export analytics:', err);
    return res.status(500).json({ error: 'Analytics export failed' });
  }
};
