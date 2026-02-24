/**
 * Role-based access control. Use after authenticate().
 * Roles: PBD, TD, FTY, MD, COSTING, BRAND, ADMIN, SUPER_ADMIN.
 * Stage visibility: role sees sample data; per-role stage write is defined below. ADMIN sees all.
 */

import { supabase } from '../config/supabase.js';

/** Stage tables (sample_request API). */
export const STAGE_TABLES = [
  'psi',
  'sample_development',
  'pc_review',
  'costing',
  'shipment_to_brand',
];

/** Role → stage tables. null = all stages. */
const ROLE_STAGES = {
  ADMIN: null,
  SUPER_ADMIN: null,
  BRAND: null,
  PBD: ['costing', 'shipment_to_brand'],
  TD: ['psi', 'sample_development', 'pc_review'],
  FTY: ['sample_development', 'costing'],
  MD: ['pc_review'],
  COSTING: ['costing'],
};

/** Compatibility mapping for any remaining legacy role codes. */
const LEGACY_TO_REVISED = {
  PD: 'PBD',
  FACTORY: 'FTY',
};

const FEATURE_CODES = [
  'USERS',
  'ROLES',
  'BRANDS',
  'SEASONS',
  'DIVISIONS',
  'PRODUCT_CATEGORIES',
  'SAMPLE_TYPES',
  'ANALYTICS',
  'EXPORT',
];

const FEATURE_FALLBACK = {
  ADMIN: {
    USERS: { can_read: true, can_write: true, can_approve: true },
    ROLES: { can_read: true, can_write: true, can_approve: true },
    BRANDS: { can_read: true, can_write: true, can_approve: true },
    SEASONS: { can_read: true, can_write: true, can_approve: true },
    DIVISIONS: { can_read: true, can_write: true, can_approve: true },
    PRODUCT_CATEGORIES: { can_read: true, can_write: true, can_approve: true },
    SAMPLE_TYPES: { can_read: true, can_write: true, can_approve: true },
    ANALYTICS: { can_read: true, can_write: true, can_approve: true },
    EXPORT: { can_read: true, can_write: true, can_approve: true },
  },
  SUPER_ADMIN: {
    USERS: { can_read: true, can_write: true, can_approve: true },
    ROLES: { can_read: true, can_write: true, can_approve: true },
    BRANDS: { can_read: true, can_write: true, can_approve: true },
    SEASONS: { can_read: true, can_write: true, can_approve: true },
    DIVISIONS: { can_read: true, can_write: true, can_approve: true },
    PRODUCT_CATEGORIES: { can_read: true, can_write: true, can_approve: true },
    SAMPLE_TYPES: { can_read: true, can_write: true, can_approve: true },
    ANALYTICS: { can_read: true, can_write: true, can_approve: true },
    EXPORT: { can_read: true, can_write: true, can_approve: true },
  },
  PBD: {
    BRANDS: { can_read: true, can_write: false, can_approve: false },
    SEASONS: { can_read: true, can_write: false, can_approve: false },
    DIVISIONS: { can_read: true, can_write: false, can_approve: false },
    PRODUCT_CATEGORIES: { can_read: true, can_write: false, can_approve: false },
    SAMPLE_TYPES: { can_read: true, can_write: false, can_approve: false },
    ANALYTICS: { can_read: true, can_write: false, can_approve: false },
    EXPORT: { can_read: true, can_write: false, can_approve: false },
  },
  TD: {
    BRANDS: { can_read: true, can_write: false, can_approve: false },
    SEASONS: { can_read: true, can_write: false, can_approve: false },
    DIVISIONS: { can_read: true, can_write: false, can_approve: false },
    PRODUCT_CATEGORIES: { can_read: true, can_write: false, can_approve: false },
    SAMPLE_TYPES: { can_read: true, can_write: false, can_approve: false },
    ANALYTICS: { can_read: true, can_write: false, can_approve: false },
    EXPORT: { can_read: true, can_write: false, can_approve: false },
  },
  FTY: {
    BRANDS: { can_read: true, can_write: false, can_approve: false },
    SEASONS: { can_read: true, can_write: false, can_approve: false },
    DIVISIONS: { can_read: true, can_write: false, can_approve: false },
    PRODUCT_CATEGORIES: { can_read: true, can_write: false, can_approve: false },
    SAMPLE_TYPES: { can_read: true, can_write: false, can_approve: false },
    ANALYTICS: { can_read: true, can_write: false, can_approve: false },
    EXPORT: { can_read: true, can_write: false, can_approve: false },
  },
  MD: {
    BRANDS: { can_read: true, can_write: false, can_approve: false },
    SEASONS: { can_read: true, can_write: false, can_approve: false },
    DIVISIONS: { can_read: true, can_write: false, can_approve: false },
    PRODUCT_CATEGORIES: { can_read: true, can_write: false, can_approve: false },
    SAMPLE_TYPES: { can_read: true, can_write: false, can_approve: false },
    ANALYTICS: { can_read: true, can_write: false, can_approve: false },
    EXPORT: { can_read: true, can_write: false, can_approve: false },
  },
  COSTING: {
    BRANDS: { can_read: true, can_write: false, can_approve: false },
    SEASONS: { can_read: true, can_write: false, can_approve: false },
    DIVISIONS: { can_read: true, can_write: false, can_approve: false },
    PRODUCT_CATEGORIES: { can_read: true, can_write: false, can_approve: false },
    SAMPLE_TYPES: { can_read: true, can_write: false, can_approve: false },
    ANALYTICS: { can_read: true, can_write: false, can_approve: false },
    EXPORT: { can_read: true, can_write: false, can_approve: false },
  },
  BRAND: {
    BRANDS: { can_read: true, can_write: false, can_approve: false },
    SEASONS: { can_read: true, can_write: false, can_approve: false },
    DIVISIONS: { can_read: true, can_write: false, can_approve: false },
    PRODUCT_CATEGORIES: { can_read: true, can_write: false, can_approve: false },
    SAMPLE_TYPES: { can_read: true, can_write: false, can_approve: false },
    ANALYTICS: { can_read: true, can_write: false, can_approve: false },
    EXPORT: { can_read: true, can_write: false, can_approve: false },
  },
};

