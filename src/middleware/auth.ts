import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../server/supabaseAdmin';

export interface AuthRequest extends Request {
  user?: any;
  userRole?: string;
}

/**
 * Express middleware to enforce valid Supabase Authentication Bearer token on backend API routes.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized: Token invalid or expired' });
    }

    req.user = data.user;

    // Fetch user profile/role (Fail-closed security: deny access if profile or role is missing)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.role) {
      return res.status(403).json({ error: 'Forbidden: Profil pengguna atau role tidak ditemukan' });
    }

    req.userRole = profile.role;
    next();
  } catch (error) {
    console.error('Error verifying Supabase token in requireAuth:', error);
    return res.status(401).json({ error: 'Unauthorized: Error during authentication check' });
  }
};

/**
 * Optional role-based middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation' });
    }
    next();
  };
};
