import { canonicalBiomarkerKey, BiomarkerWithScoring } from '@/lib/scoring';
import { Tone, TONE_BY_LEVEL } from './theme';

// Nomes do dia a dia para os valores mais comuns. Quem abre a app não tem de
// saber o que é "LDL": o nome técnico fica para o detalhe e para a lista.
// `article` serve para concordar a frase ("O teu…", "As tuas…").
type Article = 'o' | 'a' | 'os' | 'as';

const PLAIN: Record<string, { name: string; article: Article }> = {
  ldl: { name: 'colesterol "mau"', article: 'o' },
  hdl: { name: 'colesterol "bom"', article: 'o' },
  total_cholesterol: { name: 'colesterol total', article: 'o' },
  non_hdl: { name: 'colesterol "mau" total', article: 'o' },
  triglycerides: { name: 'gorduras no sangue', article: 'as' },
  apob: { name: 'partículas de colesterol', article: 'as' },
  lpa: { name: 'colesterol herdado', article: 'o' },
  glucose: { name: 'açúcar no sangue', article: 'o' },
  hba1c: { name: 'açúcar médio no sangue', article: 'o' },
  insulin: { name: 'insulina', article: 'a' },
  crp: { name: 'marcador de inflamação', article: 'o' },
  hemoglobin: { name: 'hemoglobina', article: 'a' },
  creatinine: { name: 'marcador dos rins', article: 'o' },
  egfr: { name: 'filtragem dos rins', article: 'a' },
  uric_acid: { name: 'ácido úrico', article: 'o' },
  alt: { name: 'marcador do fígado', article: 'o' },
  ast: { name: 'marcador do fígado', article: 'o' },
  ggt: { name: 'marcador do fígado', article: 'o' },
  tsh: { name: 'hormona da tiroide', article: 'a' },
  ferritin: { name: 'reservas de ferro', article: 'as' },
  iron: { name: 'ferro', article: 'o' },
  vitamin_d: { name: 'vitamina D', article: 'a' },
  vitamin_b12: { name: 'vitamina B12', article: 'a' },
};

const POSSESSIVE: Record<Article, string> = { o: 'O teu', a: 'A tua', os: 'Os teus', as: 'As tuas' };

function plainOf(b: Pick<BiomarkerWithScoring, 'name' | 'name_normalized'>) {
  return PLAIN[canonicalBiomarkerKey(b.name_normalized, b.name)] ?? null;
}

/** Nome do dia a dia com maiúscula ("Colesterol "mau""), ou o nome do exame se não houver. */
export function plainLabel(b: Pick<BiomarkerWithScoring, 'name' | 'name_normalized'>): string {
  const plain = plainOf(b);
  if (!plain) return b.name;
  return plain.name.charAt(0).toUpperCase() + plain.name.slice(1);
}

/** true quando o nome do dia a dia é diferente do nome técnico (vale a pena mostrar os dois). */
export function hasPlainName(b: Pick<BiomarkerWithScoring, 'name' | 'name_normalized'>): boolean {
  return plainOf(b) !== null;
}

export function toneOf(b: Pick<BiomarkerWithScoring, 'attentionLevel'>): Tone {
  return TONE_BY_LEVEL[b.attentionLevel];
}

type Scored = Pick<BiomarkerWithScoring, 'latestValue' | 'ref_min' | 'ref_max' | 'severity' | 'proximity' | 'trend' | 'adverseTrend' | 'attentionLevel'>;

/** Estado curto de um valor, para cartões e listas. */
export function shortStatus(b: Scored): string {
  if (b.adverseTrend) return b.trend === 'a_subir' ? 'A subir' : 'A descer';
  if (b.severity > 0) {
    return b.ref_max != null && b.latestValue > b.ref_max ? 'Acima do intervalo' : 'Abaixo do intervalo';
  }
  if (b.proximity > 0.66) return 'Perto do limite';
  if (b.attentionLevel !== 'dentro_do_esperado') return 'A acompanhar';
  if (b.trend === 'sem_dados') return 'Primeira medição';
  return b.trend === 'estavel' ? 'Estável' : 'Dentro do intervalo';
}

/**
 * Frase do ecrã inicial sobre o valor que mais pesa, em linguagem do dia a dia:
 * "O teu colesterol "mau" está a subir".
 */
export function headlineFor(b: BiomarkerWithScoring): string {
  const plain = plainOf(b);
  const article: Article = plain?.article ?? 'o';
  const subject = plain ? `${POSSESSIVE[article]} ${plain.name}` : `O teu valor de ${b.name}`;
  const plural = plain ? article === 'os' || article === 'as' : false;
  const be = plural ? 'estão' : 'está';

  if (b.adverseTrend) return `${subject} ${be} a ${b.trend === 'a_subir' ? 'subir' : 'descer'}`;
  if (b.severity > 0) {
    const above = b.ref_max != null && b.latestValue > b.ref_max;
    return `${subject} ${be} ${above ? 'acima' : 'abaixo'} do esperado`;
  }
  if (b.proximity > 0.66) return `${subject} ${be} perto do limite`;
  return `${subject} ${plural ? 'merecem' : 'merece'} atenção`;
}

const TONE_RANK: Record<Tone, number> = { out: 4, att: 3, watch: 2, ok: 1, none: 0 };

type Rankable = Pick<BiomarkerWithScoring, 'attentionLevel'> &
  Partial<Pick<BiomarkerWithScoring, 'severity' | 'adverseTrend' | 'proximity'>>;

/**
 * Valores ordenados do que mais pesa para o que menos pesa. No mesmo nível,
 * vem primeiro o que já saiu do intervalo, depois o que se está a afastar dele.
 */
export function rankByAttention<T extends Rankable>(biomarkers: T[]): T[] {
  return [...biomarkers].sort(
    (a, b) =>
      TONE_RANK[toneOf(b)] - TONE_RANK[toneOf(a)] ||
      (b.severity ?? 0) - (a.severity ?? 0) ||
      Number(b.adverseTrend ?? false) - Number(a.adverseTrend ?? false) ||
      (b.proximity ?? 0) - (a.proximity ?? 0)
  );
}

/** Tom do conjunto: o do valor que mais pesa; lilás quando ainda não há valores. */
export function overallTone(biomarkers: Pick<BiomarkerWithScoring, 'attentionLevel'>[]): Tone {
  if (biomarkers.length === 0) return 'none';
  return toneOf(rankByAttention(biomarkers)[0]);
}

/** Quantos valores há em cada tom, pela ordem do anel (do melhor para o que mais pesa). */
export function countByTone(biomarkers: Pick<BiomarkerWithScoring, 'attentionLevel'>[]): { tone: Tone; count: number }[] {
  const order: Tone[] = ['ok', 'watch', 'att', 'out'];
  return order
    .map((tone) => ({ tone, count: biomarkers.filter((b) => toneOf(b) === tone).length }))
    .filter((part) => part.count > 0);
}
