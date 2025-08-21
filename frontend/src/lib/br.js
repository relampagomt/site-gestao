// frontend/src/lib/br.js
// Helpers BR <-> ISO e números PT-BR

export const BRL = (n = 0) =>
  `R$ ${Number(n || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/**
 * Converte "DD/MM/AAAA" -> "AAAA-MM-DD"
 */
export const brToISO = (br) => {
  if (!br) return '';
  const m = String(br).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
};

/**
 * Converte "AAAA-MM-DD" -> "DD/MM/AAAA"
 */
export const isoToBR = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Converte string pt-BR "1.234,56" em Number 1234.56
 */
export const toNumberBR = (v = 0) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
