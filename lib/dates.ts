// As colunas `date` do Postgres não têm fuso. new Date("2026-03-01") lê em UTC
// e toISOString() escreve em UTC, o que pode mudar o dia consoante o fuso local.
//
// Além disso, o Hermes calcula a hora local com as regras de fuso atuais, e o
// seletor de datas nativo / Intl usam o histórico real (Portugal esteve em
// UTC+1 entre 1992 e 1996). Para datas antigas os dois discordam numa hora, e
// uma data escolhida à meia-noite passava para o dia anterior. Por isso:
// - escreve-se o dia tal como o Intl o mostra (o mesmo que o utilizador vê);
// - lê-se para o meio-dia local, longe de qualquer mudança de dia.

const isoDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" → Date ao meio-dia local desse dia. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date → "YYYY-MM-DD" do dia local, tal como é mostrado ao utilizador. */
export function toDateOnly(date: Date): string {
  const formatted = isoDay.format(date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDatePt(value: string | Date | null | undefined): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  return date ? date.toLocaleDateString("pt-PT") : "—";
}

/** "12 de outubro" (com o ano se não for o corrente), para frases. */
export function formatDayMonth(value: string | Date | null | undefined): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  if (!date) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("pt-PT", sameYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
}
