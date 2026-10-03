/**
 * Pencocokan "Nama Alat" (bebas, dari rekap) -> Kode Alat Kesehatan ASPAK.
 * Hasilnya hanya SARAN; pengguna tetap mengecek & bisa mengganti.
 */

export const alatKey = (nama: string) => String(nama ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Samakan ejaan Inggris/Indonesia & variasi umum supaya bisa dicocokkan
const TOKEN_ALIASES: Record<string, string> = {
  thermometer: 'termometer', thermometers: 'termometer',
  phototerapy: 'fototerapi', phototherapy: 'fototerapi', fototherapy: 'fototerapi', fototerapi: 'fototerapi',
  otoscope: 'otoskop', otoskop: 'otoskop',
  autoclave: 'autoklaf', autoklaf: 'autoklaf', autoclaf: 'autoklaf',
  sterilizer: 'sterilisator', steriliser: 'sterilisator', sterilisator: 'sterilisator',
  sphygmomanometer: 'tensimeter', tensimeter: 'tensimeter', nibp: 'tensimeter',
  scale: 'timbangan', timbangan: 'timbangan',
  infant: 'bayi', baby: 'bayi', bayi: 'bayi', neonatal: 'bayi',
  adult: 'dewasa', dewasa: 'dewasa',
  electrostimulator: 'stimulator', elektrostimulator: 'stimulator',
  suction: 'suction', aspirator: 'suction', penghisap: 'suction',
  doppler: 'doppler', nebuliser: 'nebulizer',
  ecg: 'ekg', electrocardiograph: 'ekg', elektrokardiograf: 'ekg',
  defibrilator: 'defibrillator',
  pump: 'pump', pompa: 'pump',
  centrifuge: 'sentrifus', sentrifuge: 'sentrifus', centrifus: 'sentrifus',
  oxymeter: 'oximeter', oksimeter: 'oximeter',
};

// Kata umum yang tidak cukup untuk mengenali alat
const STOP = new Set(['dan', 'and', 'the', 'of', 'for', 'unit', 'alat', 'set', 'with', 'untuk', 'mobile', 'portable', 'non', 'invasive', 'blood', 'pressure', 'digital', 'manual', 'elektrik', 'electric', 'electronic', 'system', 'sistem', 'device', 'accessories', 'aksesori']);

function tokens(s: string): string[] {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, m => ' ' + m.slice(1, -1) + ' ') // isi kurung tetap dipakai
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(t => TOKEN_ALIASES[t] || t);
}

export interface AlatCandidate { kode: string; nama: string; sinonim: string; score: number }

type MasterRow = [string, string, string];

/** Index sederhana: token -> daftar baris master yang memuat token itu */
export function buildAlatIndex(master: MasterRow[]) {
  const rows = master.map(([kode, nama, sinonim]) => {
    const names = [nama, ...sinonim.split(/[;/]/)].map(s => s.trim()).filter(Boolean);
    const exact = new Set(names.map(n => tokens(n).join(' ')));
    const tok = new Set(tokens(`${nama} ${sinonim}`));
    return { kode, nama, sinonim, exact, tok, isVarian: !/^\d{8}$/.test(kode) };
  });
  const byToken = new Map<string, number[]>();
  rows.forEach((r, i) => r.tok.forEach(t => byToken.set(t, [...(byToken.get(t) || []), i])));
  return { rows, byToken };
}
export type AlatIndex = ReturnType<typeof buildAlatIndex>;

/** Cari kandidat kode untuk satu nama alat (maks. `limit`), urut dari yang paling cocok */
export function matchAlat(index: AlatIndex, namaAlat: string, limit = 5): AlatCandidate[] {
  const q = tokens(namaAlat);
  const qKey = q.join(' ');
  const qSig = [...new Set(q.filter(t => !STOP.has(t) && t.length > 1))];
  if (!qSig.length) return [];

  const scores = new Map<number, number>();
  qSig.forEach(t => (index.byToken.get(t) || []).forEach(i => scores.set(i, (scores.get(i) || 0) + 1)));

  const out: (AlatCandidate & { len: number; varian: boolean })[] = [];
  scores.forEach((hit, i) => {
    const r = index.rows[i];
    const sigInRow = [...r.tok].filter(t => !STOP.has(t)).length || 1;
    // cocok semua kata penting di nama alat = nilai tinggi; kata master yang "tidak diminta" mengurangi sedikit
    let score = hit / qSig.length - 0.15 * Math.max(0, sigInRow - hit) / sigInRow;
    if (r.exact.has(qKey)) score += 1;
    if (score >= 0.5) out.push({ kode: r.kode, nama: r.nama, sinonim: r.sinonim, score, len: r.nama.length, varian: r.isVarian });
  });
  return out
    .sort((a, b) => b.score - a.score || Number(a.varian) - Number(b.varian) || a.len - b.len)
    .slice(0, limit)
    .map(({ kode, nama, sinonim, score }) => ({ kode, nama, sinonim, score }));
}
