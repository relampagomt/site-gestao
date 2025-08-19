// frontend/src/utils/dates.js
// Exports: toDate, formatDateBR, formatTimeBR, ymdToBR, brToYMD, normalizeHM, composeLocalISO
const TZ = "America/Sao_Paulo";

// Aceita Date, string ISO, timestamp numérico, Firestore Timestamp
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate(); // Firestore
  if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000); // {seconds}
  if (typeof value === "number") return new Date(value); // epoch ms
  const d = new Date(value); // string/ISO
  return Number.isNaN(d.getTime()) ? null : d;
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' (sem criar Date/UTC)
export const ymdToBR = (ymd) => {
  if (!ymd) return "";
  const s = String(ymd).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

// 'DD/MM/YYYY' -> 'YYYY-MM-DD' (sem criar Date/UTC)
export const brToYMD = (br) => {
  if (!br) return "";
  const s = String(br).slice(0, 10);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return "";
  const [d, m, y] = s.split("/");
  return `${y}-${m}-${d}`;
};

// Formata para BR aceitando Date/ISO/Timestamp/Firestore/YY-MM-DD/DD/MM/YYYY
export function formatDateBR(value, opts = {}) {
  // se já vier 'DD/MM/YYYY', só retorna
  const s = typeof value === "string" ? value : "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return ymdToBR(s);
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: TZ, ...opts });
}

// Sempre 24h 'HH:MM' (converte de Date/ISO/HHMM/HH:MM/HH:MM AM/PM)
export function formatTimeBR(value) {
  if (typeof value === "string") {
    const n = normalizeHM(value);
    if (n) return n;
  }
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

// Normaliza hora para 'HH:MM' aceitando 'HH:MM', 'H:MM', 'HHMM', 'HH:MM AM/PM'
export const normalizeHM = (hm) => {
  if (!hm) return "";
  let s = String(hm).trim();

  // HH:MM AM/PM
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }

  // HHMM
  m = s.match(/^(\d{1,2})(\d{2})$/);
  if (m) {
    const h = String(parseInt(m[1], 10)).padStart(2, "0");
    const min = m[2];
    return `${h}:${min}`;
  }

  // H:MM / HH:MM
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = String(parseInt(m[1], 10)).padStart(2, "0");
    return `${h}:${m[2]}`;
  }

  return "";
};

// Junta 'DD/MM/YYYY' + 'HH:MM' em 'YYYY-MM-DDTHH:MM:00' (sem 'Z')
// -> evita shift de dia por UTC, preserva o horário local
export const composeLocalISO = (dateBr, hhmm) => {
  const ymd = brToYMD(dateBr);
  const hm = normalizeHM(hhmm) || "00:00";
  return ymd ? `${ymd}T${hm}:00` : null;
};

// Default export (evita qualquer diferença ESM/CJS em build)
export default {
  toDate,
  formatDateBR,
  formatTimeBR,
  ymdToBR,
  brToYMD,
  normalizeHM,
  composeLocalISO,
};
