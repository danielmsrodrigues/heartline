import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { scoreBiomarkers } from "./health-model.ts";
import type {
  AttentionLevel,
  BiomarkerRow,
  BiomarkerWithScoring,
  Trend,
} from "./health-model.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = "gemini-2.5-flash";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AuthContext {
  userId: string;
  /** Cliente com o JWT do utilizador: todas as queries passam pelo RLS. */
  supabase: SupabaseClient;
}

/**
 * Identifica o utilizador pelo JWT do pedido. O id nunca vem do body —
 * quem chama só consegue ler e escrever os seus próprios dados.
 */
export async function requireUser(req: Request): Promise<AuthContext | Response> {
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json({ error: "Unauthorized" }, 401);

  return { userId: data.user.id, supabase };
}

type Handler = (req: Request, auth: AuthContext) => Promise<Response>;

export function serveAuthenticated(name: string, handler: Handler) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      const auth = await requireUser(req);
      if (auth instanceof Response) return auth;
      return await handler(req, auth);
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error(`${name}: Gemini ${err.status}`);
        return json({ error: "AI service unavailable" }, err.status === 429 ? 429 : 502);
      }
      console.error(`${name} error:`, err);
      return json({ error: "Internal server error" }, 500);
    }
  });
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

export class GeminiError extends Error {
  constructor(public status: number, detail: string) {
    super(`Gemini request failed (${status}): ${detail}`);
  }
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/** Devolve o texto da resposta, ou "" se o modelo não respondeu (ex.: bloqueio de segurança). */
export async function callGemini(
  parts: GeminiPart[],
  options: { temperature: number; json?: boolean; schema?: unknown }
): Promise<string> {
  const generationConfig: Record<string, unknown> = { temperature: options.temperature };
  if (options.json || options.schema) generationConfig.responseMimeType = "application/json";
  if (options.schema) generationConfig.responseSchema = options.schema;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
      signal: AbortSignal.timeout(55_000),
    }
  );

  if (!response.ok) {
    throw new GeminiError(response.status, (await response.text()).slice(0, 500));
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

/** Substitui {chave} sem que "$&" e afins nos dados sejam interpretados. */
export function fillPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? values[key] : match
  );
}

// ---------------------------------------------------------------------------
// Regras de linguagem
// ---------------------------------------------------------------------------

const BASE_FORBIDDEN = [
  "risco",
  "riscos",
  "diagnóstico",
  "diagnósticos",
  "diagnosticar",
  "deves",
  "precisas",
  "recomendamos",
  "paciente",
  "probabilidade",
  "está tudo bem",
  "não te preocupes",
];

/** Correspondência por palavra inteira: "devo" não apanha "devolver". */
export function containsForbidden(text: string, extra: string[] = []): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return [...BASE_FORBIDDEN, ...extra].some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "u").test(lower);
  });
}

// ---------------------------------------------------------------------------
// Contexto de saúde enviado ao modelo
// ---------------------------------------------------------------------------

const ATTENTION_LABELS: Record<AttentionLevel, string> = {
  dentro_do_esperado: "Dentro do esperado",
  a_acompanhar: "A acompanhar",
  merece_atencao: "Merece atenção",
  fora_do_range: "Fora do range",
};

const TREND_LABELS: Record<Trend, string> = {
  a_subir: "A subir",
  a_descer: "A descer",
  estavel: "Estável",
  sem_dados: "Sem leituras anteriores",
};

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export interface HealthContext {
  /** Só o necessário para a análise: sem nome, sem data de nascimento, sem ids. */
  summary: Record<string, unknown>;
  biomarkers: BiomarkerWithScoring[];
  examIds: string[];
}

const PAGE_SIZE = 1000;

// O PostgREST devolve no máximo 1000 linhas por pedido (mesma paginação da app).
async function fetchConfirmedBiomarkers({ supabase, userId }: AuthContext) {
  const all: Omit<BiomarkerRow, "exam_date">[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("biomarkers")
      .select("id, exam_id, name, name_normalized, value, unit, ref_min, ref_max")
      .eq("profile_id", userId)
      .eq("user_confirmed", true)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return all;
  }
}

