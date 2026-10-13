// Modelo de saúde partilhado entre a app (via lib/scoring.ts) e as Edge Functions.
// Tem de ser TypeScript puro e sem imports: é carregado tanto pelo Metro como pelo Deno.

export type AttentionLevel =
  | "dentro_do_esperado"
  | "a_acompanhar"
  | "merece_atencao"
  | "fora_do_range";

export type Trend = "a_subir" | "a_descer" | "estavel" | "sem_dados";

export type RangeType = "bounded" | "max_only" | "min_only" | "none";

// ---------------------------------------------------------------------------
// Catálogo canónico de biomarcadores
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  key: string;
  name: string;
  aliases: string[];
  /** Relevante para o contexto de histórico familiar cardiovascular. */
  cardiovascular?: boolean;
  /** Valores acima do máximo do laboratório não são motivo de alerta (ex.: HDL). */
  higherIsBetter?: boolean;
}

export const BIOMARKER_CATALOG: CatalogEntry[] = [
  { key: "total_cholesterol", name: "Colesterol Total", cardiovascular: true, aliases: ["colesterol total", "colesterol", "cholesterol", "total cholesterol", "cholesterol total"] },
  { key: "ldl", name: "Colesterol LDL", cardiovascular: true, aliases: ["colesterol ldl", "ldl colesterol", "ldl cholesterol", "cholesterol ldl", "c-ldl", "ldl-c", "ldl calculado", "colesterol ldl calculado", "ldl direto", "colesterol ldl direto"] },
  { key: "hdl", name: "Colesterol HDL", cardiovascular: true, higherIsBetter: true, aliases: ["colesterol hdl", "hdl colesterol", "hdl cholesterol", "cholesterol hdl", "c-hdl", "hdl-c"] },
  { key: "non_hdl", name: "Colesterol não-HDL", cardiovascular: true, aliases: ["colesterol nao hdl", "nao hdl", "non hdl", "non hdl cholesterol", "colesterol nao-hdl"] },
  { key: "triglycerides", name: "Triglicéridos", cardiovascular: true, aliases: ["trigliceridos", "triglicerideos", "triglicerides", "triglycerides", "tg"] },
  { key: "apob", name: "Apolipoproteína B", cardiovascular: true, aliases: ["apolipoproteina b", "apo b", "apob", "apolipoprotein b"] },
  { key: "apoa1", name: "Apolipoproteína A1", cardiovascular: true, higherIsBetter: true, aliases: ["apolipoproteina a1", "apo a1", "apoa1", "apolipoproteina a-1", "apolipoprotein a1"] },
  { key: "lpa", name: "Lipoproteína (a)", cardiovascular: true, aliases: ["lipoproteina a", "lipoproteina (a)", "lp(a)", "lpa", "lp a", "lipoprotein a"] },
  { key: "glucose", name: "Glicose", cardiovascular: true, aliases: ["glicose", "glucose", "glicemia", "glicose em jejum", "glicemia em jejum", "fasting glucose"] },
  { key: "hba1c", name: "HbA1c", cardiovascular: true, aliases: ["hba1c", "hemoglobina glicada", "hemoglobina a1c", "hemoglobina glicosilada", "a1c", "glycated hemoglobin"] },
  { key: "crp", name: "Proteína C Reativa", cardiovascular: true, aliases: ["pcr", "crp", "proteina c reativa", "proteina c reactiva", "proteina c-reativa", "proteina c-reactiva", "pcr ultrassensivel", "pcr us", "hs-crp", "hscrp", "c reactive protein"] },
  { key: "insulin", name: "Insulina", aliases: ["insulina", "insulin", "insulina em jejum"] },
  { key: "hemoglobin", name: "Hemoglobina", aliases: ["hemoglobina", "hemoglobin", "hb", "hgb"] },
  { key: "hematocrit", name: "Hematócrito", aliases: ["hematocrito", "hematocrit", "hct", "htc"] },
  { key: "red_blood_cells", name: "Eritrócitos", aliases: ["eritrocitos", "globulos vermelhos", "hemacias", "red blood cells", "rbc"] },
  { key: "white_blood_cells", name: "Leucócitos", aliases: ["leucocitos", "globulos brancos", "white blood cells", "wbc"] },
  { key: "platelets", name: "Plaquetas", aliases: ["plaquetas", "platelets", "plt"] },
  { key: "mcv", name: "VGM", aliases: ["vgm", "mcv", "volume globular medio", "vcm", "volume corpuscular medio"] },
  { key: "mch", name: "HGM", aliases: ["hgm", "mch", "hemoglobina globular media", "hcm", "hemoglobina corpuscular media"] },
  { key: "mchc", name: "CHGM", aliases: ["chgm", "mchc", "concentracao de hemoglobina globular media", "chcm"] },
  { key: "creatinine", name: "Creatinina", aliases: ["creatinina", "creatinine"] },
  { key: "egfr", name: "TFG estimada", higherIsBetter: true, aliases: ["tfg", "tfg estimada", "tfge", "egfr", "taxa de filtracao glomerular", "taxa de filtracao glomerular estimada", "gfr"] },
  { key: "urea", name: "Ureia", aliases: ["ureia", "urea"] },
  { key: "uric_acid", name: "Ácido Úrico", aliases: ["acido urico", "uric acid", "urato"] },
  { key: "alt", name: "ALT", aliases: ["alt", "tgp", "alat", "alanina aminotransferase", "gpt"] },
  { key: "ast", name: "AST", aliases: ["ast", "tgo", "asat", "aspartato aminotransferase", "got"] },
  { key: "ggt", name: "GGT", aliases: ["ggt", "gama gt", "gama-gt", "gama glutamil transferase", "gama-glutamil transferase", "gamma gt"] },
  { key: "alkaline_phosphatase", name: "Fosfatase Alcalina", aliases: ["fosfatase alcalina", "alkaline phosphatase", "alp", "fa"] },
  { key: "bilirubin", name: "Bilirrubina", aliases: ["bilirrubina", "bilirrubina total", "bilirubin", "total bilirubin"] },
  { key: "ldh", name: "LDH", aliases: ["ldh", "lactato desidrogenase", "desidrogenase lactica"] },
  { key: "albumin", name: "Albumina", aliases: ["albumina", "albumin"] },
  { key: "total_protein", name: "Proteínas Totais", aliases: ["proteinas totais", "total protein", "proteina total"] },
  { key: "tsh", name: "TSH", aliases: ["tsh", "tirotropina", "hormona estimulante da tiroide"] },
  { key: "t3", name: "T3", aliases: ["t3", "t3 total", "triiodotironina", "triiodotironina total"] },
  { key: "ft3", name: "T3 Livre", aliases: ["t3 livre", "ft3", "t3l", "triiodotironina livre", "free t3"] },
  { key: "t4", name: "T4", aliases: ["t4", "t4 total", "tiroxina", "tiroxina total"] },
  { key: "ft4", name: "T4 Livre", aliases: ["t4 livre", "ft4", "t4l", "tiroxina livre", "free t4"] },
  { key: "iron", name: "Ferro sérico", aliases: ["ferro", "ferro serico", "iron", "siderémia", "sideremia"] },
  { key: "ferritin", name: "Ferritina", aliases: ["ferritina", "ferritin"] },
  { key: "vitamin_d", name: "Vitamina D", aliases: ["vitamina d", "vitamin d", "25-oh vitamina d", "25 oh vitamina d", "25-hidroxivitamina d", "vitamina d 25-oh", "vitamina d total"] },
  { key: "vitamin_b12", name: "Vitamina B12", aliases: ["vitamina b12", "vitamin b12", "cobalamina", "b12"] },
  { key: "folic_acid", name: "Ácido Fólico", aliases: ["acido folico", "folic acid", "folato", "folatos"] },
  { key: "sodium", name: "Sódio", aliases: ["sodio", "sodium", "na"] },
  { key: "potassium", name: "Potássio", aliases: ["potassio", "potassium", "k"] },
  { key: "calcium", name: "Cálcio", aliases: ["calcio", "calcium", "calcio total", "ca"] },
  { key: "magnesium", name: "Magnésio", aliases: ["magnesio", "magnesium", "mg"] },
  { key: "phosphorus", name: "Fósforo", aliases: ["fosforo", "phosphorus", "fosfato"] },
  { key: "psa", name: "PSA", aliases: ["psa", "psa total", "antigenio especifico da prostata"] },
  { key: "fibrinogen", name: "Fibrinogénio", aliases: ["fibrinogenio", "fibrinogen"] },
];

