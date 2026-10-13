/**
 * Lê um número escrito pelo utilizador. O teclado decimal em pt-PT escreve
 * vírgula, e parseFloat("0,9") dá 0 — por isso nunca usar parseFloat em inputs.
 */
export function parseDecimal(text: string | number | null | undefined): number | null {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  if (text == null) return null;
  const cleaned = text.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Número para mostrar ao utilizador: vírgula decimal e sem zeros a mais. */
export function formatValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value * 100) / 100).replace(".", ",");
}
