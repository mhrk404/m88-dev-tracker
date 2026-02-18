import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { logAudit, auditMeta } from '../services/auditService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

/**
 * Register a new user. Requires username, email, password, and role_id (or role code).
 * Returns user (no password) and token.
 */
export const register = async (req, res) => {
  try {
    const { username, email, password, full_name, department, role_id, role_code } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let resolvedRoleId = role_id;
    if (!resolvedRoleId && role_code) {
      const { data: roleRow } = await supabase.from('roles').select('id').eq('code', role_code.toUpperCase()).eq('is_active', true).maybeSingle();
      resolvedRoleId = roleRow?.id;
    }
    if (!resolvedRoleId) {
      const { data: defaultRole } = await supabase.from('roles').select('id').eq('code', 'ADMIN').maybeSingle();
      resolvedRoleId = defaultRole?.id;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash,
        full_name: full_name?.trim() || null,
        department: department?.trim() || null,
        role_id: resolvedRoleId,
        is_active: true,
      })
      .select(`
        id,
        username,
        email,
        full_name,
        department,
        role_id,
        is_active,
        created_at
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      throw error;
    }

    const { data: role } = await supabase.from('roles').select('code, name').eq('id', user.role_id).single();
    const roleCode = role?.code || 'ADMIN';

    const token = jwt.sign(
      { id: user.id, username: user.username, roleCode },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { ip, userAgent } = auditMeta(req);
    await logAudit({ userId: user.id, action: 'register', resource: 'auth', resourceId: String(user.id), details: { username: user.username, roleCode }, ip, userAgent });

    return res.status(201).json({
      user: { ...user, roleCode, roleName: role?.name },
      token,
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Login with username (or email) and password. Returns user and JWT.
 */
export const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginId = (username || email)?.trim();
    const pwd = password;

    if (!loginId || !pwd) {
      return res.status(400).json({ error: 'Username or email and password are required' });
    }

    const isEmail = loginId.includes('@');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, department, role_id, is_active, password_hash')
      .eq(isEmail ? 'email' : 'username', loginId)
      .maybeSingle();

    if (error) throw error;
    const { ip, userAgent } = auditMeta(req);
    if (!user) {
      await logAudit({ userId: null, action: 'login_failed', resource: 'auth', details: { reason: 'user_not_found', loginId }, ip, userAgent });
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    if (!user.is_active) {
      await logAudit({ userId: user.id, action: 'login_failed', resource: 'auth', details: { reason: 'account_disabled', username: user.username }, ip, userAgent });
      return res.status(403).json({ error: 'Account is disabled' });
    }
    if (!user.password_hash) {
      await logAudit({ userId: user.id, action: 'login_failed', resource: 'auth', details: { reason: 'no_password', username: user.username }, ip, userAgent });
      return res.status(403).json({ error: 'Local login not set for this account; use Supabase Auth or set a password' });
    }

    const valid = await bcrypt.compare(pwd, user.password_hash);
    if (!valid) {
      await logAudit({ userId: user.id, action: 'login_failed', resource: 'auth', details: { reason: 'invalid_password', username: user.username }, ip, userAgent });
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const { data: role } = await supabase.from('roles').select('code, name').eq('id', user.role_id).single();
    const roleCode = role?.code || 'ADMIN';

    const token = jwt.sign(
      { id: user.id, username: user.username, roleCode },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAudit({ userId: user.id, action: 'login', resource: 'auth', resourceId: String(user.id), details: { username: user.username, roleCode }, ip, userAgent });

    const { password_hash: _, ...safeUser } = user;
    return res.json({
      user: { ...safeUser, roleCode, roleName: role?.name },
      token,
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Logout: audit only (JWT is stateless; client discards token).
 */
export const logout = async (req, res) => {
  try {
    if (req.user) {
      const { ip, userAgent } = auditMeta(req);
      await logAudit({ userId: req.user.id, action: 'logout', resource: 'auth', resourceId: String(req.user.id), details: { username: req.user.username }, ip, userAgent });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Get current user from JWT. Use after authenticate middleware.
 */
export const me = async (req, res) => {
  try {
    const { id } = req.user;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, department, role_id, is_active, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: role } = await supabase.from('roles').select('code, name').eq('id', user.role_id).single();
    return res.json({
      ...user,
      roleCode: role?.code || 'ADMIN',
      roleName: role?.name,
    });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Failed to get user' });
  }
};
