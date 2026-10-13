import { supabase } from "./supabase";
import { ExtractionResult } from "./types";

const RATE_LIMIT_MSG =
  "O serviço de análise está temporariamente indisponível. Tenta novamente dentro de alguns minutos.";

function isRateLimitError(error: any): boolean {
  const msg = error?.message?.toLowerCase() ?? "";
  const status = error?.context?.status;
  return status === 429 || msg.includes("429") || msg.includes("rate") || msg.includes("quota") || msg.includes("resource exhausted");
}

function handleError(error: any): never {
  // O código HTTP distingue limite da IA (429), falha do modelo (502) e sessão inválida (401).
  console.warn(`AI error (HTTP ${error?.context?.status ?? "?"}):`, error?.message ?? error);
  if (isRateLimitError(error)) {
    throw new Error(RATE_LIMIT_MSG);
  }
  throw new Error(
    "Não foi possível processar o pedido. Tenta novamente."
  );
}

// As Edge Functions identificam o utilizador pelo JWT da sessão, que o
// supabase-js envia sozinho — nunca se passa o id do perfil no body.

export async function extractExamFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
) {
  const { data, error } = await supabase.functions.invoke("extract-exam", {
    body: { image: imageBase64, mimeType },
  });
  if (error) handleError(error);
  return data as ExtractionResult;
}

export async function generateNarrative() {
  const { data, error } = await supabase.functions.invoke("generate-narrative");
  if (error) handleError(error);
  return data as {
    insight: string;
    positive: string;
    family_note: string;
    full_insight: string;
    full_positive: string;
    full_family: string;
  };
}

export async function generateQuestions() {
  const { data, error } = await supabase.functions.invoke("generate-questions");
  if (error) handleError(error);
  return data as {
    questions: Array<{ question: string; context: string }>;
  };
}

export async function askQuestion(question: string) {
  const { data, error } = await supabase.functions.invoke("ask-question", {
    body: { question },
  });
  if (error) handleError(error);
  return data as { answer: string };
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke("delete-account");
  if (error) throw error;
}
