import { useCallback } from "react";
import { useIsMutating, useMutation, useMutationState, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient, queryKeys } from "@/lib/query";
import { useAuth } from "./useAuth";
import { cachedExamSignature, examSignature } from "./useBiomarkers";
import { generateNarrative, generateQuestions } from "@/lib/ai";

export interface InsightCards {
  insight: string;
  positive: string;
  family_note: string;
}

export interface FullAnalysis {
  full_insight: string;
  full_positive: string;
  full_family: string;
}

type Question = { question: string; context: string };

interface GeneratedData {
  cards: InsightCards | null;
  fullAnalysis: FullAnalysis | null;
  questions: Question[];
  generatedAt: string | null;
  /** Exames em que a análise se baseou (ver examSignature); null se desconhecido. */
  basedOnExams: string | null;
}

const EMPTY_QUESTIONS: Question[] = [];

function toNarrative(content: any): Pick<GeneratedData, "cards" | "fullAnalysis"> {
  // Formato antigo (texto corrido) não tem "insight": tratar como inexistente.
  if (!content || typeof content !== "object" || !("insight" in content)) {
    return { cards: null, fullAnalysis: null };
  }
  return {
    cards: {
      insight: content.insight ?? "",
      positive: content.positive ?? "",
      family_note: content.family_note ?? "",
    },
    fullAnalysis: {
      full_insight: content.full_insight ?? "",
      full_positive: content.full_positive ?? "",
      full_family: content.full_family ?? "",
    },
  };
}

async function fetchCached(userId: string): Promise<GeneratedData> {
  const latest = (type: "narrative" | "questions") =>
    supabase
      .from("generated_content")
      .select("content, generated_at, based_on_exam_ids")
      .eq("profile_id", userId)
      .eq("content_type", type)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const [narrativeRes, questionsRes] = await Promise.all([latest("narrative"), latest("questions")]);
  if (narrativeRes.error) throw narrativeRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const narrative = toNarrative(narrativeRes.data?.content);
  return {
    ...narrative,
    questions: (questionsRes.data?.content as any)?.questions ?? EMPTY_QUESTIONS,
    generatedAt: narrative.cards ? narrativeRes.data?.generated_at ?? null : null,
    basedOnExams:
      narrative.cards && Array.isArray(narrativeRes.data?.based_on_exam_ids)
        ? examSignature(narrativeRes.data.based_on_exam_ids)
        : null,
  };
}

// Uma geração de cada vez por utilizador, seja qual for o ecrã que a pediu.
const inflight = new Map<string, Promise<void>>();
// Pedidos que chegaram a meio de uma geração: essa já leu os dados antigos,
// por isso corre-se mais uma vez no fim em vez de os descartar.
const rerunRequested = new Set<string>();

function runRegeneration(userId: string): Promise<void> {
  const pending = inflight.get(userId);
  if (pending) {
    rerunRequested.add(userId);
    return pending;
  }

  const run = (async () => {
    do {
      rerunRequested.delete(userId);
      // Carimbo do início: o que mudar durante a geração continua a contar como mais recente.
      const startedAt = new Date().toISOString();
      const basedOnExams = cachedExamSignature(userId);
      const [narrative, questions] = await Promise.all([
        generateNarrative(),
        generateQuestions(),
      ]);
      // Um refetch pendente traria a versão antiga por cima da nova.
      await queryClient.cancelQueries({ queryKey: queryKeys.generated(userId) });
      queryClient.setQueryData<GeneratedData>(queryKeys.generated(userId), {
        ...toNarrative(narrative),
        questions: questions.questions ?? EMPTY_QUESTIONS,
        generatedAt: startedAt,
        basedOnExams,
      });
    } while (rerunRequested.has(userId));
  })().finally(() => {
    inflight.delete(userId);
    rerunRequested.delete(userId);
  });
  inflight.set(userId, run);
  return run;
}

export function useGeneratedContent() {
  const { user } = useAuth();
  const userId = user?.id;
  const mutationKey = queryKeys.regenerate(userId);

  const query = useQuery({
    queryKey: queryKeys.generated(userId),
    queryFn: () => fetchCached(userId!),
    enabled: !!userId,
  });

  const { mutateAsync } = useMutation({
    mutationKey,
    mutationFn: () => runRegeneration(userId!),
  });

  // Estado partilhado entre ecrãs: a geração pode ter sido pedida noutro lado.
  const generating = useIsMutating({ mutationKey }) > 0;
  const statuses = useMutationState({
    filters: { mutationKey },
    select: (mutation) => mutation.state.status,
  });
  const failed = !generating && statuses[statuses.length - 1] === "error";

  const regenerate = useCallback(async () => {
    if (!userId) return;
    await mutateAsync();
  }, [userId, mutateAsync]);

  const { refetch } = query;
  const refetchCached = useCallback(async () => {
    // Não ir buscar a versão antiga à BD por cima de uma geração em curso.
    if (userId && inflight.has(userId)) return;
    await refetch();
  }, [userId, refetch]);

  return {
    cards: query.data?.cards ?? null,
    fullAnalysis: query.data?.fullAnalysis ?? null,
    questions: query.data?.questions ?? EMPTY_QUESTIONS,
    generatedAt: query.data?.generatedAt ?? null,
    basedOnExams: query.data?.basedOnExams ?? null,
    loading: !!userId && query.isPending,
    generating,
    failed,
    regenerate,
    refetch: refetchCached,
  };
}
