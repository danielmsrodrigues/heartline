import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `És um assistente de saúde. O utilizador vai fazer-te perguntas sobre os seus dados de saúde.

DADOS DO UTILIZADOR:
{dados_serializados}

PERGUNTA DO UTILIZADOR: {question}

REGRAS ABSOLUTAS:
- NUNCA uses "risco", "diagnóstico", "deves", "precisas"
- Usa "vale a pena", "faz sentido", "merece acompanhamento"
- NUNCA dês percentagens de probabilidade
- NUNCA recomends medicação ou tratamento
- NUNCA digas "está tudo bem" ou "não te preocupes"
- Responde de forma clara, concisa e calorosa
- Máximo 150 palavras
- Escreve em português de Portugal

Responde APENAS com texto. Sem markdown, sem bullets, sem headers.`;

const FALLBACK_ANSWER =
  "Neste momento não consigo responder a essa pergunta com segurança. Vale a pena colocá-la directamente ao teu médico na próxima consulta.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { profileId, question } = await req.json();

    if (!profileId || !question) {
      return new Response(
        JSON.stringify({ error: "profileId and question are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
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

    const prompt = SYSTEM_PROMPT.replace(
      "{dados_serializados}",
      JSON.stringify(userData, null, 2)
    ).replace("{question}", question);

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
    let answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!answer) {
      answer = FALLBACK_ANSWER;
    }

    // Validate: reject if contains forbidden words
    const forbidden = [
      "risco",
      "diagnóstico",
      "diagnosticar",
      "deves",
      "precisas",
      "está tudo bem",
      "não te preocupes",
    ];
    const lowerAnswer = answer.toLowerCase();
    if (forbidden.some((word) => lowerAnswer.includes(word))) {
      console.error("Answer contains forbidden words, using fallback");
      answer = FALLBACK_ANSWER;
    }

    return new Response(JSON.stringify({ answer }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Ask-question error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
