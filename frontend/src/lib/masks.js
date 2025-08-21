// frontend/src/lib/masks.js
// Máscaras de entrada para moeda e data (pt-BR)

export function maskMoneyBR(value = '') {
  if (value == null) value = '';
  // Mantém apenas dígitos
  let v = String(value).replace(/\D/g, '');
  if (v.length === 0) return '0,00';
  // Garante pelo menos 3 dígitos para separar centavos
  if (v.length === 1) v = '0' + v;
  v = v.padStart(3, '0');

  const cents = v.slice(-2);
  let int = v.slice(0, -2);
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${int},${cents}`;
}

export function maskDateBR(value = '') {
  if (value == null) value = '';
  // Mantém apenas dígitos e limita a 8
  let v = String(value).replace(/\D/g, '').slice(0, 8);
  if (v.length >= 5) {
    return v.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
  }
  if (v.length >= 3) {
    return v.replace(/(\d{2})(\d{1,2})/, '$1/$2');
  }
  return v;
}

// "dd/mm/aaaa" -> "aaaa-mm-dd"
export function maskToISO(br) {
  if (!br) return '';
  const m = String(br).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// "aaaa-mm-dd" -> "dd/mm/aaaa"
export function isoToMask(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
