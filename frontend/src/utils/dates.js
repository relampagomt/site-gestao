// Lida com Date, string ISO, timestamp numérico e Firestore Timestamp
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate(); // Firestore
  if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000); // {seconds}
  if (typeof value === "number") return new Date(value); // ms
  const d = new Date(value); // string/ISO
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateBR(value, opts = {}) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", ...opts });
}
