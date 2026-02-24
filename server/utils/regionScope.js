export const REGION_VALUES = ['US', 'PH', 'INDONESIA'];

export function normalizeRegion(value) {
  const region = String(value ?? '').trim().toUpperCase();
  if (!region) return null;
  if (region === 'ID' || region === 'INDO') return 'INDONESIA';
  return region;
}

export function isSuperAdmin(req) {
  return (req.user?.roleCode || '').toUpperCase() === 'SUPER_ADMIN';
}

export function isAdmin(req) {
  return (req.user?.roleCode || '').toUpperCase() === 'ADMIN';
}

export function isValidRegion(region) {
  return REGION_VALUES.includes(region);
}

export function canAccessRegion(req, targetRegion) {
  if (isSuperAdmin(req)) return true;
  return normalizeRegion(req.user?.region) === normalizeRegion(targetRegion);
}
