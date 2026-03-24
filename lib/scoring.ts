export type AttentionLevel =
  | "dentro_do_esperado"
  | "a_acompanhar"
  | "merece_atencao"
  | "fora_do_range";

export type Trend = "a_subir" | "a_descer" | "estavel" | "sem_dados";

export function getPosition(
  value: number,
  refMin: number | null,
  refMax: number | null
): number {
  if (refMax === null || refMax === refMin) return 0.5;
  const min = refMin ?? 0;
  return (value - min) / (refMax - min);
}

export function getTrend(
  readings: { value: number; date: string }[]
): Trend {
  if (readings.length < 2) return "sem_dados";
  const sorted = [...readings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const change = ((last - first) / first) * 100;
  if (change > 10) return "a_subir";
  if (change < -10) return "a_descer";
  return "estavel";
}

export function getAttentionLevel(
  position: number,
  trend: Trend,
  hasFamilyHistory: boolean
): AttentionLevel {
  if (position > 1.0 || position < 0.0) return "fora_do_range";
  if (position > 0.66 && trend === "a_subir") return "merece_atencao";
  if (position > 0.66 && hasFamilyHistory) return "merece_atencao";
  if (trend === "a_subir") return "a_acompanhar";
  if (position > 0.66) return "a_acompanhar";
  return "dentro_do_esperado";
}
