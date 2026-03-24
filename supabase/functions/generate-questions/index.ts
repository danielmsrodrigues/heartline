import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QUESTIONS_PROMPT = `Com base neste perfil de saúde, gera 2-3 perguntas que esta pessoa poderia fazer ao médico na próxima consulta.

DADOS: {dados_serializados}

INSTRUÇÕES:
- Cada pergunta deve referenciar dados concretos do utilizador (valores, tendências, datas)
- Formuladas na 1ª pessoa, prontas a usar pelo utilizador
- Inclui uma frase curta de contexto (porquê esta pergunta)
- Ordena da mais urgente para a menos urgente

REGRAS:
- NUNCA sugiras medicação ou tratamento específico
- As perguntas pedem AVALIAÇÃO ao médico, não confirmação
- Usa "faz sentido", "seria útil", "vale a pena" — nunca "preciso" ou "devo"
- Máximo 3 perguntas

FORMATO: JSON array. Sem markdown, sem backticks.
[{ "question": "...", "context": "..." }]
Escreve em português de Portugal.`;

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

    const prompt = QUESTIONS_PROMPT.replace(
      "{dados_serializados}",
      JSON.stringify(userData, null, 2)
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    let questions: Array<{ question: string; context: string }>;
    try {
      questions = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse questions:", rawText);
      questions = [];
    }

    // Validate: remove any question containing forbidden words
    const forbidden = ["risco", "diagnóstico", "devo", "preciso", "medicação"];
    questions = questions.filter((q) => {
      const text = (q.question + " " + q.context).toLowerCase();
      return !forbidden.some((word) => text.includes(word));
    });

    // Limit to 3
    questions = questions.slice(0, 3);

    // Cache in DB
    const examIds = [
      ...new Set(
        (biomarkersRes.data ?? []).map((b: any) => b.exam_id).filter(Boolean)
      ),
    ];

    await supabase.from("generated_content").insert({
      profile_id: profileId,
      content_type: "questions",
      content: { questions },
      based_on_exam_ids: examIds,
    });

    return new Response(JSON.stringify({ questions }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Questions error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
