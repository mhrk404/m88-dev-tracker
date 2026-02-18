-- Seed data: run after 001, 002, 003, 004, 005 migrations.
-- Fills all lookups, users, samples, stage tables (with all dates), shipping, audit.
-- Sets password_hash for seed users (admin, pd.dev, md.user, td.user, costing.user) so local login works. Password: Password1!
-- Idempotent: ON CONFLICT DO NOTHING where applicable.

-- ========== LOOKUPS ==========

INSERT INTO brands (name) VALUES
  ('Vans'),
  ('North Face'),
  ('Marmot'),
  ('Mammut'),
  ('Burton')
ON CONFLICT (name) DO NOTHING;

INSERT INTO seasons (name, year, start_date, end_date) VALUES
  ('SS24', 2024, '2024-01-01', '2024-06-30'),
  ('FW24', 2024, '2024-07-01', '2024-12-31'),
  ('SS25', 2025, '2025-01-01', '2025-06-30'),
  ('FW25', 2025, '2025-07-01', '2025-12-31')
ON CONFLICT (name, year) DO NOTHING;

INSERT INTO divisions (name) VALUES
  ('Apparel'),
  ('Footwear'),
  ('Accessories'),
  ('Equipment')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, parent_id) VALUES
  ('Tops', NULL),
  ('Bottoms', NULL),
  ('Outerwear', NULL),
  ('Footwear', NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, parent_id)
SELECT 'Shirts', id FROM product_categories WHERE name = 'Tops' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, parent_id)
SELECT 'Knitwear', id FROM product_categories WHERE name = 'Tops' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, parent_id)
SELECT 'Pants', id FROM product_categories WHERE name = 'Bottoms' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, parent_id)
SELECT 'Shorts', id FROM product_categories WHERE name = 'Bottoms' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO sample_types (name, "group") VALUES
  ('Proto', 'Development'),
  ('Fit', 'Development'),
  ('Salesman', 'Sales'),
  ('Photo', 'Marketing'),
  ('PP', 'Production'),
  ('TOP', 'Production')
ON CONFLICT (name) DO NOTHING;

-- ========== USERS (run 004_roles.sql first) ==========

INSERT INTO users (username, email, full_name, department, role_id)
SELECT 'admin', 'admin@m88.local', 'Admin User', 'Development', id FROM roles WHERE code = 'ADMIN' LIMIT 1
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, full_name, department, role_id)
SELECT 'pd.dev', 'pd@m88.local', 'PD User', 'Product Development', id FROM roles WHERE code = 'PD' LIMIT 1
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, full_name, department, role_id)
SELECT 'md.user', 'md@m88.local', 'MD User', 'Merchandising', id FROM roles WHERE code = 'MD' LIMIT 1
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, full_name, department, role_id)
SELECT 'td.user', 'td@m88.local', 'TD User', 'Technical Design', id FROM roles WHERE code = 'TD' LIMIT 1
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, full_name, department, role_id)
SELECT 'costing.user', 'costing@m88.local', 'Costing User', 'Costing', id FROM roles WHERE code = 'COSTING' LIMIT 1
ON CONFLICT (username) DO NOTHING;

-- Fallback: if no admin user yet, create admin user with ADMIN role
INSERT INTO users (username, email, full_name, department, role_id)
SELECT 'admin', 'admin@m88.local', 'Admin User', 'Development', r.id
FROM roles r
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
LIMIT 1
ON CONFLICT (username) DO NOTHING;

-- Set local login password for seed users (run after 005_users_password.sql). Password: Password1!
UPDATE users
SET password_hash = '$2b$12$gvAE0RJ78a/zWtAKK70SSu5rxi03o/PLdORc.nA7cg/dOH/7bFOKe'
WHERE username IN ('admin', 'pd.dev', 'md.user', 'td.user', 'costing.user');

-- ========== SAMPLES (all dates/references populated) ==========

