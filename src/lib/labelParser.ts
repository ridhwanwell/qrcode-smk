/**
 * Utility for robust parsing and normalization of calibration labels
 * from diverse URL structures, query parameters, hash fragments, and encoded formats.
 */

// Priority query parameter keys that specifically carry a calibration label identifier
const PRIMARY_LABEL_KEYS = [
  'nolabel',
  'label',
  'id',
  'q',
  'code',
  'cert',
  'no',
  'nomor',
  'nomorlabel',
  'nomor_label',
  'serial',
  'sn',
  'barcode',
  'sertifikat',
  'certificate',
  'certno',
  'cert_no'
];

// Parameters that are definitely NOT labels and should always be ignored
const IGNORED_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'source',
  'src',
  'ref',
  'return_url',
  '__auto_close',
  'auth',
  'token',
  'v',
  't',
  'c',
  's',
  'p',
  'lang'
]);

const RESERVED_PATHS = new Set([
  'admin',
  'login',
  'dashboard',
  'labels',
  'generate',
  'templates',
  'sertifikat',
  'scan',
  'verifikasi',
  'cert',
  'label',
  'preview',
  'favicon.ico',
  'robots.txt'
]);

/**
 * Safely decode URI components recursively to handle double/triple URL encoding
 * (e.g., %2530%2530%2532 -> %30%30%32 -> 002)
 */
export function safeMultiDecode(input: string): string {
  if (!input) return '';
  let current = input;
  let previous = '';
  let iterations = 0;

  while (current !== previous && iterations < 5) {
    previous = current;
    iterations++;
    try {
      // Replace plus with space if part of query string decoding
      const candidate = decodeURIComponent(current.replace(/\+/g, ' '));
      current = candidate;
    } catch {
      // If malformed URI sequence (e.g. dangling % not followed by hex), break gracefully
      break;
    }
  }

  return current;
}

/**
 * Check and decode Base64 strings or Base64-encoded JSON payloads
 * Example: eyJub0xhYmVsIjoiMDAyLjAwMjAifQ== -> {"noLabel":"002.0020"}
 */
function tryDecodeBase64Payload(str: string): string | null {
  const trimmed = str.trim();
  if (/^[A-Za-z0-9+/=]{6,}$/.test(trimmed) && (trimmed.includes('=') || trimmed.length % 4 === 0)) {
    try {
      const decoded = atob(trimmed);
      if (decoded && /^[\x20-\x7E\r\n\t]+$/.test(decoded)) {
        if (decoded.startsWith('{') && decoded.endsWith('}')) {
          try {
            const parsed = JSON.parse(decoded);
            if (typeof parsed === 'object' && parsed !== null) {
              for (const k of Object.keys(parsed)) {
                if (PRIMARY_LABEL_KEYS.includes(k.toLowerCase())) {
                  const val = parsed[k];
                  if (typeof val === 'string' || typeof val === 'number') {
                    return String(val);
                  }
                }
              }
            }
          } catch {}
        }
        return decoded;
      }
    } catch {}
  }
  return null;
}

/**
 * Format string into standard XXX.XXXX calibration label pattern
 */
export function normalizeLabelFormat(s: string): string | null {
  if (!s) return null;
  const cleaned = s.trim();

  // If input contains no numbers at all, it can never be a calibration label
  if (!/\d/.test(cleaned)) {
    return null;
  }

  // 1. Standard pattern: 3 digits, dot, 4 digits (e.g. 002.0020, 100.0001)
  const stdMatch = cleaned.match(/\b(\d{3})\.(\d{4})\b/);
  if (stdMatch) {
    return `${stdMatch[1]}.${stdMatch[2]}`;
  }

  // 2. Dash, slash, colon, underscore, or space: 002-0020, 002/0020, 002_0020, 002 0020
  const sepMatch = cleaned.match(/\b(\d{3})[.\-_/: ]+(\d{4})\b/);
  if (sepMatch) {
    return `${sepMatch[1]}.${sepMatch[2]}`;
  }

  // 3. Continuous 7 digits: 0020020 -> 002.0020
  const digitsMatch = cleaned.match(/\b(\d{3})(\d{4})\b/);
  if (digitsMatch) {
    return `${digitsMatch[1]}.${digitsMatch[2]}`;
  }

  // 4. Short form padding: e.g. 2.20 -> 002.0020, 02.0020 -> 002.0020, 002.20 -> 002.0020
  const shortMatch = cleaned.match(/\b(\d{1,3})\.(\d{1,4})\b/);
  if (shortMatch) {
    const prefix = shortMatch[1].padStart(3, '0');
    const suffix = shortMatch[2].padStart(4, '0');
    return `${prefix}.${suffix}`;
  }

  return null;
}

