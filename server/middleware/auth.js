import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * Verify JWT and attach decoded payload to req.user (id, username, roleCode).
 * Use on routes that require authentication.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Optional auth: if Bearer token present, verify and set req.user; otherwise continue without user.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next();
  }
};

/**
 * Require that the authenticated user has one of the given role codes.
 * Use after authenticate().
 * @param {string[]} allowedRoles - e.g. ['ADMIN', 'PD', 'MD']
 */
export const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const role = (req.user.roleCode || '').toUpperCase();
  if (!allowedRoles.map((r) => r.toUpperCase()).includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions', requiredRoles: allowedRoles });
  }
  next();
};
