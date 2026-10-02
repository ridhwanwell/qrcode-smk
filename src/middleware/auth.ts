import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../server/supabaseAdmin';

export type UserRole = 'admin_utama' | 'admin_teknik' | 'admin_keuangan' | 'hanya_sph';

export const OFFICIAL_ROLES: readonly UserRole[] = [
  'admin_utama',
  'admin_teknik',
  'admin_keuangan',
  'hanya_sph'
] as const;

export interface AuthRequest extends Request {
  user?: any;
  userRole?: UserRole;
}

// In-memory cache for user roles (TTL 60 seconds) to reduce repeated database queries
interface CachedRole {
  role: UserRole;
  expiresAt: number;
}
const roleCache = new Map<string, CachedRole>();

/**
 * Express middleware to enforce valid Supabase Authentication Bearer token on backend API routes.
 * 
 * Aturan:
 * - Tanpa header "Authorization: Bearer <token>" -> 401 {"error":"Sesi login diperlukan"}.
 * - Token tidak valid/kedaluwarsa (supabaseAdmin.auth.getUser gagal) -> 401 {"error":"Sesi login diperlukan"}.
 * - Baca role dari public.profiles berdasarkan user.id. Jika baris tidak ada atau role bukan
 *   salah satu dari 4 role resmi -> 403 {"error":"Akun belum memiliki hak akses"}.
 * - Blok catch -> 503 {"error":"Layanan autentikasi sedang tidak tersedia, coba lagi"}.
 * - Hapus SEMUA fallback yang mengisi req.userRole = 'admin_utama' dan user palsu 'admin-utama-local'.
 * - Simpan hasil (user id -> role) di cache memori 60 detik agar tidak query profiles setiap request.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Sesi login diperlukan" });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Sesi login diperlukan" });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error('[Auth Error] Token tidak valid atau kedaluwarsa:', authError?.message);
      return res.status(401).json({ error: "Sesi login diperlukan" });
    }

    const user = authData.user;
    const userId = user.id;
    req.user = user;

    // Check memory cache first (60 detik)
    const now = Date.now();
    const cached = roleCache.get(userId);

    let assignedRole: UserRole;
    if (cached && cached.expiresAt > now) {
      assignedRole = cached.role;
    } else {
      // Baca role dari public.profiles di server
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error(`[Auth Error] Gagal membaca profil pengguna ${userId}:`, profileError);
        return res.status(503).json({ error: "Layanan autentikasi sedang tidak tersedia, coba lagi" });
      }

      if (!profile || !profile.role || !OFFICIAL_ROLES.includes(profile.role as UserRole)) {
        console.warn(`[Auth Warning] User ${userId} (${user.email}) tidak memiliki role resmi:`, profile?.role);
        return res.status(403).json({ error: "Akun belum memiliki hak akses" });
      }

      assignedRole = profile.role as UserRole;
      roleCache.set(userId, {
        role: assignedRole,
        expiresAt: now + 60 * 1000
      });
    }

    req.userRole = assignedRole;
    return next();
  } catch (error) {
    console.error('[Auth Catch Error] Terjadi kegagalan layanan autentikasi:', error);
    return res.status(503).json({ error: "Layanan autentikasi sedang tidak tersedia, coba lagi" });
  }
};

/**
 * Middleware untuk validasi hak akses berdasarkan role pengguna.
 * Jika role pengguna tidak termasuk dalam allowedRoles, tolak dengan 403 Forbidden.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      console.warn(`[Access Denied] User '${req.user?.email}' dengan role '${req.userRole}' tidak diizinkan (dibutuhkan: ${allowedRoles.join(', ')}).`);
      return res.status(403).json({ error: "Akun belum memiliki hak akses" });
    }
    return next();
  };
};


