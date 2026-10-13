import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient, queryKeys } from "@/lib/query";
import { useAuth } from "./useAuth";
import { Exam } from "@/lib/types";
import { scoreBiomarkers, BiomarkerRow, BiomarkerWithScoring } from "@/lib/scoring";

export type { BiomarkerWithScoring };

interface HealthData {
  exams: Exam[];
  rows: BiomarkerRow[];
}

const PAGE_SIZE = 1000;

// O PostgREST devolve no máximo 1000 linhas por pedido: sem paginar, um
// histórico longo ficava truncado (e de forma diferente na app e no servidor).
async function fetchConfirmedBiomarkers(userId: string) {
  const all = [];
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

async function fetchHealthData(userId: string): Promise<HealthData> {
  const [examsRes, markers] = await Promise.all([
    supabase
      .from("exams")
      .select("*")
      .eq("profile_id", userId)
      .order("exam_date", { ascending: false }),
    fetchConfirmedBiomarkers(userId),
  ]);
  if (examsRes.error) throw examsRes.error;

  const exams: Exam[] = examsRes.data ?? [];
  const dateByExam = new Map(exams.map((e) => [e.id, e.exam_date]));
  const rows: BiomarkerRow[] = [];
  for (const m of markers) {
    const examDate = dateByExam.get(m.exam_id);
    if (!examDate) continue;
    rows.push({ ...m, exam_date: examDate });
  }
  return { exams, rows };
}

/** Identifica o conjunto de exames com valores confirmados (ordem irrelevante). */
export function examSignature(examIds: (string | null | undefined)[]): string {
  return [...new Set(examIds.filter((id): id is string => !!id))].sort().join(",");
}

/** Assinatura dos dados em cache, para quem gera conteúdo a partir deles. */
export function cachedExamSignature(userId: string): string | null {
  const data = queryClient.getQueryData<HealthData>(queryKeys.healthData(userId));
  return data ? examSignature(data.rows.map((r) => r.exam_id)) : null;
}

/** A chamar depois de criar, editar ou apagar exames/valores. */
export function invalidateHealthData(userId: string | undefined) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.healthData(userId) });
}

const EMPTY_EXAMS: Exam[] = [];
const EMPTY_ROWS: BiomarkerRow[] = [];

export function useBiomarkers(hasFamilyHistory: boolean = false) {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: queryKeys.healthData(userId),
    queryFn: () => fetchHealthData(userId!),
    enabled: !!userId,
  });

  const rows = query.data?.rows ?? EMPTY_ROWS;
  const biomarkers = useMemo(
    () => scoreBiomarkers(rows, hasFamilyHistory),
    [rows, hasFamilyHistory]
  );
  const dataSignature = useMemo(() => examSignature(rows.map((r) => r.exam_id)), [rows]);

  const { refetch } = query;
  const fetchBiomarkers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    biomarkers,
    dataSignature,
    exams: query.data?.exams ?? EMPTY_EXAMS,
    loading: !!userId && query.isPending,
    refetch: fetchBiomarkers,
  };
}