INSERT INTO samples (id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_by)
SELECT
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'STYLE-SS24-001',
  'Classic Tee',
  'White',
  2,
  (SELECT id FROM seasons WHERE name = 'SS24' AND year = 2024 LIMIT 1),
  (SELECT id FROM brands WHERE name = 'Vans' LIMIT 1),
  (SELECT id FROM divisions WHERE name = 'Apparel' LIMIT 1),
  (SELECT id FROM product_categories WHERE name = 'Shirts' LIMIT 1),
  (SELECT id FROM sample_types WHERE name = 'Proto' LIMIT 1),
  'Indonesia',
  'In Development',
  'product_business_dev',
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO samples (id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_by)
SELECT
  'a1000000-0000-0000-0000-000000000002'::uuid,
  'STYLE-FW24-001',
  'Fleece Pant',
  'Navy',
  1,
  (SELECT id FROM seasons WHERE name = 'FW24' AND year = 2024 LIMIT 1),
  (SELECT id FROM brands WHERE name = 'North Face' LIMIT 1),
  (SELECT id FROM divisions WHERE name = 'Apparel' LIMIT 1),
  (SELECT id FROM product_categories WHERE name = 'Pants' LIMIT 1),
  (SELECT id FROM sample_types WHERE name = 'Fit' LIMIT 1),
  'China',
  'Technical Design',
  'technical_design',
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO samples (id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_by)
SELECT
  'a1000000-0000-0000-0000-000000000003'::uuid,
  'STYLE-SS24-002',
  'Merino Crew',
  'Black',
  3,
  (SELECT id FROM seasons WHERE name = 'SS24' AND year = 2024 LIMIT 1),
  (SELECT id FROM brands WHERE name = 'Marmot' LIMIT 1),
  (SELECT id FROM divisions WHERE name = 'Apparel' LIMIT 1),
  (SELECT id FROM product_categories WHERE name = 'Knitwear' LIMIT 1),
  (SELECT id FROM sample_types WHERE name = 'Proto' LIMIT 1),
  'Indonesia',
  'Factory Execution',
  'factory_execution',
  (SELECT id FROM users WHERE username = 'pd.dev' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'pd.dev')
ON CONFLICT (id) DO NOTHING;

INSERT INTO samples (id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_by)
SELECT
  'a1000000-0000-0000-0000-000000000004'::uuid,
  'STYLE-FW25-001',
  'Puffer Jacket',
  'Olive',
  1,
  (SELECT id FROM seasons WHERE name = 'FW25' AND year = 2025 LIMIT 1),
  (SELECT id FROM brands WHERE name = 'Mammut' LIMIT 1),
  (SELECT id FROM divisions WHERE name = 'Apparel' LIMIT 1),
  (SELECT id FROM product_categories WHERE name = 'Outerwear' LIMIT 1),
  (SELECT id FROM sample_types WHERE name = 'Fit' LIMIT 1),
  'China',
  'Costing Review',
  'costing_analysis',
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO samples (id, style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_by)
SELECT
  'a1000000-0000-0000-0000-000000000005'::uuid,
  'STYLE-SS25-001',
  'Running Short',
  'Grey',
  2,
  (SELECT id FROM seasons WHERE name = 'SS25' AND year = 2025 LIMIT 1),
  (SELECT id FROM brands WHERE name = 'Burton' LIMIT 1),
  (SELECT id FROM divisions WHERE name = 'Apparel' LIMIT 1),
  (SELECT id FROM product_categories WHERE name = 'Shorts' LIMIT 1),
  (SELECT id FROM sample_types WHERE name = 'Salesman' LIMIT 1),
  'Indonesia',
  'Merchandising Review',
  'merchandising_review',
  (SELECT id FROM users WHERE username = 'td.user' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'td.user')
ON CONFLICT (id) DO NOTHING;

-- ========== STAGE TRACKING (all date columns filled per sample) ==========

-- product_business_dev: kickoff_date, sample_due_denver, sample_sent_brand_date
INSERT INTO product_business_dev (
  sample_id, owner_id, unfree_status, kickoff_date, sample_due_denver, sample_sent_brand_date, sample_status, reference_m88_dev, reference_ship_to_fty, additional_notes, awb_to_brand
)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Unfree', '2024-01-15', '2024-02-01', '2024-01-28', 'Submitted', true, false, 'Seed sample 1.', 'AWB-BRAND-001'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO product_business_dev (
  sample_id, owner_id, unfree_status, kickoff_date, sample_due_denver, sample_sent_brand_date, sample_status, reference_m88_dev, reference_ship_to_fty
)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Unfree', '2024-07-10', '2024-08-01', NULL, 'In Progress', true, false
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO product_business_dev (
  sample_id, owner_id, unfree_status, kickoff_date, sample_due_denver, sample_sent_brand_date, sample_status, reference_m88_dev, reference_ship_to_fty
)
SELECT s.id, (SELECT id FROM users WHERE username = 'pd.dev' LIMIT 1), 'Unfree', '2024-02-01', '2024-02-20', '2024-02-18', 'Submitted', false, true
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO product_business_dev (
  sample_id, owner_id, unfree_status, kickoff_date, sample_due_denver, sample_sent_brand_date, sample_status, reference_m88_dev, reference_ship_to_fty
)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Unfree', '2025-01-05', '2025-02-01', '2025-01-30', 'Submitted', true, false
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000004'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO product_business_dev (
  sample_id, owner_id, unfree_status, kickoff_date, sample_due_denver, sample_sent_brand_date, sample_status, reference_m88_dev, reference_ship_to_fty
)
SELECT s.id, (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), 'Unfree', '2025-01-10', '2025-02-15', '2025-02-10', 'Submitted', false, false
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000005'::uuid
ON CONFLICT (sample_id) DO NOTHING;

