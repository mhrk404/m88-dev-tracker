import { supabase } from '../config/supabase.js';

/**
 * Write an audit log entry. Non-blocking; errors are logged but do not fail the request.
 * @param {Object} opts
 * @param {number|null} opts.userId - user id (null for failed login)
 * @param {string} opts.action - e.g. 'login', 'login_failed', 'logout', 'create', 'update', 'delete', 'read'
 * @param {string} opts.resource - e.g. 'auth', 'user', 'sample', 'brand', 'shipping'
 * @param {string|null} opts.resourceId - id of the resource (e.g. sample uuid)
 * @param {Object|null} opts.details - optional payload (e.g. { reason, roleCode } or old/new values)
 * @param {string|null} opts.ip - req.ip or req.headers['x-forwarded-for']
 * @param {string|null} opts.userAgent - req.headers['user-agent']
 */
export async function logAudit({ userId = null, action, resource, resourceId = null, details = null, ip = null, userAgent = null }) {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      details: details ?? null,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
    });
  } catch (err) {
    console.error('audit log write failed:', err);
  }
}

/**
 * Get client IP and user-agent from Express request.
 */
export function auditMeta(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  return { ip, userAgent };
}
