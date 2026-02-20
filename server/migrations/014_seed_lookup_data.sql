-- =============================================================================
-- Migration 014: Seed Lookup Data
-- Inserts: brands, seasons, divisions, product_categories, sample_types
-- =============================================================================

-- Brands
INSERT INTO brands (name, contact, is_active, created_at, updated_at) VALUES
  ('511 Tactical', NULL, true, now(), now()),
  ('66 Degrees North', NULL, true, now(), now()),
  ('Arc''teryx', NULL, true, now(), now()),
  ('Aycane', NULL, true, now(), now()),
  ('Bell', NULL, true, now(), now()),
  ('Burton', NULL, true, now(), now()),
  ('Burton SMU', NULL, true, now(), now()),
  ('Callaway Golf', NULL, true, now(), now()),
  ('Columbia', NULL, true, now(), now()),
  ('Cotopaxi', NULL, true, now(), now()),
  ('Dickies', NULL, true, now(), now()),
  ('Dynafit', NULL, true, now(), now()),
  ('Evo', NULL, true, now(), now()),
  ('Evo HQ', NULL, true, now(), now()),
  ('Fjall Raven', NULL, true, now(), now()),
  ('Footasylum', NULL, true, now(), now()),
  ('Fox Racing', NULL, true, now(), now()),
  ('Haglofs', NULL, true, now(), now()),
  ('Halfdays', NULL, true, now(), now()),
  ('Helly Hansen', NULL, true, now(), now()),
  ('Hunter', NULL, true, now(), now()),
  ('Jack Wolfskin', NULL, true, now(), now()),
  ('Kuhl', NULL, true, now(), now()),
  ('Kuiu', NULL, true, now(), now()),
  ('LL Bean', NULL, true, now(), now()),
  ('Lego', NULL, true, now(), now()),
  ('Madison 88', NULL, true, now(), now()),
  ('Mammut', NULL, true, now(), now()),
  ('Marmot', NULL, true, now(), now()),
  ('Melin', NULL, true, now(), now()),
  ('Musto', NULL, true, now(), now()),
  ('Odlo', NULL, true, now(), now()),
  ('On AG', NULL, true, now(), now()),
  ('Outdoor Research', NULL, true, now(), now()),
  ('Peak Performance', NULL, true, now(), now()),
  ('Prana', NULL, true, now(), now()),
  ('Rhoback', NULL, true, now(), now()),
  ('Ridestore', NULL, true, now(), now()),
  ('Roark', NULL, true, now(), now()),
  ('Rossignol', NULL, true, now(), now()),
  ('Skida', NULL, true, now(), now()),
  ('Smartwool', NULL, true, now(), now()),
  ('Sorel', NULL, true, now(), now()),
  ('Supreme', NULL, true, now(), now()),
  ('The North Face', NULL, true, now(), now()),
  ('Travis Mathew', NULL, true, now(), now()),
  ('Truewerk', NULL, true, now(), now()),
  ('Under Armour', NULL, true, now(), now()),
  ('Vans', NULL, true, now(), now()),
  ('Vuori', NULL, true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Seasons
INSERT INTO seasons (code, year, is_active, created_at, updated_at) VALUES
  ('F25', 2025, true, now(), now()),
  ('F26', 2026, true, now(), now()),
  ('F27', 2027, true, now(), now()),
  ('F28', 2028, true, now(), now()),
  ('FW26', 2026, true, now(), now()),
  ('FW27', 2027, true, now(), now()),
  ('H26', 2026, true, now(), now()),
  ('Holiday 26', 2026, true, now(), now()),
  ('S26', 2026, true, now(), now()),
  ('S27', 2027, true, now(), now()),
  ('S3-26', 2026, true, now(), now()),
  ('SP26', 2026, true, now(), now()),
  ('SS26', 2026, true, now(), now()),
  ('SS27', 2027, true, now(), now()),
  ('W26', 2026, true, now(), now())
ON CONFLICT (code, year) DO NOTHING;

-- Divisions
INSERT INTO divisions (name, description, is_active, created_at, updated_at) VALUES
  ('China', NULL, true, now(), now()),
  ('In Line', NULL, true, now(), now()),
  ('Outlet', NULL, true, now(), now()),
  ('SMU', NULL, true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Product Categories
INSERT INTO product_categories (name, description, is_active, created_at, updated_at) VALUES
  ('Arm Warmer', NULL, true, now(), now()),
  ('Balaclava', NULL, true, now(), now()),
  ('Ball Cap', NULL, true, now(), now()),
  ('Beanie', NULL, true, now(), now()),
  ('Brimmed Hat', NULL, true, now(), now()),
  ('Cut & Sew Fleece', NULL, true, now(), now()),
  ('Dog Sweater', NULL, true, now(), now()),
  ('Gaitor', NULL, true, now(), now()),
  ('Gloves', NULL, true, now(), now()),
  ('Headband', NULL, true, now(), now()),
  ('Knit Downs', NULL, true, now(), now()),
  ('Legwarmers', NULL, true, now(), now()),
  ('Scarf', NULL, true, now(), now()),
  ('Socks', NULL, true, now(), now()),
  ('Sweater', NULL, true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Sample Types
INSERT INTO sample_types (name, description, is_active, created_at, updated_at) VALUES
  ('Approval Sample', NULL, true, now(), now()),
  ('Bench P1', NULL, true, now(), now()),
  ('Bench P1 Remake 1', NULL, true, now(), now()),
  ('Embroidery', NULL, true, now(), now()),
  ('Fitting Sample', NULL, true, now(), now()),
  ('Knitdown', NULL, true, now(), now()),
  ('M88 Inventory Restock', NULL, true, now(), now()),
  ('P1', NULL, true, now(), now()),
  ('P1 Revised', NULL, true, now(), now()),
  ('P1 Remake 1', NULL, true, now(), now()),
  ('P2', NULL, true, now(), now()),
  ('P2 Remake', NULL, true, now(), now()),
  ('P2 Remake 1', NULL, true, now(), now()),
  ('P3', NULL, true, now(), now()),
  ('P4', NULL, true, now(), now()),
  ('P5', NULL, true, now(), now()),
  ('Pre-Dev P1', NULL, true, now(), now()),
  ('Pre-Dev P1 Remake 1', NULL, true, now(), now()),
  ('Product Finish Testing', NULL, true, now(), now()),
  ('Strike-off', NULL, true, now(), now()),
  ('Wear Test', NULL, true, now(), now())
ON CONFLICT (name) DO NOTHING;