/** minúsculas, sem acentos, separadores → "_". */
export function normalizeKey(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const CATALOG_BY_KEY: Record<string, CatalogEntry> = {};
const ALIAS_TO_KEY: Record<string, string> = {};
for (const entry of BIOMARKER_CATALOG) {
  CATALOG_BY_KEY[entry.key] = entry;
  ALIAS_TO_KEY[entry.key] = entry.key;
  ALIAS_TO_KEY[normalizeKey(entry.name)] = entry.key;
  for (const alias of entry.aliases) ALIAS_TO_KEY[normalizeKey(alias)] = entry.key;
}

export function getCatalogEntry(key: string): CatalogEntry | null {
  return CATALOG_BY_KEY[key] ?? null;
}

/**
 * Chave estável para agrupar leituras do mesmo biomarcador ao longo do tempo.
 * Só há correspondência exata (depois de normalizar): "hemoglobina glicada"
 * nunca cai em "hemoglobina".
 */
export function canonicalBiomarkerKey(
  nameNormalized: string | null | undefined,
  name?: string | null
): string {
  const fromNormalized = normalizeKey(nameNormalized);
  const fromName = normalizeKey(name);
  return (
    ALIAS_TO_KEY[fromNormalized] ??
    ALIAS_TO_KEY[fromName] ??
    (fromNormalized || fromName)
  );
}

const CARDIOVASCULAR_HINTS = ["colesterol", "cholesterol", "lipoprote", "apolipo"];

export function isCardiovascularKey(key: string): boolean {
  const entry = CATALOG_BY_KEY[key];
  if (entry) return entry.cardiovascular === true;
  return CARDIOVASCULAR_HINTS.some((hint) => key.includes(hint));
}

export function normalizeUnit(unit: string | null | undefined): string {
  return (unit ?? "")
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/\s+/g, "");
}

