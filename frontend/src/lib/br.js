// Helpers BR <-> ISO e números PT-BR

export const BRL = (n) =>
  `R$ ${Number(n || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export const maskDateBR = (v = '') => {
  let s = String(v).replace(/\D/g, '').slice(0, 8);
  if (s.length >= 5) return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`;
  if (s.length >= 3) return `${s.slice(0, 2)}/${s.slice(2)}`;
  return s;
};

export const brToISO = (br) => {
  if (!br || !/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return null;
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
};

export const isoToBR = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const toNumberBR = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
