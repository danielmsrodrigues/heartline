import {
  callGemini,
  containsForbidden,
  fillPrompt,
  json,
  loadHealthContext,
  saveGeneratedContent,
  SCORING_NOTE,
  serveAuthenticated,
} from "../_shared/runtime.ts";

const QUESTIONS_PROMPT = `Com base neste perfil de saúde, gera 2-3 perguntas CURTAS que esta pessoa poderia fazer ao médico.

DADOS: {dados_serializados}

{nota_scoring}

INSTRUÇÕES:
- Cada pergunta deve referenciar dados concretos do utilizador
- Formuladas na 1ª pessoa, prontas a usar
- Cada pergunta MÁXIMO 100 caracteres — sê direto e conciso
- O contexto MÁXIMO 80 caracteres
- Ordena da mais urgente para a menos urgente

REGRAS:
- NUNCA uses "risco", "devo", "preciso", "medicação", "diagnóstico"
- Usa "faz sentido", "seria útil", "vale a pena"
- Máximo 3 perguntas

FORMATO: JSON array. Sem markdown, sem backticks.
[{ "question": "...", "context": "..." }]
Escreve em português de Portugal.`;

const QUESTION_ONLY_FORBIDDEN = ["devo", "preciso", "medicação"];

serveAuthenticated("generate-questions", async (_req, auth) => {
  const context = await loadHealthContext(auth);
  if (context.biomarkers.length === 0) {
    return json({ error: "No biomarkers to analyse" }, 422);
  }

  const prompt = fillPrompt(QUESTIONS_PROMPT, {
    dados_serializados: JSON.stringify(context.summary, null, 2),
    nota_scoring: SCORING_NOTE,
  });

  const rawText = await callGemini([{ text: prompt }], { temperature: 0.7, json: true });

  let questions: Array<{ question: string; context: string }> = [];
  try {
    const raw = JSON.parse(rawText || "[]");
    questions = (Array.isArray(raw) ? raw : [])
      .filter((q) => typeof q?.question === "string" && q.question.trim())
      .map((q) => ({
        question: q.question.trim(),
        context: typeof q.context === "string" ? q.context.trim() : "",
      }));
  } catch {
    console.error("generate-questions: resposta sem JSON válido");
  }

  questions = questions
    .filter((q) => !containsForbidden(`${q.question} ${q.context}`, QUESTION_ONLY_FORBIDDEN))
    .slice(0, 3);

  await saveGeneratedContent(auth, "questions", { questions }, context.examIds);
  return json({ questions });
});