// ---------------------------------------------------------------------------
// Scoring determinístico
// ---------------------------------------------------------------------------

/** Para marcadores em que "mais alto é melhor", o máximo do laboratório não conta. */
export function effectiveRange(
  key: string,
  refMin: number | null,
  refMax: number | null
): { refMin: number | null; refMax: number | null } {
  if (CATALOG_BY_KEY[key]?.higherIsBetter) {
    return { refMin, refMax: null };
  }
  return { refMin, refMax };
}

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
  if (first === 0) {
    if (last > 0) return "a_subir";
    if (last < 0) return "a_descer";
    return "estavel";
  }
  const change = ((last - first) / Math.abs(first)) * 100;
  if (change > 10) return "a_subir";
  if (change < -10) return "a_descer";
  return "estavel";
}

/**
 * A tendência só pesa quando afasta o valor da zona confortável:
 * a subir em direção ao máximo, ou a descer em direção ao mínimo.
 */
export function isAdverseTrend(
  trend: Trend,
  value: number,
  refMin: number | null,
  refMax: number | null,
  rangeType: RangeType
): boolean {
  switch (rangeType) {
    case "max_only":
      return trend === "a_subir";
    case "min_only":
      return trend === "a_descer";
    case "bounded": {
      const mid = (refMin! + refMax!) / 2;
      return value >= mid ? trend === "a_subir" : trend === "a_descer";
    }
    case "none":
      return false;
  }
}

