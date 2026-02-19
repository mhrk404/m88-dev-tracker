/**
 * Role-based access control. Use after authenticate().
 * Roles: PBD, TD, FTY, MD, COSTING, BRAND, ADMIN.
 * Stage visibility: role sees sample data; per-role stage write is defined below. ADMIN sees all.
 */

/** Stage tables (sample_request API). */
export const STAGE_TABLES = [
  'psi',
  'sample_development',
  'pc_review',
  'costing',
  'scf',
  'shipment_to_brand',
];

/** Role → stage tables. null = all stages. */
const ROLE_STAGES = {
  ADMIN: null,
  BRAND: null,
  PBD: ['costing', 'shipment_to_brand'],
  TD: ['psi', 'sample_development', 'pc_review'],
  FTY: ['sample_development', 'costing', 'scf'],
  MD: ['pc_review'],
  COSTING: ['costing'],
};

/** Compatibility mapping for any remaining legacy role codes. */
const LEGACY_TO_REVISED = {
  PD: 'PBD',
  FACTORY: 'FTY',
  SUPER_ADMIN: 'ADMIN'
};

/**
 * Stages this role is allowed to see/update. Returns array of stage table names, or null for "all".
 * @param {string} roleCode
 * @returns {string[]|null}
 */
export function getStagesForRole(roleCode) {
  const code = (roleCode || '').toUpperCase();
  const resolved = LEGACY_TO_REVISED[code] || code;
  return ROLE_STAGES[resolved] ?? null;
}

const ADMIN = ['ADMIN'];
const SAMPLE_CREATE = ['ADMIN', 'PBD'];
const SAMPLE_EDITORS = ['ADMIN', 'PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND'];
const ANALYTICS_AND_EXPORT = ['ADMIN', 'PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND'];
const ALL_AUTHENTICATED = ['ADMIN', 'PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND'];

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
