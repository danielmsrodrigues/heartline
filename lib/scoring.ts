export type AttentionLevel =
  | "dentro_do_esperado"
  | "a_acompanhar"
  | "merece_atencao"
  | "fora_do_range";

export type Trend = "a_subir" | "a_descer" | "estavel" | "sem_dados";

export type RangeType = "bounded" | "max_only" | "min_only" | "none";

export function classifyRange(
  refMin: number | null,
  refMax: number | null
): RangeType {
  const hasMin = refMin != null && refMin > 0;
  const hasMax = refMax != null;

  if (hasMin && hasMax) return "bounded";
  if (!hasMin && hasMax) return "max_only";
  if (hasMin && !hasMax) return "min_only";
  return "none";
}

export function getSeverity(
  value: number,
  refMin: number | null,
  refMax: number | null,
  rangeType: RangeType
): number {
  switch (rangeType) {
    case "bounded": {
      const min = refMin!;
      const max = refMax!;
      const width = max - min || 1;
      if (value > max) return Math.min((value - max) / width, 1);
      if (value < min) return Math.min((min - value) / width, 1);
      return 0;
    }
    case "max_only": {
      const max = refMax!;
      if (value <= max) return 0;
      return Math.min((value - max) / (max || 1), 1);
    }
    case "min_only": {
      const min = refMin!;
      if (value >= min) return 0;
      return Math.min((min - value) / (min || 1), 1);
    }
    case "none":
      return 0;
  }
}

export function getProximity(
  value: number,
  refMin: number | null,
  refMax: number | null,
  rangeType: RangeType
): number {
  switch (rangeType) {
    case "bounded": {
      const min = refMin!;
      const max = refMax!;
      const width = max - min || 1;
      if (value < min || value > max) return 1;
      const mid = (min + max) / 2;
      const distFromMid = Math.abs(value - mid);
      return distFromMid / (width / 2);
    }
    case "max_only": {
      const max = refMax!;
      if (value > max) return 1;
      const ratio = value / (max || 1);
      if (ratio < 0.67) return 0;
      return (ratio - 0.67) / (1 - 0.67);
    }
    case "min_only": {
      const min = refMin!;
      if (value < min) return 1;
      const ratio = min / (value || 1);
      if (ratio < 0.67) return 0;
      return (ratio - 0.67) / (1 - 0.67);
    }
    case "none":
      return 0;
  }
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
  severity: number,
  proximity: number,
  trend: Trend,
  hasFamilyHistory: boolean
): AttentionLevel {
  const rising = trend === "a_subir";

  // Out of range
  if (severity > 0.20) return "fora_do_range";
  if (severity > 0.10) return "merece_atencao";
  if (severity > 0 && (hasFamilyHistory || rising)) return "merece_atencao";
  if (severity > 0) return "a_acompanhar";

  // Within range
  if (proximity > 0.66 && rising && hasFamilyHistory) return "merece_atencao";
  if (proximity > 0.66 && rising) return "merece_atencao";
  if (proximity > 0.66 && hasFamilyHistory) return "merece_atencao";
  if (rising && hasFamilyHistory) return "a_acompanhar";
  if (proximity > 0.66) return "a_acompanhar";
  if (rising) return "a_acompanhar";
  return "dentro_do_esperado";
}