export function getAttentionLevel(
  severity: number,
  proximity: number,
  adverseTrend: boolean,
  hasFamilyHistory: boolean
): AttentionLevel {
  // Out of range
  if (severity > 0.20) return "fora_do_range";
  if (severity > 0.10) return "merece_atencao";
  if (severity > 0 && (hasFamilyHistory || adverseTrend)) return "merece_atencao";
  if (severity > 0) return "a_acompanhar";

  // Within range
  if (proximity > 0.66 && adverseTrend) return "merece_atencao";
  if (proximity > 0.66 && hasFamilyHistory) return "merece_atencao";
  if (proximity > 0.66) return "a_acompanhar";
  if (adverseTrend) return "a_acompanhar";
  return "dentro_do_esperado";
}

// ---------------------------------------------------------------------------
// Agregação: linhas da BD → biomarcadores com scoring
// ---------------------------------------------------------------------------

export interface BiomarkerRow {
  id: string;
  exam_id?: string | null;
  name: string;
  name_normalized: string | null;
  value: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  exam_date: string;
}

export interface BiomarkerWithScoring {
  name: string;
  name_normalized: string;
  latestValue: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  rangeType: RangeType;
  severity: number;
  proximity: number;
  trend: Trend;
  adverseTrend: boolean;
  attentionLevel: AttentionLevel;
  familyRelevant: boolean;
  /** Leituras na mesma unidade da mais recente, da mais antiga para a mais recente. */
  readings: { id: string; value: number; date: string }[];
  /** Leituras antigas noutra unidade, que não entram na evolução. */
  excludedReadings: number;
}

const ATTENTION_ORDER: Record<AttentionLevel, number> = {
  fora_do_range: 0,
  merece_atencao: 1,
  a_acompanhar: 2,
  dentro_do_esperado: 3,
};

export function scoreBiomarkers(
  rows: BiomarkerRow[],
  hasFamilyHistory: boolean
): BiomarkerWithScoring[] {
  const grouped: Record<string, BiomarkerRow[]> = {};
  for (const row of rows) {
    if (!row.exam_date || !Number.isFinite(Number(row.value))) continue;
    const key = canonicalBiomarkerKey(row.name_normalized, row.name);
    if (!key) continue;
    (grouped[key] ??= []).push({ ...row, value: Number(row.value) });
  }

  const scored = Object.entries(grouped).map(([key, entries]) => {
    // Mesma data (ex.: duas linhas do mesmo marcador num exame): desempata pelo id,
    // para a app e as Edge Functions escolherem sempre a mesma leitura.
    const sorted = [...entries].sort(
      (a, b) =>
        new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
    const latest = sorted[0];
    const latestUnit = normalizeUnit(latest.unit);
    const comparable = sorted.filter((e) => normalizeUnit(e.unit) === latestUnit);
    const readings = comparable
      .map((e) => ({ id: e.id, value: e.value, date: e.exam_date }))
      .reverse();

    const range = effectiveRange(key, latest.ref_min, latest.ref_max);
    const rangeType = classifyRange(range.refMin, range.refMax);
    const severity = getSeverity(latest.value, range.refMin, range.refMax, rangeType);
    const proximity = getProximity(latest.value, range.refMin, range.refMax, rangeType);
    const trend = getTrend(readings);
    const adverseTrend = isAdverseTrend(trend, latest.value, range.refMin, range.refMax, rangeType);
    const familyRelevant = hasFamilyHistory && isCardiovascularKey(key);
    const attentionLevel = getAttentionLevel(severity, proximity, adverseTrend, familyRelevant);

    return {
      name: latest.name,
      name_normalized: key,
      latestValue: latest.value,
      unit: latest.unit,
      ref_min: range.refMin,
      ref_max: range.refMax,
      rangeType,
      severity,
      proximity,
      trend,
      adverseTrend,
      attentionLevel,
      familyRelevant,
      readings,
      excludedReadings: sorted.length - comparable.length,
    };
  });

  scored.sort(
    (a, b) => ATTENTION_ORDER[a.attentionLevel] - ATTENTION_ORDER[b.attentionLevel]
  );
  return scored;
}
