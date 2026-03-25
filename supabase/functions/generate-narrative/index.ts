import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NARRATIVE_PROMPT = `És um comunicador de saúde. Analisa os dados do utilizador e devolve um resumo em JSON com 6 campos.

DADOS DO UTILIZADOR:
{dados_serializados}

DEVOLVE UM OBJECTO JSON COM EXACTAMENTE ESTES 6 CAMPOS:

1. "insight" — O padrão mais importante que vês no CONJUNTO dos dados. Fala sobre relações entre biomarcadores, não valores individuais. Máximo 120 caracteres.
   Exemplo: "O teu LDL e triglicéridos estão a subir enquanto o HDL se mantém baixo — este padrão merece acompanhamento."

2. "positive" — Um facto positivo sobre o estilo de vida ou dados do utilizador. Valida o que está a fazer bem. Máximo 120 caracteres.
   Exemplo: "Não fumas e fazes 180 min de exercício por semana — são factores protectores importantes."

3. "family_note" — Se há histórico familiar, uma frase curta sobre o impacto. Se NÃO há histórico familiar, devolve string vazia "". Máximo 120 caracteres.
   Exemplo: "Com historial familiar de enfarte precoce, estes valores merecem atenção mais cedo."

4. "full_insight" — Versão expandida do insight. 2-3 frases sobre padrões entre biomarcadores e o que o conjunto dos dados sugere. Integra tendências temporais se disponíveis. Máximo 300 caracteres.
   Exemplo: "O LDL tem vindo a subir nos últimos dois exames enquanto o HDL se mantém abaixo do valor de referência. Este padrão lipídico, combinado com triglicéridos elevados, sugere que vale a pena uma conversa com o teu médico sobre acompanhamento."

5. "full_positive" — Versão expandida do positive. 2-3 frases sobre factores protectores do estilo de vida do utilizador, explicando porque são relevantes. Máximo 300 caracteres.
   Exemplo: "Fazes exercício regularmente e não fumas — dois dos factores protectores mais relevantes para a saúde cardiovascular. O teu nível de actividade física contribui para manter vários marcadores dentro de valores favoráveis."

6. "full_family" — Versão expandida do family_note. 2-3 frases sobre como o histórico familiar se relaciona com as leituras actuais. Se NÃO há histórico familiar, devolve string vazia "". Máximo 300 caracteres.
   Exemplo: "O historial familiar de enfarte precoce torna mais relevante acompanhar a evolução do perfil lipídico. Alguns profissionais de saúde consideram que, neste contexto, faz sentido monitorizar estes valores com mais frequência."

REGRAS ABSOLUTAS:
- NUNCA uses "risco", "diagnóstico", "deves", "precisas", "está tudo bem", "não te preocupes"
- Usa "vale a pena", "faz sentido", "merece acompanhamento"
- NUNCA dês percentagens de probabilidade
- NUNCA recomends medicação ou tratamento
- Campos curtos (insight, positive, family_note): MÁXIMO 120 caracteres
- Campos expandidos (full_insight, full_positive, full_family): MÁXIMO 300 caracteres
- Escreve em português de Portugal

FORMATO: JSON válido, sem markdown, sem backticks.
{ "insight": "...", "positive": "...", "family_note": "...", "full_insight": "...", "full_positive": "...", "full_family": "..." }`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { profileId } = await req.json();

    if (!profileId) {
      return new Response(JSON.stringify({ error: "No profileId provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all user data
    const [profileRes, familyRes, biomarkersRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profileId).single(),
      supabase.from("family_history").select("*").eq("profile_id", profileId),
      supabase
        .from("biomarkers")
        .select("*, exams!inner(exam_date)")
        .eq("profile_id", profileId)
        .eq("user_confirmed", true),
    ]);

    const userData = {
      profile: profileRes.data,
      family_history: familyRes.data,
      biomarkers: biomarkersRes.data,
    };

    const prompt = NARRATIVE_PROMPT.replace(
      "{dados_serializados}",
      JSON.stringify(userData, null, 2)
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        }),
      }
    );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed: {
      insight: string;
      positive: string;
      family_note: string;
      full_insight: string;
      full_positive: string;
      full_family: string;
    };

    const fallback = {
      insight: "Identificámos alguns padrões que vale a pena acompanhar com o teu médico.",
      positive: "O facto de acompanhares a tua saúde é um passo importante.",
      family_note: "",
      full_insight:
        "Com base nos dados que nos forneceste, identificámos alguns padrões que vale a pena acompanhar. Faz sentido discutir a evolução destes valores com o teu médico na próxima consulta.",
      full_positive:
        "Acompanhares activamente a tua saúde é um passo importante. Manter este hábito permite-te ter conversas mais informadas com o teu médico.",
      full_family: "",
    };

    try {
      parsed = JSON.parse(rawText);
      // Ensure all 6 fields exist
      parsed = {
        insight: parsed.insight || fallback.insight,
        positive: parsed.positive || fallback.positive,
        family_note: parsed.family_note ?? fallback.family_note,
        full_insight: parsed.full_insight || fallback.full_insight,
        full_positive: parsed.full_positive || fallback.full_positive,
        full_family: parsed.full_family ?? fallback.full_family,
      };
    } catch {
      console.error("Failed to parse narrative JSON:", rawText);
      parsed = { ...fallback };
    }

    // Validate: reject if contains forbidden words
    const forbidden = ["risco", "diagnóstico", "diagnosticar", "deves", "precisas"];
    const allText =
      `${parsed.insight} ${parsed.positive} ${parsed.family_note} ${parsed.full_insight} ${parsed.full_positive} ${parsed.full_family}`.toLowerCase();
    if (forbidden.some((word) => allText.includes(word))) {
      console.error("Narrative contains forbidden words, using fallback");
      parsed = { ...fallback };
    }

    // Cache in DB
    const examIds = [
      ...new Set(
        (biomarkersRes.data ?? []).map((b: any) => b.exam_id).filter(Boolean)
      ),
    ];

    await supabase.from("generated_content").insert({
      profile_id: profileId,
      content_type: "narrative",
      content: parsed,
      based_on_exam_ids: examIds,
    });

    return new Response(JSON.stringify(parsed), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Narrative error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
