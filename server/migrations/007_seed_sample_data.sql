-- =============================================================================
-- Migration 007: Seed Sample Data
-- Creates: Sample users, brands, seasons, and a complete sample lifecycle.
-- Based on the process spreadsheet analyzed.
-- =============================================================================

-- 1. Seed Users for each role
-- Default password for all users: password123
INSERT INTO users (username, full_name, email, role_id, password_hash) VALUES
  ('admin',   'Admin User',    'admin@madison88.com', (SELECT id FROM roles WHERE code = 'ADMIN'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC'),
  ('janelle', 'Janelle PBD',   'janelle@madison88.com', (SELECT id FROM roles WHERE code = 'PBD'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC'),
  ('garrett', 'Garrett TD',    'garrett@madison88.com', (SELECT id FROM roles WHERE code = 'TD'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC'),
  ('fiona',   'Fiona FTY',     'fiona@factory.com', (SELECT id FROM roles WHERE code = 'FTY'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC'),
  ('desi',    'Desi FTY',      'desi@factory.com', (SELECT id FROM roles WHERE code = 'FTY'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC'),
  ('afri',    'Afri MD',       'afri@madison88.com', (SELECT id FROM roles WHERE code = 'MD'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC'),
  ('lovely',  'Lovely COSTING', 'lovely@madison88.com', (SELECT id FROM roles WHERE code = 'COSTING'), '$2b$10$WaxRpzt1eHVlmIAH2q1AE.6sPtNS1.ktDDuD4yTCZ8isZzpSehhOTC')
ON CONFLICT (email) DO NOTHING;

-- 2. Seed Foundation (Brand & Season)
INSERT INTO brands (name, contact) VALUES 
  ('511 Tactical', 'brand-contact@511.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO seasons (code, year) VALUES 
  ('S27', 2027)
ON CONFLICT (code, year) DO NOTHING;

-- 3. Seed Style
INSERT INTO styles (brand_id, season_id, style_number, style_name, division, product_category, color, qty, coo)
SELECT 
  b.id, s.id, '7890075', 'TRUE NORTH MRNO BNIE- flat', 'In Line', 'Beanie', 'available', 3, 'Indonesia'
FROM brands b, seasons s
WHERE b.name = '511 Tactical' AND s.code = 'S27'
ON CONFLICT (style_number, color, season_id) DO NOTHING;

-- 4. Seed Sample Request
DO $$
DECLARE
    v_style_id INTEGER;
    v_user_id INTEGER;
    v_sample_id UUID;
    v_asgn_id INTEGER;
BEGIN
    SELECT style_id INTO v_style_id FROM styles WHERE style_number = '7890075' LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'janelle@madison88.com' LIMIT 1;

    -- Insert Sample Request
    INSERT INTO sample_request (
      style_id, sample_type, sample_status, kickoff_date, sample_due_denver, 
      ref_from_m88, ref_sample_to_fty, additional_notes, current_stage, current_status, created_by
    ) VALUES (
      v_style_id, 'P2', 'Active', '2025-10-10', '2025-10-28', 
      'n', 'n', 'updated to flat', 'SHIPMENT', 'DELIVERED', v_user_id
    ) RETURNING sample_id INTO v_sample_id;

    -- Insert Team Assignment
    INSERT INTO team_assignment (
      sample_id, pbd_user_id, td_user_id, fty_user_id, fty_md2_user_id, md_user_id, costing_user_id
    ) VALUES (
      v_sample_id,
      (SELECT id FROM users WHERE email = 'janelle@madison88.com'),
      (SELECT id FROM users WHERE email = 'garrett@madison88.com'),
      (SELECT id FROM users WHERE email = 'fiona@factory.com'),
      (SELECT id FROM users WHERE email = 'desi@factory.com'),
      (SELECT id FROM users WHERE email = 'afri@madison88.com'),
      (SELECT id FROM users WHERE email = 'lovely@madison88.com')
    ) RETURNING assignment_id INTO v_asgn_id;

    -- Link back to sample_request
    UPDATE sample_request SET assignment_id = v_asgn_id WHERE sample_id = v_sample_id;

    -- Seed Stage Tables based on the "Janelle" example in spreadsheet
    
    -- PSI
    INSERT INTO psi (sample_id, sent_date, work_week, month, year, stage_status)
    VALUES (v_sample_id, '2025-10-10', '10/6-10/10', 10, 2025, 'PSI_SENT');

    -- Sample Development
    INSERT INTO sample_development (
      sample_id, fty_md, fty_machine, target_xfty, actual_send, fty_remark, proceeded_date, target_xfty_wk, stage_status
    ) VALUES (
      v_sample_id, 'Fiona/Desi', 'Flat 9gg', '2025-11-13', '2025-11-10', '10/16 waiting confirmation', '2025-10-11', '11/10-11/14', 'FIT_REVIEW'
    );

    -- PC Review
    INSERT INTO pc_review (
      sample_id, confirm_date, reject_status, review_comp, md_int_review, stage_status
    ) VALUES (
      v_sample_id, '2025-11-03', 'YES', 'Complete', 'Conditionally OK', 'APPROVED'
    );

    -- Costing
    INSERT INTO costing (
      sample_id, team_member, ng_entry_date, stage_status
    ) VALUES (
      v_sample_id, 'Lovely', '2025-11-05', 'COSTING_COMPLETE'
    );

    -- SCF
    INSERT INTO scf (sample_id, shared_date, month, year, performance, stage_status)
    VALUES (v_sample_id, '2025-11-11', 11, 2025, 'Early', 'SCF_SHARED');

    -- Shipment
    INSERT INTO shipment_to_brand (
      sample_id, sent_date, awb_number, awb_status, stage_status
    ) VALUES (
      v_sample_id, '2025-11-13', '1ZW6B8611207988292', 'Shipped', 'DELIVERED'
    );

END $$;
