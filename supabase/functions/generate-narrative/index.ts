import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NARRATIVE_PROMPT = `És um comunicador de saúde. O teu trabalho é ajudar pessoas a entender os seus dados de saúde de forma clara e calma.

DADOS DO UTILIZADOR:
{dados_serializados}

INSTRUÇÕES:
1. Escreve 2-3 parágrafos curtos que expliquem o que o CONJUNTO dos dados sugere.
2. NÃO repitas cada valor individualmente — fala sobre padrões e relações entre biomarcadores.
3. Se há histórico familiar, integra-o naturalmente no texto.
4. Menciona factores positivos do estilo de vida (exercício, não fumar, etc.).
5. Usa linguagem acessível. Sem jargão médico desnecessário.
6. Quando explicares termos técnicos, fá-lo de forma natural ("o LDL, que transporta gordura para as artérias").

REGRAS ABSOLUTAS — VIOLAÇÃO DE QUALQUER UMA INVALIDA O OUTPUT:
- NUNCA uses a palavra "risco" ou "diagnóstico"
- NUNCA dês percentagens de probabilidade
- NUNCA recomends medicação ou tratamento
- NUNCA digas "está tudo bem", "não te preocupes", ou "não há problema"
- NUNCA uses "deves" ou "precisas" — usa "vale a pena", "faz sentido", "é boa prática"
- Quando mencionares práticas médicas, diz "alguns profissionais consideram" ou "é prática comum"
- O nível de atenção mais positivo que podes dar é: "Não identificámos tendências de alerta nos dados que nos forneceste — mas isto não substitui avaliação médica."

TOM:
- Caloroso mas honesto
- O objetivo é clareza e sensação de controlo, não conforto falso
- Valida o que o utilizador está a fazer bem (exercício, atenção à saúde)
- Transforma preocupação vaga em informação concreta

FORMATO: Texto corrido em parágrafos, sem bullets, sem headers, sem bold. Máximo 150 palavras. Escreve em português de Portugal.`;

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
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    const narrative = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Validate: reject if contains forbidden words
    const forbidden = ["risco", "diagnóstico", "diagnosticar", "deves", "precisas"];
    const containsForbidden = forbidden.some((word) =>
      narrative.toLowerCase().includes(word)
    );

    if (containsForbidden) {
      console.error("Narrative contains forbidden words, regenerating...");
      // Return a safe fallback
      return new Response(
        JSON.stringify({
          narrative:
            "Com base nos dados que nos forneceste, identificámos alguns padrões que vale a pena acompanhar com o teu médico. Fala com ele sobre os valores que merecem atenção para teres uma visão mais completa.",
        }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
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
      content: { narrative },
      based_on_exam_ids: examIds,
    });

    return new Response(JSON.stringify({ narrative }), {
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
