// frontend/src/utils/financeMath.js
export function parseNum(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function kpisPagar(items) {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0, pago = 0, emAberto = 0, atrasados = 0;
  for (const it of items || []) {
    const amt = parseNum(it.amount);
    const pg  = parseNum(it.valorPago);
    total += amt;
    const pend = Math.max(amt - pg, 0);
    emAberto += pend;
    if ((it.date || '') < today && pend > 0) atrasados++;
    pago += Math.min(pg, amt);
  }
  return { total, pago, emAberto, atrasados };
}

export function kpisReceber(items) {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0, recebido = 0, emAberto = 0, atrasados = 0;
  for (const it of items || []) {
    const amt = parseNum(it.amount);
    const liq = parseNum(it.valorLiqRecebido);
    total += amt;
    const pend = Math.max(amt - liq, 0);
    emAberto += pend;
    if ((it.date || '') < today && pend > 0) atrasados++;
    recebido += Math.min(liq, amt);
  }
  return { total, recebido, emAberto, atrasados };
}
