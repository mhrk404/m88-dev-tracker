-- =============================================================================
-- Migration 013: Full Seed (All Columns + Stages)
-- Creates: lookup data, users, styles, sample_request, team_assignment, stages
-- =============================================================================

-- Lookup tables
INSERT INTO divisions (id, name, description, is_active, created_at, updated_at) VALUES
  (DEFAULT, 'Accessories', 'Accessories division', true, now(), now()),
  (DEFAULT, 'Outerwear', 'Outerwear division', true, now(), now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (id, name, description, is_active, created_at, updated_at) VALUES
  (DEFAULT, 'Beanie', 'Beanie category', true, now(), now()),
  (DEFAULT, 'Jacket', 'Jacket category', true, now(), now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO sample_types (id, name, "group", description, is_active, created_at, updated_at) VALUES
  (DEFAULT, 'P2', 'SAMPLE', 'Prototype 2', true, now(), now()),
  (DEFAULT, 'TOP', 'SAMPLE', 'Top of production', true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Brands and seasons
INSERT INTO brands (id, name, contact, is_active, created_at, updated_at) VALUES
  (DEFAULT, '511 Tactical', 'brand-contact@511.com', true, now(), now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO seasons (id, code, year, is_active, created_at, updated_at, start_date, end_date) VALUES
  (DEFAULT, 'S27', 2027, true, now(), now(), '2027-01-01', '2027-06-30')
ON CONFLICT (code, year) DO NOTHING;

-- Users (all columns)
INSERT INTO users (
  id, username, email, full_name, department, role_id,
  is_active, password_hash, created_at, updated_at
) VALUES
  (
    DEFAULT, 'admin', 'admin@madison88.com', 'Admin User', 'Operations',
    (SELECT id FROM roles WHERE code = 'ADMIN'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  ),
  (
    DEFAULT, 'janelle', 'janelle@madison88.com', 'Janelle PBD', 'PBD',
    (SELECT id FROM roles WHERE code = 'PBD'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  ),
  (
    DEFAULT, 'garrett', 'garrett@madison88.com', 'Garrett TD', 'TD',
    (SELECT id FROM roles WHERE code = 'TD'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  ),
  (
    DEFAULT, 'fiona', 'fiona@factory.com', 'Fiona FTY', 'Factory',
    (SELECT id FROM roles WHERE code = 'FTY'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  ),
  (
    DEFAULT, 'desi', 'desi@factory.com', 'Desi FTY', 'Factory',
    (SELECT id FROM roles WHERE code = 'FTY'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  ),
  (
    DEFAULT, 'afri', 'afri@madison88.com', 'Afri MD', 'Merchandising',
    (SELECT id FROM roles WHERE code = 'MD'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  ),
  (
    DEFAULT, 'lovely', 'lovely@madison88.com', 'Lovely COSTING', 'Costing',
    (SELECT id FROM roles WHERE code = 'COSTING'),
    true, '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC',
    now(), now()
  )
ON CONFLICT (email) DO NOTHING;

-- Styles, sample request, assignment, and stages (all columns)
DO $$
DECLARE
  v_brand_id INTEGER;
  v_season_id INTEGER;
  v_style_id INTEGER;
  v_sample_id UUID := '11111111-1111-1111-1111-111111111111';
  v_assignment_id INTEGER;
  v_pbd_id INTEGER;
  v_td_id INTEGER;
  v_fty_id INTEGER;
  v_fty2_id INTEGER;
  v_md_id INTEGER;
  v_cost_id INTEGER;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE name = '511 Tactical' LIMIT 1;
  SELECT id INTO v_season_id FROM seasons WHERE code = 'S27' AND year = 2027 LIMIT 1;

  INSERT INTO styles (
    style_id, brand_id, season_id, style_number, style_name,
    division, product_category, color, qty, coo,
    created_at, updated_at
  ) VALUES (
    DEFAULT, v_brand_id, v_season_id, '7890075', 'TRUE NORTH MRNO BNIE - flat',
    'Accessories', 'Beanie', 'Black', 3, 'Indonesia',
    now(), now()
  )
  ON CONFLICT (style_number, color, season_id) DO NOTHING;

  SELECT style_id INTO v_style_id FROM styles WHERE style_number = '7890075' LIMIT 1;
  SELECT id INTO v_pbd_id FROM users WHERE email = 'janelle@madison88.com' LIMIT 1;
  SELECT id INTO v_td_id FROM users WHERE email = 'garrett@madison88.com' LIMIT 1;
  SELECT id INTO v_fty_id FROM users WHERE email = 'fiona@factory.com' LIMIT 1;
  SELECT id INTO v_fty2_id FROM users WHERE email = 'desi@factory.com' LIMIT 1;
  SELECT id INTO v_md_id FROM users WHERE email = 'afri@madison88.com' LIMIT 1;
  SELECT id INTO v_cost_id FROM users WHERE email = 'lovely@madison88.com' LIMIT 1;

  INSERT INTO sample_request (
    sample_id, style_id, assignment_id,
    unfree_status, sample_type, sample_type_group, sample_status,
    kickoff_date, sample_due_denver, requested_lead_time, lead_time_type,
    ref_from_m88, ref_sample_to_fty, additional_notes, key_date,
    current_stage, current_status, created_by, created_at, updated_at
  ) VALUES (
    v_sample_id, v_style_id, NULL,
    'FREE', 'P2', 'SAMPLE', 'Active',
    '2027-02-01', '2027-02-20', 14, 'STND',
    'N', 'N', 'Updated to flat', '2027-02-05',
    'SHIPMENT', 'DELIVERED', v_pbd_id, now(), now()
  )
  ON CONFLICT (sample_id) DO NOTHING;

  INSERT INTO team_assignment (
    assignment_id, sample_id, pbd_user_id, td_user_id, fty_user_id,
    fty_md2_user_id, md_user_id, costing_user_id, created_at, updated_at
  ) VALUES (
    DEFAULT, v_sample_id, v_pbd_id, v_td_id, v_fty_id,
    v_fty2_id, v_md_id, v_cost_id, now(), now()
  )
  ON CONFLICT (sample_id) DO NOTHING
  RETURNING assignment_id INTO v_assignment_id;

  IF v_assignment_id IS NOT NULL THEN
    UPDATE sample_request
      SET assignment_id = v_assignment_id
      WHERE sample_id = v_sample_id;
  END IF;

  INSERT INTO psi (
    psi_id, sample_id, sent_date, work_week, turn_time, month, year,
    sent_status, disc_status, btp_disc, stage_status, created_at, updated_at
  ) VALUES (
    '22222222-2222-2222-2222-222222222222', v_sample_id,
    '2027-02-01', '01/29-02/02', '5 days', 2, 2027,
    'Sent', 'OK', 'None', 'PSI_SENT', now(), now()
  )
  ON CONFLICT (sample_id) DO NOTHING;

  INSERT INTO sample_development (
    dev_id, sample_id, fty_md, fty_machine, target_xfty, actual_send,
    fty_remark, proceeded_date, awb, est_xfty, fty_lead_time,
    delivery_perf, proto_eff, target_xfty_wk, stage_status, revision_count,
    created_at, updated_at, fty_target_sample, sample_proceeded,
    fty_psi_btp_discrepancy, target_1pc_review_date, actual_cbd_submitted_date
  ) VALUES (
    '33333333-3333-3333-3333-333333333333', v_sample_id,
    'Fiona/Desi', 'Flat 9gg', '2027-02-15', '2027-02-12',
    'Waiting confirmation', '2027-02-02', '1ZW6B8611207988292', '2027-02-16', '10 days',
    'Early', '90%', '02/12-02/16', 'FIT_REVIEW', 1,
    now(), now(), '2027-02-10', true,
    'None', '2027-02-18', '2027-02-13'
  )
  ON CONFLICT (sample_id) DO NOTHING;

  INSERT INTO pc_review (
    pc_id, sample_id, target_1pc, awb_inbound, cbd_actual, confirm_date,
    reject_by_md, review_comp, reject_status, md_int_review, td_md_compare,
    stage_status, created_at, updated_at, scf_shared_date
  ) VALUES (
    '44444444-4444-4444-4444-444444444444', v_sample_id,
    '2027-02-18', '1ZW6B8611207988292', '2027-02-17', '2027-02-19',
    'No', 'Complete', 'NO', 'Approved', 'Match',
    'APPROVED', now(), now(), '2027-02-20'
  )
  ON CONFLICT (sample_id) DO NOTHING;

  INSERT INTO costing (
    cost_id, sample_id, est_due_date, fty_due_date, due_week, cbd_month,
    cbd_year, submit_perf, team_member, ng_entry_date, ownership,
    sent_to_brand, cost_lead_time, sent_status, stage_status,
    created_at, updated_at
  ) VALUES (
    '55555555-5555-5555-5555-555555555555', v_sample_id,
    '2027-02-19', '2027-02-20', 'W08', 2,
    2027, 'On time', 'Lovely', '2027-02-19', 'Costing',
    'Yes', '7 days', 'Sent', 'COSTING_COMPLETE',
    now(), now()
  )
  ON CONFLICT (sample_id) DO NOTHING;

  INSERT INTO scf (
    scf_id, sample_id, shared_date, month, year, performance,
    pkg_eta_denver, stage_status, created_at, updated_at
  ) VALUES (
    '66666666-6666-6666-6666-666666666666', v_sample_id,
    '2027-02-20', 2, 2027, 'Early',
    '2027-02-24', 'SCF_SHARED', now(), now()
  )
  ON CONFLICT (sample_id) DO NOTHING;

  INSERT INTO shipment_to_brand (
    shipment_id, sample_id, sent_date, awb_number, awb_status, week_num,
    arrival_week, arrival_month, arrival_year, sent_status,
    lead_time_to_brand, stage_status, created_at, updated_at
  ) VALUES (
    '77777777-7777-7777-7777-777777777777', v_sample_id,
    '2027-02-22', '1ZW6B8611207988292', 'Shipped', 'W08',
    'W09', 3, 2027, 'Sent',
    '5 days', 'DELIVERED', now(), now()
  )
  ON CONFLICT (sample_id) DO NOTHING;
END $$;
