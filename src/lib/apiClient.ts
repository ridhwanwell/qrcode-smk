import { supabase } from './supabaseClient';

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
}

const RETRY_DELAYS = [1000, 3000, 9000]; // 1s, 3s, 9s

/**
 * Resilient authenticated fetch client for PT. SMK asset management.
 * 
 * Aturan:
 * - Ambil access_token dari supabase.auth.getSession() dan pasang header Authorization: Bearer.
 * - Timeout 20 detik memakai AbortController.
 * - Retry otomatis maksimal 3x dengan jeda 1s, 3s, 9s HANYA untuk error jaringan, timeout,
 *   502/503/504. Jangan retry untuk 400/401/403/409.
 * - Jika 401 -> panggil supabase.auth.refreshSession() sekali lalu ulangi; jika tetap 401
 *   arahkan ke sesi login/logout.
 * - Setiap request tulis (POST/DELETE/PUT/PATCH) membawa header Idempotency-Key (crypto.randomUUID())
 *   yang SAMA untuk semua percobaan ulang.
 */
export async function apiFetch(
  input: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 20000, // 20 detik
    retries = 3,       // Maksimal 3x retry
    skipAuth = false,
    headers: customHeaders = {},
    ...fetchInit
  } = options;

  const headers = new Headers(customHeaders);
  const method = (fetchInit.method || 'GET').toUpperCase();

  // 1. Resolve Authorization Token
  if (!skipAuth && !headers.has('Authorization')) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    } catch (e) {
      console.warn('[apiClient] Gagal membaca access token sesi:', e);
    }
  }

  // 2. Set default Content-Type for write requests with body
  if (fetchInit.body && !headers.has('Content-Type') && !(fetchInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 3. Set same Idempotency-Key across all retry attempts for write requests
  const isWriteRequest = ['POST', 'DELETE', 'PUT', 'PATCH'].includes(method);
  if (isWriteRequest && !headers.has('Idempotency-Key')) {
    const key = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    headers.set('Idempotency-Key', key);
  }

  let attempt = 0;
  let hasRefreshedToken = false;
  let lastError: any = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(input, {
        ...fetchInit,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle 401: Coba refresh token sekali
      if (response.status === 401 && !skipAuth && !hasRefreshedToken) {
        hasRefreshedToken = true;
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session?.access_token) {
            headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
            // Retry request dengan token baru (tidak menghabiskan kuota retry jaringan)
            continue;
          }
        } catch (_) {}

        // Jika tetap 401 setelah refresh gagal, trigger session expire
        console.warn('[apiClient] Sesi login telah berakhir (401). Silakan login kembali.');
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth_session_expired'));
          }
        } catch (_) {}
        return response;
      }

      // Jangan retry untuk kode status klien: 400, 401, 403, 404, 409
      if ([400, 401, 403, 404, 409].includes(response.status)) {
        return response;
      }

      // HANYA retry untuk 502, 503, 504
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        const delayMs = RETRY_DELAYS[attempt] || 9000;
        attempt++;
        console.warn(`[apiClient] Server status ${response.status}. Retry ${attempt}/${retries} dalam ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isAbort = err?.name === 'AbortError';
      const isNetworkError = err instanceof TypeError || isAbort;

      // HANYA retry untuk network error atau timeout
      if (isNetworkError && attempt < retries) {
        const delayMs = RETRY_DELAYS[attempt] || 9000;
        attempt++;
        console.warn(`[apiClient] ${isAbort ? 'Timeout (20s)' : 'Koneksi jaringan terputus'}. Retry ${attempt}/${retries} dalam ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      break;
    }
  }

  // Jika seluruh retry habis
  const errMsg = lastError?.name === 'AbortError'
    ? 'Koneksi waktu habis (timeout 20s). Sinyal internet rumah sakit mungkin lemah atau terputus.'
    : 'Gagal terhubung ke server. Periksa koneksi internet perangkat Anda.';

  throw new Error(errMsg);
}

/**
 * Convenient JSON API GET helper with error checking
 */
export async function apiGet<T = any>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(url, { ...options, method: 'GET' });
  if (!res.ok) {
    let errJson: any = {};
    try {
      errJson = await res.json();
    } catch (_) {}
    throw new Error(errJson.error || `Permintaan gagal dengan status ${res.status}`);
  }
  return res.json();
}

/**
 * Convenient JSON API POST helper with error checking
 */
export async function apiPost<T = any>(url: string, body?: any, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(url, {
    ...options,
    method: 'POST',
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
  });
  if (!res.ok) {
    let errJson: any = {};
    try {
      errJson = await res.json();
    } catch (_) {}
    throw new Error(errJson.error || `Gagal menyimpan data (status ${res.status})`);
  }
  return res.json();
}

/**
 * Convenient JSON API DELETE helper with error checking
 */
export async function apiDelete<T = any>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(url, { ...options, method: 'DELETE' });
  if (!res.ok) {
    let errJson: any = {};
    try {
      errJson = await res.json();
    } catch (_) {}
    throw new Error(errJson.error || `Gagal menghapus data (status ${res.status})`);
  }
  return res.json();
}
