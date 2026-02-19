import { supabase } from '../config/supabase.js';

function escapeCsvCell(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const samples = async (req, res) => {
  try {
    const { format, brand_id, season_id } = req.query;

    let query = supabase.from('sample_request').select(`
      *,
      styles(*, brands(*), seasons(*)),
      team_assignment(
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
      scf(*),
      shipment_to_brand(*)
    `);

    if (brand_id) query = query.eq('styles.brand_id', brand_id);
    if (season_id) query = query.eq('styles.season_id', season_id);

    const { data, error } = await query;
    if (error) throw error;

    if (format === 'csv') {
      const headers = [
        'PBD', 'TD', 'FTY MD2', 'MD M88', 'Costing Team',
        'Season/Brand', 'Style#/Name', 'Sample Type Group',
        'Requested Lead Time', 'REQUESTED LEAD TIME to DEN',
        'PSI Creation Work Week', 'PSI Turn Time (Days)', 'PSI Month', 'PSI Year', 'PSI Sent Status', 'PSI Discrepancy Status',
        '1st PC Reject Status MD', 'TD to MD Comment Compare',
        'SCF Month', 'SCF Year', 'SCF Performance',
        'Target Xfactory Week', 'Estimate FTY Costing Due Date', 'FTY Costing Due Date', 'FTY Costing Due Week',
        'CBD Month', 'CBD Year', 'FTY Costing Submit Performance',
        'Estimate Xfactory for Sample due in Denver', 'AWB# Status',
        'Sample Week Num', 'Sample Arrival WEEK', 'Sample Arrival Month', 'Sample Arrival Year',
        'Factory Lead Time', 'FTY Sample Delivery Performance', 'Proto Efficiency',
        'Costing Lead Time from FTY', 'Costing sent to brand status', 'Sample Sent to Brand Status',
        'Sample to Brand Lead Time', 'KEY DATE'
      ];

      const rows = data.map(r => {
        const team = r.team_assignment || {};
        const style = r.styles || {};

        // Calculated/Derived Logic
        const requestedLeadTimeDen = r.kickoff_date && r.sample_due_denver ? dayDiff(r.kickoff_date, r.sample_due_denver) : '';
        const psiTurnTime = r.kickoff_date && r.psi?.sent_date ? dayDiff(r.kickoff_date, r.psi.sent_date) : '';
        const ftyLeadTime = r.psi?.sent_date && r.sample_development?.actual_send ? dayDiff(r.psi.sent_date, r.sample_development.actual_send) : '0';
        const sampleToBrandLeadTime = r.psi?.sent_date && r.shipment_to_brand?.sent_date ? dayDiff(r.psi.sent_date, r.shipment_to_brand.sent_date) : '';
        const costingPerf = r.costing?.fty_due_date && r.costing?.ng_entry_date ? classifyOnTime(r.costing.fty_due_date, r.costing.ng_entry_date) : 'Pending';

        return [
          team.pbd?.full_name ?? '',
          team.td?.full_name ?? '',
          team.fty_md2?.full_name ?? '',
          team.md?.full_name ?? '',
          team.costing?.full_name ?? '',
          `${style.seasons?.code ?? ''} ${style.brands?.name ?? ''}`.trim(),
          `${style.style_number ?? ''} ${style.style_name ?? ''}`.trim(),
          r.sample_type_group ?? '',
          r.requested_lead_time ?? '',
          requestedLeadTimeDen,
          r.psi?.work_week ?? '',
          psiTurnTime,
          r.psi?.month ?? '',
          r.psi?.year ?? '',
          r.psi?.sent_status ?? '',
          r.psi?.disc_status ?? 'None',
          r.pc_review?.reject_status ?? '',
          r.pc_review?.td_md_compare ?? '',
          r.scf?.month ?? '',
          r.scf?.year ?? '',
          r.scf?.performance ?? 'pending',
          r.sample_development?.target_xfty_wk ?? '',
          toISODate(r.costing?.est_due_date) ?? '',
          toISODate(r.costing?.fty_due_date) ?? '',
          r.costing?.due_week ?? '#N/A',
          r.costing?.cbd_month ?? '',
          r.costing?.cbd_year ?? '',
          costingPerf,
          toISODate(r.sample_development?.est_xfty) ?? '',
          r.shipment_to_brand?.awb_status ?? '',
          r.shipment_to_brand?.week_num ?? '#N/A',
          r.shipment_to_brand?.arrival_week ?? '#N/A',
          r.shipment_to_brand?.arrival_month ?? '',
          r.shipment_to_brand?.arrival_year ?? '',
          ftyLeadTime,
          r.sample_development?.delivery_perf ?? 'In Process',
          r.sample_development?.proto_eff ?? '',
          r.costing?.cost_lead_time ?? '',
          r.costing?.sent_status ?? 'pending',
          r.shipment_to_brand?.sent_status ?? 'pending',
          sampleToBrandLeadTime,
          toISODate(r.key_date) ?? ''
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=samples.csv');
      return res.send([headers.join(','), ...rows].join('\n'));
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