/**
 * Parse query string (or URLSearchParams-compatible string) into label candidate
 */
export function extractLabelFromQueryString(queryString: string): string {
  if (!queryString) return '';

  let search = queryString.trim();
  if (search.startsWith('?')) search = search.slice(1);
  if (!search) return '';

  // Decode search string in case the entire query was URL encoded
  search = safeMultiDecode(search);

  // Split into pairs
  const pairs = search.split('&');
  const paramMap = new Map<string, string>();

  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    let key = '';
    let val = '';
    if (eqIdx !== -1) {
      key = pair.slice(0, eqIdx).trim();
      val = pair.slice(eqIdx + 1).trim();
    } else {
      key = pair.trim();
      val = '';
    }

    const decodedKey = safeMultiDecode(key).trim().toLowerCase();
    const decodedVal = safeMultiDecode(val).trim();

    // Skip tracking / non-label parameters
    if (IGNORED_PARAMS.has(decodedKey)) {
      continue;
    }

    if (decodedKey) {
      paramMap.set(decodedKey, decodedVal || decodedKey);
    }
  }

  // Step 1: Check known priority keys first
  for (const key of PRIMARY_LABEL_KEYS) {
    if (paramMap.has(key)) {
      const rawVal = paramMap.get(key)!;
      const parsed = cleanLabelString(rawVal);
      if (parsed && /\d{2,}/.test(parsed)) return parsed;
    }
  }

  // Step 2: If none of the known keys match, scan parameter values strictly for label format
  for (const [key, val] of paramMap.entries()) {
    // Check if key itself looks like a label (e.g. /?002.0020)
    const keyMatch = normalizeLabelFormat(key);
    if (keyMatch) return keyMatch;

    // Check value only if it contains numbers
    if (val && /\d/.test(val)) {
      const valMatch = normalizeLabelFormat(val);
      if (valMatch) return valMatch;

      const cleanedVal = cleanLabelString(val);
      if (cleanedVal && /\d{2,}/.test(cleanedVal)) return cleanedVal;
    }
  }

  return '';
}

/**
 * Clean and extract a calibration label from any arbitrary raw string,
 * URL, path segment, query parameter, or encoded format.
 */
