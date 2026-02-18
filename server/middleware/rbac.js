/**
 * Role-based access control. Use after authenticate().
 * Roles: SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY
 * Stage visibility: PD/MD/TD/COSTING/FACTORY see sample data but only their stage(s); ADMIN and SUPER_ADMIN see all.
 */

export const STAGE_TABLES = [
  'product_business_dev',
  'technical_design',
  'factory_execution',
  'merchandising_review',
  'costing_analysis',
];

/** Role → stage table(s) that role can see/edit. ADMIN/SUPER_ADMIN see all; others see only their stage. */
const ROLE_STAGES = {
  SUPER_ADMIN: null,
  ADMIN: null,
  PD: ['product_business_dev'],
  MD: ['merchandising_review'],
  TD: ['technical_design'],
  COSTING: ['costing_analysis'],
  FACTORY: ['factory_execution'],
};

/**
 * Stages this role is allowed to see/update. Returns array of stage table names, or null for "all".
 * @param {string} roleCode
 * @returns {string[]|null}
 */
export function getStagesForRole(roleCode) {
  const code = (roleCode || '').toUpperCase();
  return ROLE_STAGES[code] ?? null;
}

const ADMIN = ['ADMIN', 'SUPER_ADMIN'];
const SAMPLE_EDITORS = ['ADMIN', 'SUPER_ADMIN', 'PD', 'MD', 'TD', 'COSTING', 'FACTORY'];
const ANALYTICS_AND_EXPORT = ['ADMIN', 'SUPER_ADMIN', 'PD', 'MD', 'TD', 'COSTING', 'FACTORY'];
const ALL_AUTHENTICATED = ['ADMIN', 'SUPER_ADMIN', 'PD', 'MD', 'TD', 'COSTING', 'FACTORY'];

function roleMatch(req, roles) {
  const role = (req.user?.roleCode || '').toUpperCase();
  return roles.map((r) => r.toUpperCase()).includes(role);
}

/** Only ADMIN or SUPER_ADMIN */
export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, ADMIN)) return res.status(403).json({ error: 'Admin or Super Admin only' });
  next();
};

/** ADMIN or sample-editor roles (PD, MD, TD, COSTING, FACTORY) – full sample + lookups read/write */
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

/** Write to samples (create/update/delete): only editors */
export const requireSampleWrite = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roleMatch(req, SAMPLE_EDITORS)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

export const isAdmin = (req) => roleMatch(req, ADMIN);
export const isSampleEditor = (req) => roleMatch(req, SAMPLE_EDITORS);