function resolveRoleCode(roleCode) {
  const code = (roleCode || '').toUpperCase();
  return LEGACY_TO_REVISED[code] || code;
}

function getFallbackFeaturePermission(roleCode, feature) {
  const resolvedRole = resolveRoleCode(roleCode);
  return FEATURE_FALLBACK[resolvedRole]?.[feature] || null;
}

async function getFeaturePermission(roleCode, feature) {
  const resolvedRole = resolveRoleCode(roleCode);
  if (!FEATURE_CODES.includes(feature)) return null;

  const { data, error } = await supabase
    .from('role_feature_permission')
    .select('can_read, can_write, can_approve')
    .eq('role', resolvedRole)
    .eq('feature', feature)
    .maybeSingle();

  if (error?.code === '42P01') {
    return getFallbackFeaturePermission(resolvedRole, feature);
  }

  if (error) throw error;
  if (data) return data;
  return getFallbackFeaturePermission(resolvedRole, feature);
}

function requireFeatureAccess(feature, mode = 'read') {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const key = String(feature || '').trim().toUpperCase();
    if (!FEATURE_CODES.includes(key)) {
      return res.status(500).json({ error: `Invalid RBAC feature: ${key || '(empty)'}` });
    }

    try {
      const permission = await getFeaturePermission(req.user?.roleCode, key);
      const allowed =
        (mode === 'read' && !!permission?.can_read) ||
        (mode === 'write' && !!permission?.can_write) ||
        (mode === 'approve' && !!permission?.can_approve);

      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });
      next();
    } catch (err) {
      console.error('feature RBAC check failed:', err);
      return res.status(500).json({ error: 'Failed to validate permissions' });
    }
  };
}

export const requireFeatureRead = (feature) => requireFeatureAccess(feature, 'read');
export const requireFeatureWrite = (feature) => requireFeatureAccess(feature, 'write');
export const requireFeatureApprove = (feature) => requireFeatureAccess(feature, 'approve');

/**
 * Stages this role is allowed to see/update. Returns array of stage table names, or null for "all".
 * @param {string} roleCode
 * @returns {string[]|null}
 */
export function getStagesForRole(roleCode) {
  const resolved = resolveRoleCode(roleCode);
  return ROLE_STAGES[resolved] ?? null;
}

const ADMIN = ['ADMIN', 'SUPER_ADMIN'];
const SAMPLE_CREATE = ['ADMIN', 'SUPER_ADMIN', 'PBD'];
const SAMPLE_EDITORS = ['ADMIN', 'SUPER_ADMIN', 'PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND'];
const ANALYTICS_AND_EXPORT = ['ADMIN', 'SUPER_ADMIN', 'PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND'];
const ALL_AUTHENTICATED = ['ADMIN', 'SUPER_ADMIN', 'PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND'];

function roleMatch(req, roles) {
  const role = (req.user?.roleCode || '').toUpperCase();
  return roles.map((r) => r.toUpperCase()).includes(role);
}

/** Only ADMIN or SUPER_ADMIN */
export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, ADMIN)) return res.status(403).json({ error: 'Admin only' });
  next();
};

/** ADMIN or sample-editor roles – full sample + lookups read/write */
export const requireSampleEditor = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, SAMPLE_EDITORS)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

/** Any authenticated user */
export const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
};

/** Can access analytics and export */
export const requireAnalyticsOrExport = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, ANALYTICS_AND_EXPORT)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

/** Read sample access: all authenticated roles */
export const requireSampleRead = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, ALL_AUTHENTICATED)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

/** Create sample: only ADMIN, PBD */
export const requireSampleCreate = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, SAMPLE_CREATE)) return res.status(403).json({ error: 'Only Admin or PBD can create samples' });
  next();
};

/** Update/delete the sample record: only ADMIN, PBD. Other roles edit only their stage tables. */
export const requireSampleUpdate = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, SAMPLE_CREATE)) return res.status(403).json({ error: 'Only Admin or PBD can update or delete the sample record' });
  next();
};

/** Write to stage tables and shipping */
export const requireSampleWrite = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, SAMPLE_EDITORS)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

export const isAdmin = (req) => roleMatch(req, ADMIN);
export const isSampleEditor = (req) => roleMatch(req, SAMPLE_EDITORS);