-- technical_design: handoff_date, psi_sent_to_factory_date
INSERT INTO technical_design (sample_id, owner_id, handoff_date, psi_sent_to_factory_date, p3_remake_reason, fit_log_review_status)
SELECT s.id, (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), '2024-02-10', '2024-02-20', NULL, 'Approved'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO technical_design (sample_id, owner_id, handoff_date, psi_sent_to_factory_date, p3_remake_reason, fit_log_review_status)
SELECT s.id, (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), '2024-08-05', '2024-08-15', NULL, 'Pending'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO technical_design (sample_id, owner_id, handoff_date, psi_sent_to_factory_date, p3_remake_reason, fit_log_review_status)
SELECT s.id, (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), '2024-02-25', '2024-03-05', NULL, 'In Review'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO technical_design (sample_id, owner_id, handoff_date, psi_sent_to_factory_date, p3_remake_reason, fit_log_review_status)
SELECT s.id, (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), '2025-02-05', '2025-02-12', NULL, 'Approved'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000004'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO technical_design (sample_id, owner_id, handoff_date, psi_sent_to_factory_date, p3_remake_reason, fit_log_review_status)
SELECT s.id, (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), '2025-02-20', '2025-02-28', NULL, 'Pending'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000005'::uuid
ON CONFLICT (sample_id) DO NOTHING;

-- factory_execution: target_crossfactory_date, actual_ship_date, target_first_pc_review_date, cost_breakdown_submit_date, fty_md2, fty_costing_due_date
INSERT INTO factory_execution (sample_id, owner_id, machine, target_crossfactory_date, actual_ship_date, target_first_pc_review_date, cost_breakdown_submit_date, sample_proceeded, awb, fty_md2, fty_costing_due_date)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Factory A', '2024-03-15', '2024-03-12', '2024-03-25', '2024-03-20', true, 'AWB-FTY-001',
  (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), '2024-03-18'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO factory_execution (sample_id, owner_id, machine, target_crossfactory_date, actual_ship_date, target_first_pc_review_date, cost_breakdown_submit_date, sample_proceeded, awb, fty_md2, fty_costing_due_date)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Factory X', '2024-09-01', NULL, '2024-09-15', NULL, false, NULL,
  NULL, '2024-09-10'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO factory_execution (sample_id, owner_id, machine, target_crossfactory_date, actual_ship_date, target_first_pc_review_date, cost_breakdown_submit_date, sample_proceeded, awb, fty_md2, fty_costing_due_date)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Factory B', '2024-03-25', '2024-03-22', '2024-04-05', '2024-03-28', true, 'AWB-FTY-002',
  (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), '2024-03-30'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO factory_execution (sample_id, owner_id, machine, target_crossfactory_date, actual_ship_date, target_first_pc_review_date, cost_breakdown_submit_date, sample_proceeded, awb, fty_md2, fty_costing_due_date)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Factory C', '2025-03-01', NULL, '2025-03-15', '2025-02-28', false, NULL,
  NULL, '2025-03-10'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000004'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO factory_execution (sample_id, owner_id, machine, target_crossfactory_date, actual_ship_date, target_first_pc_review_date, cost_breakdown_submit_date, sample_proceeded, awb, fty_md2, fty_costing_due_date)
SELECT s.id, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Factory A', '2025-03-20', NULL, '2025-04-01', NULL, false, NULL,
  NULL, NULL
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000005'::uuid
ON CONFLICT (sample_id) DO NOTHING;