export async function loadHealthContext(auth: AuthContext): Promise<HealthContext> {
  const { supabase, userId } = auth;
  const [profileRes, familyRes, examsRes, markers] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("family_history").select("*").eq("profile_id", userId),
    supabase.from("exams").select("id, exam_date").eq("profile_id", userId),
    fetchConfirmedBiomarkers(auth),
  ]);
  for (const res of [profileRes, familyRes, examsRes]) {
    if (res.error) throw res.error;
  }

  const profile = profileRes.data;
  const family = familyRes.data ?? [];
  const dateByExam = new Map<string, string>(
    (examsRes.data ?? []).map((e: { id: string; exam_date: string }) => [e.id, e.exam_date])
  );

  const rows: BiomarkerRow[] = [];
  for (const m of markers) {
    const examDate = m.exam_id ? dateByExam.get(m.exam_id) : undefined;
    if (examDate) rows.push({ ...m, exam_date: examDate });
  }

  const biomarkers = scoreBiomarkers(rows, family.length > 0);

  const summary = {
    perfil: profile
      ? {
          idade: ageFrom(profile.birth_date),
          sexo: profile.sex,
          fumador: profile.smoker,
          exercicio_minutos_por_semana: profile.exercise_minutes_per_week,
          trabalho_sedentario: profile.sedentary_work,
          horas_de_sono: profile.sleep_hours_avg,
        }
      : null,
    historico_familiar: family.map((f: Record<string, unknown>) => ({
      familiar: f.relationship,
      evento: f.event_type,
      idade_no_evento: f.event_age,
    })),
    biomarcadores: biomarkers.map((b) => ({
      nome: b.name,
      valor: b.latestValue,
      unidade: b.unit,
      referencia_min: b.ref_min,
      referencia_max: b.ref_max,
      nivel_de_atencao: ATTENTION_LABELS[b.attentionLevel],
      tendencia: TREND_LABELS[b.trend],
      tendencia_desfavoravel: b.adverseTrend,
      leituras: b.readings.map((r) => ({ data: r.date, valor: r.value })),
    })),
  };

  return {
    summary,
    biomarkers,
    examIds: [...new Set(rows.map((r) => r.exam_id).filter(Boolean))] as string[],
  };
}

// Quem usa a app não tem de saber o que é "LDL": a IA fala como uma pessoa
// falaria, por "tu", e usa os nomes do dia a dia (os mesmos da app).
const LANGUAGE_NOTE = `LINGUAGEM (obrigatória):
- Trata o utilizador sempre por "tu". Nunca uses "você", "o seu", "a sua", "esteja" nem outras formas de tratamento formal.
- Usa nomes do dia a dia em vez de siglas: colesterol "mau" (LDL), colesterol "bom" (HDL), gorduras no sangue (triglicéridos), açúcar no sangue (glicose), açúcar médio no sangue (HbA1c), marcador dos rins (creatinina), marcador de inflamação (PCR). Na primeira vez que falares de um valor podes pôr a sigla entre parênteses; depois usa só o nome do dia a dia.
- Para valores sem nome do dia a dia, usa o nome do exame e explica em poucas palavras o que é.
- Frases curtas. Sem jargão médico.`;

export const SCORING_NOTE = `O campo "nivel_de_atencao" de cada biomarcador foi calculado pela app de forma determinística e é a fonte de verdade: nunca o contradigas nem classifiques um valor de outra forma. "tendencia_desfavoravel" indica se a evolução afasta o valor da zona de referência.

${LANGUAGE_NOTE}`;

/** Guarda o conteúdo gerado e apaga as versões anteriores do mesmo tipo. */
export async function saveGeneratedContent(
  auth: AuthContext,
  contentType: "narrative" | "questions",
  content: unknown,
  examIds: string[]
): Promise<void> {
  const { supabase, userId } = auth;
  const { data, error } = await supabase
    .from("generated_content")
    .insert({
      profile_id: userId,
      content_type: contentType,
      content,
      based_on_exam_ids: examIds,
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase
    .from("generated_content")
    .delete()
    .eq("profile_id", userId)
    .eq("content_type", contentType)
    .neq("id", data.id);
}
