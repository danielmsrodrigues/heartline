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

const NARRATIVE_PROMPT = `És um comunicador de saúde. Analisa os dados do utilizador e devolve um resumo em JSON com 6 campos.

DADOS DO UTILIZADOR:
{dados_serializados}

{nota_scoring}

DEVOLVE UM OBJETO JSON COM EXATAMENTE ESTES 6 CAMPOS:

1. "insight" — O padrão mais importante que vês no CONJUNTO dos dados. Fala sobre relações entre biomarcadores, não valores individuais. Máximo 120 caracteres.
   Exemplo: "O teu colesterol \"mau\" e as gorduras no sangue estão a subir enquanto o colesterol \"bom\" se mantém baixo — este padrão merece acompanhamento."

2. "positive" — Um facto positivo sobre o estilo de vida ou dados do utilizador. Valida o que está a fazer bem. Máximo 120 caracteres.
   Exemplo: "Não fumas e fazes 180 min de exercício por semana — são fatores protetores importantes."

3. "family_note" — Se há histórico familiar, uma frase curta sobre o impacto. Se NÃO há histórico familiar, devolve string vazia "". Máximo 120 caracteres.
   Exemplo: "Com historial familiar de enfarte precoce, estes valores merecem atenção mais cedo."

4. "full_insight" — Versão expandida do insight. 2-3 frases sobre padrões entre biomarcadores e o que o conjunto dos dados sugere. Integra tendências temporais se disponíveis. Máximo 300 caracteres.
   Exemplo: "O colesterol \"mau\" (LDL) tem vindo a subir nos últimos dois exames enquanto o colesterol \"bom\" (HDL) se mantém abaixo do valor de referência. Este padrão lipídico, combinado com triglicéridos elevados, sugere que vale a pena uma conversa com o teu médico sobre acompanhamento."

5. "full_positive" — Versão expandida do positive. 2-3 frases sobre fatores protetores do estilo de vida do utilizador, explicando porque são relevantes. Máximo 300 caracteres.
   Exemplo: "Fazes exercício regularmente e não fumas — dois dos fatores protetores mais relevantes para a saúde cardiovascular. O teu nível de atividade física contribui para manter vários marcadores dentro de valores favoráveis."

6. "full_family" — Versão expandida do family_note. 2-3 frases sobre como o histórico familiar se relaciona com as leituras atuais. Se NÃO há histórico familiar, devolve string vazia "". Máximo 300 caracteres.
   Exemplo: "O historial familiar de enfarte precoce torna mais relevante acompanhar a evolução do perfil lipídico. Alguns profissionais de saúde consideram que, neste contexto, faz sentido monitorizar estes valores com mais frequência."

REGRAS ABSOLUTAS:
- NUNCA uses "risco", "diagnóstico", "deves", "precisas", "está tudo bem", "não te preocupes"
- Usa "vale a pena", "faz sentido", "merece acompanhamento"
- NUNCA dês percentagens de probabilidade
- NUNCA recomendes medicação ou tratamento
- Campos curtos (insight, positive, family_note): MÁXIMO 120 caracteres
- Campos expandidos (full_insight, full_positive, full_family): MÁXIMO 300 caracteres
- Escreve em português de Portugal

FORMATO: JSON válido, sem markdown, sem backticks.
{ "insight": "...", "positive": "...", "family_note": "...", "full_insight": "...", "full_positive": "...", "full_family": "..." }`;

const FALLBACK = {
  insight: "Identificámos alguns padrões que vale a pena acompanhar com o teu médico.",
  positive: "O facto de acompanhares a tua saúde é um passo importante.",
  family_note: "",
  full_insight:
    "Com base nos dados que nos forneceste, identificámos alguns padrões que vale a pena acompanhar. Faz sentido discutir a evolução destes valores com o teu médico na próxima consulta.",
  full_positive:
    "Acompanhares ativamente a tua saúde é um passo importante. Manter este hábito permite-te ter conversas mais informadas com o teu médico.",
  full_family: "",
};

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

serveAuthenticated("generate-narrative", async (_req, auth) => {
  const context = await loadHealthContext(auth);
  if (context.biomarkers.length === 0) {
    return json({ error: "No biomarkers to analyse" }, 422);
  }

  const prompt = fillPrompt(NARRATIVE_PROMPT, {
    dados_serializados: JSON.stringify(context.summary, null, 2),
    nota_scoring: SCORING_NOTE,
  });

  const rawText = await callGemini([{ text: prompt }], { temperature: 0.7, json: true });

  let parsed = { ...FALLBACK };
  try {
    const raw = JSON.parse(rawText || "{}");
    parsed = {
      insight: text(raw.insight, FALLBACK.insight),
      positive: text(raw.positive, FALLBACK.positive),
      family_note: text(raw.family_note, FALLBACK.family_note),
      full_insight: text(raw.full_insight, FALLBACK.full_insight),
      full_positive: text(raw.full_positive, FALLBACK.full_positive),
      full_family: text(raw.full_family, FALLBACK.full_family),
    };
  } catch {
    console.error("generate-narrative: resposta sem JSON válido");
  }

  if (containsForbidden(Object.values(parsed).join(" "))) {
    console.error("generate-narrative: linguagem proibida, a usar fallback");
    parsed = { ...FALLBACK };
  }

  await saveGeneratedContent(auth, "narrative", parsed, context.examIds);
  return json(parsed);
});