-- merchandising_review: first_pc_review_confirmed_date, first_pc_review_complete_date, scf_shared_date, td_to_md_comment
INSERT INTO merchandising_review (sample_id, owner_id, first_pc_review_confirmed_date, first_pc_review_complete_date, scf_shared_date, first_pc_rejected, internal_review_status, td_to_md_comment)
SELECT s.id, (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), '2024-03-28', '2024-04-02', '2024-04-05', false, 'Complete', 'TD confirmed measurements match spec.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO merchandising_review (sample_id, owner_id, first_pc_review_confirmed_date, first_pc_review_complete_date, scf_shared_date, first_pc_rejected, internal_review_status, td_to_md_comment)
SELECT s.id, (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), NULL, NULL, NULL, false, 'Not Started', NULL
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO merchandising_review (sample_id, owner_id, first_pc_review_confirmed_date, first_pc_review_complete_date, scf_shared_date, first_pc_rejected, internal_review_status, td_to_md_comment)
SELECT s.id, (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), '2024-04-10', '2024-04-12', '2024-04-15', false, 'Complete', 'Minor fit adjustment noted by TD.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO merchandising_review (sample_id, owner_id, first_pc_review_confirmed_date, first_pc_review_complete_date, scf_shared_date, first_pc_rejected, internal_review_status, td_to_md_comment)
SELECT s.id, (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), NULL, NULL, NULL, false, 'In Progress', 'TD reviewing insulation thickness.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000004'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO merchandising_review (sample_id, owner_id, first_pc_review_confirmed_date, first_pc_review_complete_date, scf_shared_date, first_pc_rejected, internal_review_status, td_to_md_comment)
SELECT s.id, (SELECT id FROM users WHERE username = 'md.user' LIMIT 1), '2025-04-05', NULL, NULL, false, 'Pending', NULL
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000005'::uuid
ON CONFLICT (sample_id) DO NOTHING;

-- costing_analysis: cost_sheet_entered_date, costing_sent_to_brand_date
INSERT INTO costing_analysis (sample_id, analyst_id, brand_communication_owner_id, cost_sheet_entered_date, costing_sent_to_brand_date, notes)
SELECT s.id, (SELECT id FROM users WHERE username = 'costing.user' LIMIT 1), (SELECT id FROM users WHERE username = 'admin' LIMIT 1), '2024-04-01', '2024-04-08', 'Seed sample 1 – costing complete.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO costing_analysis (sample_id, analyst_id, brand_communication_owner_id, cost_sheet_entered_date, costing_sent_to_brand_date, notes)
SELECT s.id, (SELECT id FROM users WHERE username = 'costing.user' LIMIT 1), (SELECT id FROM users WHERE username = 'admin' LIMIT 1), NULL, NULL, 'Costing pending.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO costing_analysis (sample_id, analyst_id, brand_communication_owner_id, cost_sheet_entered_date, costing_sent_to_brand_date, notes)
SELECT s.id, (SELECT id FROM users WHERE username = 'costing.user' LIMIT 1), (SELECT id FROM users WHERE username = 'pd.dev' LIMIT 1), '2024-04-18', '2024-04-22', 'Merino crew costing.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO costing_analysis (sample_id, analyst_id, brand_communication_owner_id, cost_sheet_entered_date, costing_sent_to_brand_date, notes)
SELECT s.id, (SELECT id FROM users WHERE username = 'costing.user' LIMIT 1), (SELECT id FROM users WHERE username = 'admin' LIMIT 1), '2025-03-05', '2025-03-12', 'Puffer jacket – costing in review.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000004'::uuid
ON CONFLICT (sample_id) DO NOTHING;

INSERT INTO costing_analysis (sample_id, analyst_id, brand_communication_owner_id, cost_sheet_entered_date, costing_sent_to_brand_date, notes)
SELECT s.id, (SELECT id FROM users WHERE username = 'costing.user' LIMIT 1), (SELECT id FROM users WHERE username = 'td.user' LIMIT 1), NULL, NULL, 'Awaiting PC review.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000005'::uuid
ON CONFLICT (sample_id) DO NOTHING;

-- ========== SHIPPING (all date fields: estimated_arrival, actual_arrival) ==========