export function cleanLabelString(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw).trim();
  if (!s) return '';

  // 1. Decode multi-level URI encoding
  s = safeMultiDecode(s);

  // 2. Strip leading/trailing quotation marks, brackets, braces, backticks
  s = s.replace(/^['"`<([{\s]+|['"`>)}\]\s]+$/g, '');

  // 3. Check for Base64 or JSON encoded content
  const b64Decoded = tryDecodeBase64Payload(s);
  if (b64Decoded && b64Decoded !== s) {
    const fromB64 = cleanLabelString(b64Decoded);
    if (fromB64) return fromB64;
  }

  // 4. Handle full URL or protocol-relative URL
  if (s.includes('http://') || s.includes('https://') || s.startsWith('//') || s.includes('://')) {
    try {
      const fixedUrlStr = s.startsWith('//') ? `https:${s}` : s;
      const url = new URL(fixedUrlStr);

      // Check pathname FIRST — if the URL is /sertifikat/002.0020, the path has the true label!
      if (url.pathname && url.pathname !== '/') {
        const fromPath = cleanLabelString(url.pathname);
        if (fromPath) return fromPath;
      }

      // Check query string ONLY if pathname didn't yield a label
      if (url.search) {
        const fromSearch = extractLabelFromQueryString(url.search);
        if (fromSearch) return fromSearch;
      }

      // Check hash
      if (url.hash) {
        const hashStr = url.hash.replace(/^#\/?/, '');
        const fromHash = cleanLabelString(hashStr);
        if (fromHash) return fromHash;

        const fromHashQuery = extractLabelFromQueryString(hashStr);
        if (fromHashQuery) return fromHashQuery;
      }

      s = url.pathname;
    } catch {
      // Fallback: continue processing as string
    }
  }

  // 5. Check path prefixes: e.g. /sertifikat/002.0020, scan/002.0020, etc.
  const prefixRegex = /(?:sertifikat|scan|labels?|verifikasi|cert|nomor)\/([^\/?#]+)/i;
  const prefixMatch = s.match(prefixRegex);
  if (prefixMatch && prefixMatch[1]) {
    s = prefixMatch[1];
  }

  // 6. If query string (?...) or hash (#...) still exists in the segment, strip them
  const questionIdx = s.indexOf('?');
  let queryPart = '';
  if (questionIdx !== -1) {
    queryPart = s.slice(questionIdx);
    s = s.slice(0, questionIdx);
  }

  const hashIdx = s.indexOf('#');
  if (hashIdx !== -1) {
    s = s.slice(0, hashIdx);
  }

  // 7. Strip file extensions (.pdf, .html, .png, etc.)
  s = s.replace(/\.(pdf|html|htm|png|jpg|jpeg)$/i, '');

  // 8. Key-value prefix patterns: e.g. "noLabel:002.0020", "label=002.0020", "SMK-002.0020"
  const kvMatch = s.match(/(?:noLabel|label|id|code|cert|nomor|smk)[=:\s_-]+([0-9a-zA-Z._-]+)/i);
  if (kvMatch && kvMatch[1]) {
    const parsedKv = normalizeLabelFormat(kvMatch[1]);
    if (parsedKv) return parsedKv;
  }

  // 9. Match standard or standardized numeric patterns
  const normalized = normalizeLabelFormat(s);
  if (normalized) {
    return normalized;
  }

  // 10. If pathname segment was empty or purely a reserved path, fall back to queryPart
  if (queryPart) {
    const fromQuery = extractLabelFromQueryString(queryPart);
    if (fromQuery) return fromQuery;
  }

  // Clean trailing punctuation or path slashes
  const finalClean = s.replace(/^[/#\s]+|[/#\s.,;:]+$/g, '').trim();

  // If finalClean matches standard format after stripping
  const finalNormalized = normalizeLabelFormat(finalClean);
  if (finalNormalized) {
    return finalNormalized;
  }

  // Check if string is a reserved system route name or contains no digits
  if (RESERVED_PATHS.has(finalClean.toLowerCase()) || !/\d/.test(finalClean)) {
    return '';
  }

  // If it has digits and looks like a custom label code, allow it
  if (/\d{2,}/.test(finalClean) && finalClean.length <= 20) {
    return finalClean;
  }

  return '';
}

/**
 * Detects label from standard browser/router location object
 */
export function extractLabelFromLocation(location: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  // 1. FIRST PRIORITY: Check pathname (e.g. /sertifikat/002.0020, /scan/002.0020, /002.0020)
  if (location.pathname && location.pathname !== '/') {
    const fromPath = cleanLabelString(location.pathname);
    if (fromPath) return fromPath;
  }

  // 2. SECOND PRIORITY: Check search parameters (?noLabel=002.0020, ?id=002.0020)
  if (location.search && location.search.length > 1) {
    const fromSearch = extractLabelFromQueryString(location.search);
    if (fromSearch) return fromSearch;
  }

  // 3. THIRD PRIORITY: Check hash fragment
  if (location.hash && location.hash.length > 1) {
    const hashClean = location.hash.replace(/^#\/?/, '');
    const fromHash = cleanLabelString(hashClean);
    if (fromHash) return fromHash;

    const fromHashQuery = extractLabelFromQueryString(hashClean);
    if (fromHashQuery) return fromHashQuery;
  }

  return '';
}

/**
 * Generate exhaustive database search candidates for a given label string.
 * This ensures that whether Firestore stores document IDs or field values as:
 * - "002.0020"
 * - "0020020"
 * - "002-0020"
 * - "002_0020"
 * - "SMK-002.0020"
 * the document can be found and resolved.
 */
export function generateLabelSearchCandidates(cleanNoLabel: string): string[] {
  if (!cleanNoLabel) return [];

  const candidates = new Set<string>();
  const raw = cleanNoLabel.trim();

  // Primary form
  candidates.add(raw);

  // Normalized standard form (XXX.XXXX)
  const norm = normalizeLabelFormat(raw);
  if (norm) {
    candidates.add(norm);

    const parts = norm.split('.');
    if (parts.length === 2) {
      const [prefix, suffix] = parts;
      candidates.add(`${prefix}${suffix}`);       // 0020020
      candidates.add(`${prefix}-${suffix}`);      // 002-0020
      candidates.add(`${prefix}_${suffix}`);      // 002_0020
      candidates.add(`${prefix}/${suffix}`);      // 002/0020
      candidates.add(`${prefix} ${suffix}`);      // 002 0020
      candidates.add(`SMK-${norm}`);              // SMK-002.0020
      candidates.add(`SMK.${norm}`);              // SMK.002.0020
      candidates.add(`SMK/${norm}`);              // SMK/002.0020
    }
  }

  // Numeric only
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 7) {
    const p1 = digitsOnly.slice(0, 3);
    const p2 = digitsOnly.slice(3);
    candidates.add(`${p1}.${p2}`);
    candidates.add(`${p1}-${p2}`);
    candidates.add(digitsOnly);
  }

  // Case variations
  const currentList = Array.from(candidates);
  for (const c of currentList) {
    candidates.add(c.toUpperCase());
    candidates.add(c.toLowerCase());
  }

  return Array.from(candidates);
}