-- Shipping: places are Indonesia and China only (origin/destination)
INSERT INTO shipping_tracking (sample_id, awb, origin, destination, estimated_arrival, actual_arrival, status)
SELECT s.id, 'AWB-SEED-001', 'Indonesia', 'China', '2024-02-05', '2024-02-04', 'Delivered'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
AND NOT EXISTS (SELECT 1 FROM shipping_tracking WHERE sample_id = s.id AND awb = 'AWB-SEED-001');

INSERT INTO shipping_tracking (sample_id, awb, origin, destination, estimated_arrival, actual_arrival, status)
SELECT s.id, 'AWB-SEED-002', 'Indonesia', 'China', '2024-02-15', NULL, 'In Transit'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
AND NOT EXISTS (SELECT 1 FROM shipping_tracking WHERE sample_id = s.id AND awb = 'AWB-SEED-002');

INSERT INTO shipping_tracking (sample_id, awb, origin, destination, estimated_arrival, actual_arrival, status)
SELECT s.id, 'AWB-FW24-001', 'China', 'Indonesia', '2024-08-10', NULL, 'In Transit'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
AND NOT EXISTS (SELECT 1 FROM shipping_tracking WHERE sample_id = s.id AND awb = 'AWB-FW24-001');

INSERT INTO shipping_tracking (sample_id, awb, origin, destination, estimated_arrival, actual_arrival, status)
SELECT s.id, 'AWB-SS24-003', 'Indonesia', 'China', '2024-03-20', '2024-03-18', 'Delivered'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
AND NOT EXISTS (SELECT 1 FROM shipping_tracking WHERE sample_id = s.id AND awb = 'AWB-SS24-003');

INSERT INTO shipping_tracking (sample_id, awb, origin, destination, estimated_arrival, actual_arrival, status)
SELECT s.id, 'AWB-FW25-001', 'China', 'Indonesia', '2025-02-15', NULL, 'Booked'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000004'::uuid
AND NOT EXISTS (SELECT 1 FROM shipping_tracking WHERE sample_id = s.id AND awb = 'AWB-FW25-001');

-- ========== AUDIT (sample_history + status_transitions) ==========

INSERT INTO sample_history (sample_id, table_name, field_name, old_value, new_value, changed_by, change_notes)
SELECT s.id, 'samples', 'current_stage', NULL, 'product_business_dev', (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Initial seed: sample created.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000001'::uuid
AND NOT EXISTS (SELECT 1 FROM sample_history h WHERE h.sample_id = s.id AND h.table_name = 'samples' AND h.field_name = 'current_stage' AND h.change_notes = 'Initial seed: sample created.');

INSERT INTO sample_history (sample_id, table_name, field_name, old_value, new_value, changed_by, change_notes)
SELECT s.id, 'samples', 'current_stage', NULL, 'technical_design', (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Initial seed: sample created.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000002'::uuid
AND NOT EXISTS (SELECT 1 FROM sample_history h WHERE h.sample_id = s.id AND h.table_name = 'samples' AND h.field_name = 'current_stage' AND h.change_notes = 'Initial seed: sample created.');

INSERT INTO status_transitions (sample_id, from_status, to_status, stage, transitioned_by, notes)
SELECT s.id, NULL, 'In Development', 'product_business_dev', (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Seed: initial status.'
FROM samples s WHERE s.id IN ('a1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid)
AND NOT EXISTS (SELECT 1 FROM status_transitions t WHERE t.sample_id = s.id AND t.notes = 'Seed: initial status.');

INSERT INTO status_transitions (sample_id, from_status, to_status, stage, transitioned_by, notes)
SELECT s.id, NULL, 'In Development', 'product_business_dev', (SELECT id FROM users WHERE username = 'pd.dev' LIMIT 1), 'Seed: initial status.'
FROM samples s WHERE s.id = 'a1000000-0000-0000-0000-000000000003'::uuid
AND NOT EXISTS (SELECT 1 FROM status_transitions t WHERE t.sample_id = s.id AND t.notes = 'Seed: initial status.');

INSERT INTO status_transitions (sample_id, from_status, to_status, stage, transitioned_by, notes)
SELECT s.id, NULL, 'In Development', 'product_business_dev', (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'Seed: initial status.'
FROM samples s WHERE s.id IN ('a1000000-0000-0000-0000-000000000004'::uuid, 'a1000000-0000-0000-0000-000000000005'::uuid)
AND NOT EXISTS (SELECT 1 FROM status_transitions t WHERE t.sample_id = s.id AND t.notes = 'Seed: initial status.');
